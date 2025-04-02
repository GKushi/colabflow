import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { InvalidConfigurationException } from '../common/exceptions';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileStorageException } from './exceptions';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const awsRegion = this.configService.get('AWS_REGION');
    const awsAccessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    const bucketName = this.configService.get('AWS_BUCKET_NAME');

    if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey || !bucketName)
      throw new InvalidConfigurationException();

    this.bucketName = bucketName;

    this.s3 = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });
  }

  async getFileUrl(fileName: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
    });

    try {
      return await getSignedUrl(this.s3, command, { expiresIn: 300 });
    } catch {
      throw new FileStorageException('get');
    }
  }

  async uploadFile(file: Express.Multer.File) {
    const fileName = this.generateFileName();

    const command = new PutObjectCommand({
      Key: fileName,
      Bucket: this.bucketName,
      ContentType: file.mimetype,
      Body: file.buffer,
    });

    try {
      await this.s3.send(command);

      return fileName;
    } catch {
      throw new FileStorageException('upload');
    }
  }

  async deleteFile(fileName: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
    });

    try {
      return await this.s3.send(command);
    } catch {
      throw new FileStorageException('delete');
    }
  }

  private generateFileName() {
    return crypto.randomUUID() as string;
  }
}
