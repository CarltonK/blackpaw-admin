import { Logger } from '@firebase/logger';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import SecretsHelper from '../../helpers/secret_manager';

export default class ContaboHandler {
  private token: string | null = null;
  private tokenExpiresAt: number = 0;
  private logger: Logger = new Logger('[ContaboHandler]');
  private secretsHelper: SecretsHelper;

  private secretsLoaded: boolean = false;
  private clientId!: string;
  private clientSecret!: string;
  private apiUser!: string;
  private apiPassword!: string;

  private readonly AUTH_URL = 'https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token';
  private readonly BASE_COMPUTE_URL = 'https://api.contabo.com/v1/compute/instances';

  constructor(secretsHelper: SecretsHelper) {
    this.logger.setLogLevel('debug');
    this.secretsHelper = secretsHelper;
  }

  private async loadSecrets() {
    if (this.secretsLoaded) return;

    if (!this.clientId) {
      const secrets = await this.secretsHelper.getSecret('contabo');
      this.clientId = secrets.client_id;
      this.clientSecret = secrets.client_secret;
      this.apiUser = secrets.api_user;
      this.apiPassword = secrets.api_password;

      this.secretsLoaded = true;
    }
  }

  private generateUUID(): string {
    return uuidv4();
  }

  private async authenticate(): Promise<void> {
    await this.loadSecrets();

    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt - 60 * 1000) return; // reuse if still valid

    const response = await axios.post(this.AUTH_URL, new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'password',
      username: this.apiUser,
      password: this.apiPassword,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.token = response.data.access_token;
    this.tokenExpiresAt = now + response.data.expires_in * 1000;
  }

  async performInstanceAction(instanceId: string, action: 'start' | 'stop'): Promise<void> {
    await this.authenticate();

    const url = `${this.BASE_COMPUTE_URL}/${instanceId}/actions/${action}`;
    this.logger.log(`[Contabo] Sending '${action}' request for instance: ${instanceId}`);

    try {
      const response = await axios.post(url, {}, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'x-request-id': this.generateUUID(),
        },
      });

      this.logger.log(`[Contabo] ${action} instance ${instanceId} successful. Response:`, response.data);
    } catch (error: any) {
      this.logger.error(`[Contabo] Failed to ${action} instance ${instanceId}:`, error?.response?.data || error.message);
      throw new Error(`Failed to ${action} VM via Contabo API`);
    }
  }
}