import { Logger } from '@firebase/logger';
import { Storage } from '@google-cloud/storage';

export default class GcsHelper {
  private logger: Logger = new Logger('[GcsHelper]');
  private _client: Storage;

  constructor() {
    this.logger.setLogLevel('debug');
    this._client = new Storage();
  }

  async getScript(bucketName: string, fileName: string): Promise<string> {
    try {
      const [fileContents] = await this._client
        .bucket(bucketName)
        .file(fileName)
        .download();

      const scriptContent = fileContents.toString('utf8');
      this.logger.debug(`Successfully fetched script: gs://${bucketName}/${fileName}`);
      return scriptContent;
    } catch (error) {
      this.logger.error(`Failed to fetch script from GCS: gs://${bucketName}/${fileName}`, error);
      throw error;
    }
  }
}