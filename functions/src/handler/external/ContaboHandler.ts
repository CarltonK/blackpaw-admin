import { Logger } from '@firebase/logger';

export default class ContaboHandler {
  private logger: Logger = new Logger('ContaboHandler');

  constructor() {
    this.logger.setLogLevel('debug');
  }

  async start(instanceId: string): Promise<void> {
    this.logger.log(`[Contabo] Starting instance: ${instanceId}`);
    return;
  }

  async stop(instanceId: string): Promise<void> {
    this.logger.log(`[Contabo] Stopping instance: ${instanceId}`);
    return;
  }
}