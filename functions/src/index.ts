import { setGlobalOptions, scheduler } from 'firebase-functions/v2';
// import { setGlobalOptions, https, scheduler } from 'firebase-functions/v2';
import { Logger } from '@firebase/logger';
import * as admin from 'firebase-admin';
// import HttpHandler from './handler/http/HttpHandler';
import CronHandler from './handler/cron/CronHandler';
import ContaboHandler from './handler/external/ContaboHandler';

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
    secrets: [`contabo`],
});

/************
 * Handlers *
 ************
 */
// const GlobalHttpHandler = new HttpHandler();
const GlobalContaboHandler = new ContaboHandler();
const GlobalCronHandler = new CronHandler(
    admin.firestore(),
    GlobalContaboHandler,
);

/*********
 * HTTPS *
 *********
 */
// export const index = https.onRequest(
//     GlobalHttpHandler.handleRequest.bind(GlobalHttpHandler)
// );

export const nightlyReconciliation = scheduler.onSchedule(
    '* * * * *',
    GlobalCronHandler.nightlyReconciliation.bind(GlobalCronHandler),
);