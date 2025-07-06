import axios from 'axios';
import { Logger } from '@firebase/logger';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import SecretsHelper from '../../helpers/secret_manager';

interface PaymentData {
    clientId: string;
}

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

    constructor(db: Firestore, secretsHelper: SecretsHelper) {
        this.logger.setLogLevel('debug');
        this.db = db;
        this.secretsHelper = secretsHelper;
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
                CallBackURL: `https://google.com${this.callbackUrl}`,
                AccountReference: reference,
                TransactionDesc: 'Payment request',
            };

            const res = await axios.post(
                `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
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

    async handleMpesaCallback(callbackData: any): Promise<any> {
        try {
            const {
                Body: {
                    stkCallback: {
                        MerchantRequestID,
                        CheckoutRequestID,
                        ResultCode,
                        ResultDesc,
                        CallbackMetadata,
                    },
                },
            } = callbackData;

            const phone = CallbackMetadata?.Item?.find((i: any) => i.Name === 'PhoneNumber')?.Value;
            const amount = CallbackMetadata?.Item?.find((i: any) => i.Name === 'Amount')?.Value;
            const mpesaReceipt = CallbackMetadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;

            this.logger.debug(`STK Callback for CheckoutRequestID: ${CheckoutRequestID}`);

            // Update the payment document in Firestore
            const paymentRef = this.db.collection('payments').doc(MerchantRequestID);
            const update: any = {
                status: ResultCode === 0 ? 'success' : 'failed',
                updatedAt: new Date(),
                resultCode: ResultCode,
                resultDesc: ResultDesc,
                phone,
                amount,
                mpesaReceipt,
            };

            await paymentRef.set(update, { merge: true });

            return update;
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
        this.logger.debug('M-Pesa secrets loaded', secrets);
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
            this.logger.debug('Using Basic auth prefix:', auth.slice(0, 10) + '...');

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
