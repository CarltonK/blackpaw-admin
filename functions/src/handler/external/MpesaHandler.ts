import axios from 'axios';
import { Logger } from '@firebase/logger';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import SecretsHelper from '../../helpers/secret_manager';
import ContaboHandler from './ContaboHandler';

interface PaymentData {
    clientId: string;
}

type MpesaTransaction = {
    trxPhoneNumber?: string;
    trxAmount?: string;
    trxMpesaReceiptNumber?: string;
    trxDate?: string;
    trxID?: string;
};


export default class MpesaHandler {
    private logger: Logger = new Logger('[MpesaHandler]');
    private secretsHelper: SecretsHelper;

    private accessToken: string | null = null;
    private tokenExpiresAt!: number;

    private db: Firestore;
    private secretsLoaded = false;

    private consumerKey!: string;
    private consumerSecret!: string;
    private shortcode!: string;
    private passkey!: string;
    private callbackUrl!: string;
    private baseUrl!: string;

    private contaboHandler: ContaboHandler;

    constructor(db: Firestore, secretsHelper: SecretsHelper) {
        this.logger.setLogLevel('debug');
        this.db = db;
        this.secretsHelper = secretsHelper;
        this.contaboHandler = new ContaboHandler(this.secretsHelper);
    }

    async initiatePayment(data: PaymentData): Promise<{ success: boolean; message: string; details?: any }> {
        let reference: string | null = null;
        try {
            // Fetch client
            const clientDocRef = this.db.collection('clients').doc(data.clientId);

            if (!clientDocRef) {
                return { success: false, message: 'Client not found' };
            }

            const clientDoc = await clientDocRef.get();
            const clientDocData: any = clientDoc.data();
            const { payment: { amount, phone } } = clientDocData;

            // Format phone number (remove leading 0 or +254)
            let formattedPhone = phone;
            if (phone.startsWith('0')) {
                formattedPhone = `254${phone.slice(1)}`;
            } else if (phone.startsWith('+254')) {
                formattedPhone = phone.slice(1);
            }

            reference = (await this.db.collection('payments').add({
                clientId: data.clientId,
                status: 'initiating',
                amount,
                paymentDate: Timestamp.fromMillis(Date.now()),
            })).id;

            await this.loadSecrets();

            const accessTokenResponse = await this.getAccessToken();
            if (!accessTokenResponse.success) {
                this.logger.error('Failed to get access token', accessTokenResponse.error);
                if (reference) {
                    await this.db.collection('payments').doc(reference).update({ status: 'failed' });
                }
                return {
                    success: false,
                    message: 'Failed to get M-Pesa access token',
                    details: accessTokenResponse.error,
                };
            }

            const accessToken = accessTokenResponse.token;
            const timestamp = this.getTimestamp();
            const password = Buffer.from(
                `${this.shortcode}${this.passkey}${timestamp}`
            ).toString('base64');

            const payload = {
                BusinessShortCode: Number(this.shortcode),
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: Number(formattedPhone),
                PartyB: Number(this.shortcode),
                PhoneNumber: Number(formattedPhone),
                CallBackURL: this.callbackUrl + `/${reference}`,
                AccountReference: `${reference}`,
                TransactionDesc: `${reference}`,
            };

            const res = await axios.post(
                `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }
            );

            await this.db.collection('payments').doc(reference).update({
                status: 'initiated',
            });

            this.logger.debug('STK Push response:', res.data);
            return {
                success: true,
                message: 'STK push initiated successfully',
                details: res.data,
            };
        } catch (err: any) {
            const errorMsg = err?.response?.data || err.message || 'Unknown error';
            this.logger.error('STK Push failed:', errorMsg);
            if (reference) {
                await this.db.collection('payments').doc(reference).update({ status: 'failed' });
            }
            return {
                success: false,
                message: 'M-Pesa STK Push failed',
                details: errorMsg,
            };
        }
    }

    async handleMpesaCallback(reference: string, stkCallback: any): Promise<any> {
        const paymentRef = this.db.collection('payments').doc(reference);
        try {
            const paymentDoc = await paymentRef.get();
            let transaction: Record<string, any> | undefined = undefined;

            const { CallbackMetadata, ResultCode, CheckoutRequestID } = stkCallback;
            if (Number(ResultCode) === 0) {
                const { Item } = CallbackMetadata;

                const getValue = (name: string): string | undefined => {
                    return Item.find((o: any) => o.Name === name)?.Value?.toString();
                }

                const trxPhoneNumber = getValue('PhoneNumber');
                const trxAmount = getValue('Amount');
                const trxMpesaReceiptNumber = getValue('MpesaReceiptNumber');
                const trxDate = getValue('TransactionDate');
                const trxID = CheckoutRequestID;

                transaction = {
                    trxPhoneNumber,
                    trxAmount,
                    trxMpesaReceiptNumber,
                    trxDate,
                    trxID,
                } as MpesaTransaction;

                // Update the payment document in Firestore
                const update: any = {
                    status: 'success',
                    updatedAt: new Date(),
                    transaction,
                };
                await paymentRef.set(update, { merge: true });

                this.logger.log(`Successfully processed M-Pesa payment for reference: ${reference}`);

                const amountPaid = parseFloat(trxAmount ?? '0');

                // === Follow-up on Client if Exists ===
                if (paymentDoc.exists) {
                    const paymentData = paymentDoc.data()!;
                    const clientId = paymentData.clientId;

                    if (clientId) {
                        const clientDoc = await this.db.collection('clients').doc(clientId).get();

                        if (clientDoc.exists) {
                            const {
                                status,
                                payment: { amount: amountDue },
                                contabo: { vmId },
                            } = clientDoc.data() as {
                                status: string;
                                payment: { amount: number };
                                name: string;
                                contabo: { vmId: string };
                            };

                            if (status === 'suspended') {
                                if (amountPaid >= amountDue) {
                                    this.logger.log(`Amount paid (${amountPaid}) covers due (${amountDue}), resuming VM`);
                                    await clientDoc.ref.update({
                                        nextBillingDate: Timestamp.fromMillis(Date.now() + 31 * 24 * 60 * 60 * 1000),
                                    });
                                    await this.contaboHandler.performInstanceAction(vmId, 'start');
                                }

                                if (amountPaid > amountDue) {
                                    const overpayment = amountPaid - amountDue;
                                    await this.db.collection('overpayments').add({
                                        clientId,
                                        reference,
                                        amountPaid,
                                        amountDue,
                                        overpayment,
                                        recordedAt: new Date(),
                                    });

                                    this.logger.log(`Logged overpayment of ${overpayment} for client ${clientId}`);
                                }
                            }

                            if (status === 'active') {
                                await clientDoc.ref.update({
                                    nextBillingDate: Timestamp.fromMillis(Date.now() + 31 * 24 * 60 * 60 * 1000),
                                });
                            }
                        }
                    }
                }
                return;
            } else {
                const failData = {
                    status: 'failed',
                    updatedAt: new Date(),
                    failureReason: stkCallback?.ResultDesc || 'Unknown reason',
                    rawCallback: stkCallback,
                };
                await paymentRef.set(failData, { merge: true });
                return;
            }
        } catch (error: any) {
            const status = error?.response?.status;
            const statusText = error?.response?.statusText;
            const body = error?.response?.data || 'No response body'
            this.logger.error('Access token request failed', {
                status,
                statusText,
                body,
            });
            const data = {
                status: 'failed',
                updatedAt: new Date(),
            }

            await paymentRef.set(data, { merge: true });

            return;
        } finally {
            await this.db.collection('mpesa_callbacks').add({
                reference,
                receivedAt: new Date(),
                payload: stkCallback,
            });
        }
    }

    private async loadSecrets() {
        if (this.secretsLoaded) return;

        const secrets = await this.secretsHelper.getSecret('mpesa');

        this.consumerKey = secrets.consumer_key;
        this.consumerSecret = secrets.consumer_secret;
        this.shortcode = secrets.shortcode;
        this.passkey = secrets.passkey;
        this.callbackUrl = secrets.callback_url;
        this.baseUrl = secrets.base_url;

        this.secretsLoaded = true;
        this.logger.debug('M-Pesa secrets loaded');
    }

    private async getAccessToken(): Promise<{ success: true; token: string } | { success: false; error: any }> {
        const now = Date.now();

        if (this.accessToken && now < this.tokenExpiresAt - 60 * 1000) {
            this.logger.debug('Using cached access token');
            return { success: true, token: this.accessToken };
        }

        if (!this.consumerKey || !this.consumerSecret) {
            this.logger.error('Missing consumerKey or consumerSecret');
            return { success: false, error: 'Missing consumer credentials' };
        }

        try {
            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

            this.logger.debug('Requesting new access token');

            const res = await axios({
                method: 'get',
                url: `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`,
                headers: { Authorization: `Basic ${auth}` },
            });

            const token = res.data.access_token;
            const expiresIn = res.data.expires_in || 3599;

            this.accessToken = token;
            this.tokenExpiresAt = now + expiresIn * 1000;

            this.logger.debug('Access token received');
            return { success: true, token };
        } catch (error: any) {
            const status = error?.response?.status;
            const statusText = error?.response?.statusText;
            const body = error?.response?.data || 'No response body'
            this.logger.error('Access token request failed', {
                status,
                statusText,
                body,
            });
            return {
                success: false,
                error: {
                    status,
                    statusText,
                    message: body,
                },
            };
        }
    }

    private getTimestamp(): string {
        return new Date()
            .toISOString()
            .replace(/[^0-9]/g, "")
            .slice(0, -3);;
    }
}
