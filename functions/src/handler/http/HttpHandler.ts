import { Request, Response } from 'firebase-functions/v1';
import { Logger } from '@firebase/logger';

export default class HttpHandler {
    private logger: Logger = new Logger('HttpHandler');
    constructor() {
        this.logger.setLogLevel('debug');
    }

    async handleRequest(request: Request, response: Response<any>): Promise<void> {
        this.logger.log(request.path, request.method);
        const { method, path } = request;

        // if (process.env.NODE_ENV === 'local') {
        if (method === 'POST' && path === '/cloudevents') {}
        // }

        // return 405 METHOD NOT ALLOWED
        if (method !== 'POST') {
            response.status(405).send({
                status: false,
                detail: `${method.toUpperCase()} not allowed`,
            });
            return;
        }

        // return 404 NOT FOUND
        response.status(404).send({ status: false, detail: 'The resource you requested is not available' });
        return;
    }
}