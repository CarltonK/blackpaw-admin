import { Request, Response } from 'firebase-functions/v1';
import { Logger } from '@firebase/logger';
import SecretsHelper from '../../helpers/secret_manager';
import MpesaHandler from '../external/MpesaHandler';
import { Firestore } from 'firebase-admin/firestore';

export default class HttpHandler {
    private db: Firestore;
    private secretsHelper: SecretsHelper;
    private logger: Logger = new Logger('[HttpHandler]');

    constructor(db: Firestore, secretsHelper: SecretsHelper) {
        this.logger.setLogLevel('debug');
        this.secretsHelper = secretsHelper;
        this.db = db;
    }

    async handleRequest(request: Request, response: Response<any>): Promise<void> {
        this.logger.log(request.path, request.method);
        const { method, path } = request;

        // if (process.env.NODE_ENV === 'local') {
        //     if (method === 'POST' && path === '/cloudevents') { }
        //     if (method === 'POST' && path === '/cron') { }
        // }

        // return 405 METHOD NOT ALLOWED
        if (method !== 'POST') {
            response.status(405).send({
                status: false,
                detail: `${method.toUpperCase()} not allowed`,
            });
            return;
        }

        // Mpesa
        if (path.startsWith('/mpesa/')) {
            const mpesa = new MpesaHandler(this.db, this.secretsHelper);

            switch (path) {
                case '/mpesa/initiate': {
                    const { clientId } = request.body || {};

                    if (typeof clientId !== 'string' || !clientId.trim()) {
                        response.status(400).send({
                            status: false,
                            message: 'Invalid request payload. Expecting { clientId: string }',
                        });
                        return;
                    }

                    this.logger.debug('Initiating M-Pesa STK Push for:', clientId);
                    const result = await mpesa.initiatePayment({ clientId });

                    response.status(result.success ? 200 : 400).send({
                        status: result.success,
                        message: result.message,
                        details: result.details,
                    });
                    return;
                }

                case '/mpesa/callback': {
                    this.logger.debug('Received M-Pesa callback:', request.body);

                    const result = await mpesa.handleMpesaCallback(request.body);

                    response.status(200).send({
                        status: true,
                        message: 'Callback received',
                        result,
                    });
                    return;
                }

                default: {
                    response.status(404).send({
                        status: false,
                        message: 'M-Pesa route not found',
                    });
                    return;
                }
            }
        }

        // return 404 NOT FOUND
        response.status(404).send({ status: false, detail: 'The resource you requested is not available' });
        return;
    }
}