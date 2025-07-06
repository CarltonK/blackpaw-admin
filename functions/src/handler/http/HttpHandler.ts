import { Request, Response } from 'firebase-functions/v1';
import { Logger } from '@firebase/logger';
import SecretsHelper from '../../helpers/secret_manager';
import MpesaHandler from '../external/MpesaHandler';
import { Firestore } from 'firebase-admin/firestore';

export default class HttpHandler {
    private db: Firestore;
    private secretsHelper: SecretsHelper;
    private logger: Logger = new Logger('[HttpHandler]');
    private mpesa: MpesaHandler;

    constructor(db: Firestore, secretsHelper: SecretsHelper) {
        this.logger.setLogLevel('debug');
        this.secretsHelper = secretsHelper;
        this.db = db;
        this.mpesa = new MpesaHandler(this.db, this.secretsHelper);
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
                    const result = await this.mpesa.initiatePayment({ clientId });

                    response.status(result.success ? 200 : 400).send({
                        status: result.success,
                        message: result.message,
                        details: result.details,
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

    async handleCallbackRequest(request: Request,response: Response<any>) {
        if (request.method.toUpperCase() !== 'POST') {
            this.logger.log('Access denied. Only POST method allowed');
            response.status(200).send({ success: true });
            return;
        }

        let path: string | undefined = request.path;
        path = path ? path.split('/')[1] : undefined;
        this.logger.log(`Processing payment with reference #${path}`);
        try {
            const { Body } = request.body;
            if (!Body) {
                this.logger.log('Invalid');
                response.status(200).send({ success: true });
                return;
            }

            const { stkCallback } = Body;
            if (!stkCallback) {
                this.logger.warn('Invalid M-Pesa callback payload');
                response.status(200).send({ success: true });
                return;
            }

            if (path) {
                await this.mpesa.handleMpesaCallback(path, stkCallback);
            }

            response.status(200).send({ success: true });
            return;
        } catch (error) {
            this.logger.error('Error handling M-Pesa callback:', error);
        }

        // Terminate request
        response.status(200).send({ success: true });
    }
}