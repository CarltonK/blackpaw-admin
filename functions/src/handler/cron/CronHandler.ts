import { Logger } from '@firebase/logger';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import ContaboHandler from '../external/ContaboHandler';

export default class CronHandler {
    private logger: Logger = new Logger('CronHandler');
    private db: Firestore;
    private contabo: ContaboHandler;

    constructor(db: Firestore, contabo: ContaboHandler) {
        this.logger.setLogLevel('debug');
        this.db = db;
        this.contabo = contabo;
    }

    private getDateDiffInDays(from: Timestamp | Date, to: Date): number {
        const billingDate = from instanceof Timestamp ? from.toDate() : from;
        const timeDiff = to.getTime() - billingDate.getTime();
        return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    }

    async nightlyReconciliation(): Promise<void> {
        const today = new Date();
        const snapshot = await this.db.collection('clients').get();

        for (const doc of snapshot.docs) {
            const { name, status, contabo, nextBillingDate } = doc.data();
            const { vmId } = contabo;
            this.logger.log(`Checking payment status for ${name}`);

            if (!nextBillingDate) {
                this.logger.log(`❌ Exiting: Next billing date not set`);
                continue;
            }

            const daysDiff = this.getDateDiffInDays(nextBillingDate, today);

            if (daysDiff === -3) {
                const msg = '📅 Reminder: Your payment is due in 3 days.';
                this.logger.log(msg);
                // await sendReminder(client, msg);
            } else if (daysDiff === 0) {
                const msg = '📅 Reminder: Your payment is due today.';
                this.logger.log(msg);
                // await sendReminder(client, msg);
            } else if (daysDiff === 2) {
                const msg = '⚠️ Final Reminder: Your payment is 2 days overdue.';
                this.logger.log(msg);
                // await sendReminder(client, msg);
            } else if (daysDiff >= 2 && status === 'active') {
                const msg = '❌ Your service has been suspended due to non-payment.';

                // Stop VM
                await this.contabo.performInstanceAction(vmId, 'stop');

                // Update document
                await doc.ref.update({ status: 'suspended' });

                this.logger.log(msg);
                // await sendReminder(client, msg);
            }

            this.logger.log(`Finalized checking payment status for ${name}`);
        }
        return;
    }
}