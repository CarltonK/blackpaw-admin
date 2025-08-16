import { Logger } from '@firebase/logger';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import SecretsHelper from '../../helpers/secrets_helper';
import GcsHelper from '../../helpers/storage_helper';

export default class ContaboHandler {
  private token: string | null = null;
  private tokenExpiresAt: number = 0;
  private logger: Logger = new Logger('[ContaboHandler]');
  private secretsHelper: SecretsHelper;
  private gcsHelper: GcsHelper;

  private secretsLoaded: boolean = false;
  private clientId!: string;
  private clientSecret!: string;
  private apiUser!: string;
  private apiPassword!: string;
  private sshKeyIds!: number[];

  private readonly AUTH_URL = 'https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token';
  private readonly BASE_COMPUTE_URL = 'https://api.contabo.com/v1/compute/instances';

  constructor(secretsHelper: SecretsHelper) {
    this.logger.setLogLevel('debug');
    this.secretsHelper = secretsHelper;
    this.gcsHelper = new GcsHelper();
  }

  private async loadSecrets() {
    if (this.secretsLoaded) return;

    if (!this.clientId) {
      const secrets = await this.secretsHelper.getSecret('contabo');
      this.clientId = secrets.client_id;
      this.clientSecret = secrets.client_secret;
      this.apiUser = secrets.api_user;
      this.apiPassword = secrets.api_password;

      if (Array.isArray(secrets.ssh_key_ids)) {
        this.sshKeyIds = secrets.ssh_key_ids;
      } else {
        this.logger.log(`Setting default SSH Key Ids`);
        this.sshKeyIds = [];
      }

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

  async createInstance(options: {
    displayName: string;
  }): Promise<any> {
    await this.authenticate();

    // ID for Debian 12, retrieved from the GET /v1/compute/images endpoint.
    const debian12ImageId = '01592388-a3f5-470a-8692-747d73a4ab54';

    const cloudInitScript = await this.gcsHelper.getScript('scripts', 'init.sh');
    // Per Contabo API docs, the cloud-init script must be Base64 encoded.
    const encodedCloudInit = Buffer.from(cloudInitScript).toString('base64');

    const requestBody = {
      displayName: options.displayName,
      imageId: debian12ImageId,
      productId: 'V92',
      region: 'EU',
      cloudInit: encodedCloudInit,
      sshIds: this.sshKeyIds,
    };

    this.logger.log(`Sending 'create instance' request with name: ${options.displayName}`);

    try {
      const response = await axios.post(this.BASE_COMPUTE_URL, requestBody, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'x-request-id': this.generateUUID(),
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Instance creation for ${options.displayName} successful. Response:`, response.data);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to create instance ${options.displayName}:`, error?.response?.data || error.message);
      throw error;
    }
  }

  async performInstanceAction(instanceId: string, action: 'start' | 'stop'): Promise<void> {
    await this.authenticate();

    const url = `${this.BASE_COMPUTE_URL}/${instanceId}/actions/${action}`;
    this.logger.log(`Sending '${action}' request for instance: ${instanceId}`);

    try {
      const response = await axios.post(url, {}, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'x-request-id': this.generateUUID(),
        },
      });

      this.logger.log(`${action} instance ${instanceId} successful. Response:`, response.data);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message;

      // Graceful handling if the instance is already in desired state
      if (errorMsg?.includes('Instance is already stopped') && action === 'stop') {
        this.logger.log(`Instance ${instanceId} is already stopped. No action needed.`);
        return;
      }

      if (errorMsg?.includes('Instance is already running') && action === 'start') {
        this.logger.log(`Instance ${instanceId} is already running. No action needed.`);
        return;
      }

      // Log and rethrow other errors
      this.logger.error(`Failed to ${action} instance ${instanceId}:`, error?.response?.data || error.message);
      return;
    }
  }
}