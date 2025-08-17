import { Logger } from '@firebase/logger';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export default class SecretsHelper {
    private logger: Logger = new Logger('[SecretsHelper]');
    private _client: SecretManagerServiceClient;
    secrets: Record<string, any> = {};

    constructor() {
        this.logger.setLogLevel('debug');
        this._client = new SecretManagerServiceClient();
    }

    async getSecret(name: string, sub?: string): Promise<any> {
        const path: string = `projects/${process.env.PROJECT_NUMBER}/secrets/${name}/versions/latest`;
        const [version] = await this._client.accessSecretVersion({ name: path });

        const payload = version.payload?.data
            ? JSON.parse(version.payload?.data?.toString())
            : null;
        this.secrets = sub ? payload[sub] : payload;
        this.logger.debug('Google Secret Manager Initialized');
        return this.secrets;
    }
}