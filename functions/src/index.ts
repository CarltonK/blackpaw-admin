import { setGlobalOptions, https, scheduler } from 'firebase-functions/v2';
import { Logger } from '@firebase/logger';
import * as admin from 'firebase-admin';
import HttpHandler from './handler/http/HttpHandler';
import CronHandler from './handler/cron/CronHandler';
import ContaboHandler from './handler/external/ContaboHandler';
import SecretsHelper from './helpers/secrets_helper';

require('dotenv').config();
admin.initializeApp();

const logger = new Logger('Root');
logger.setLogLevel('debug');

const serviceAccount = process.env.SERVICE_ACCOUNT;
const region = 'europe-west1';

setGlobalOptions({
    region,
    serviceAccount,
    minInstances: 0,
    maxInstances: 1,
    timeoutSeconds: 300,
    memory: '512MiB',
    ingressSettings: 'ALLOW_ALL',
    secrets: ['contabo', 'mpesa'],
});

/************
 * Handlers *
 ************
 */
const GlobalSecretsHelper = new SecretsHelper();
const GlobalHttpHandler = new HttpHandler(admin.firestore(), GlobalSecretsHelper);
const GlobalContaboHandler = new ContaboHandler(GlobalSecretsHelper);
const GlobalCronHandler = new CronHandler(
    admin.firestore(),
    GlobalContaboHandler,
);

/*********
 * HTTPS *
 *********
 */
export const api = https.onRequest(GlobalHttpHandler.handleRequest.bind(GlobalHttpHandler));

export const mpesaCallback = https.onRequest(GlobalHttpHandler.handleCallbackRequest.bind(GlobalHttpHandler));

/**********
 * PUBSUB *
 **********
 */
export const nightlyReconciliation = scheduler.onSchedule(
    '0 2 * * *',
    GlobalCronHandler.nightlyReconciliation.bind(GlobalCronHandler),
);