import { setGlobalOptions, https } from 'firebase-functions/v2';
import { Logger } from '@firebase/logger';
import * as admin from 'firebase-admin';
import HttpHandler from './handler/http/HttpHandler';

require('dotenv').config();
admin.initializeApp();

const logger = new Logger('Root');
logger.setLogLevel('debug');

const serviceAccount = process.env.SERVICE_ACCOUNT;
const WORKSPACE = process.env.WORKSPACE;
const region = 'europe-west1';

setGlobalOptions({
    region,
    serviceAccount,
    minInstances: 0,
    maxInstances: 1,
    timeoutSeconds: 30,
    memory: '256MiB',
    ingressSettings: 'ALLOW_ALL',
    secrets: [`${WORKSPACE}-blackpaw`],
});

/************
 * Handlers *
 ************
 */
const GlobalHttpHandler = new HttpHandler();

/*********
 * HTTPS *
 *********
 */
export const index = https.onRequest(
    GlobalHttpHandler.handleRequest.bind(GlobalHttpHandler)
);