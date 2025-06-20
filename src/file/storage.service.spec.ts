import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { InvalidConfigurationException } from '../common/exceptions';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Test, TestingModule } from '@nestjs/testing';
import { FileStorageException } from './exceptions';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;
  let s3Instance: { send: jest.Mock };

  const bucketName = 'my-bucket';
  const region = 'us-east-1';
  const accessKeyId = 'AKIA';
  const secretAccessKey = 'SECRET';

  beforeEach(async () => {
    jest.clearAllMocks();

    const values: Record<string, any> = {
      AWS_REGION: region,
      AWS_ACCESS_KEY_ID: accessKeyId,
      AWS_SECRET_ACCESS_KEY: secretAccessKey,
      AWS_BUCKET_NAME: bucketName,
    };
    configService = { get: jest.fn((key: string) => values[key]) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    s3Instance = (service as any).s3;
  });

  describe('constructor', () => {
    it('throws when required config missing', () => {
      const badConfig = { get: () => undefined } as any;
      expect(() => new StorageService(badConfig)).toThrow(
        InvalidConfigurationException,
      );
    });

    it('initializes S3 client and bucketName', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      expect((service as any).bucketName).toBe(bucketName);
    });
  });

  describe('getFileUrl', () => {
    const fileName = 'file.txt';

    it('returns signed URL on success', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('signed-url');
      const url = await service.getFileUrl(fileName);
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: bucketName,
        Key: fileName,
      });
      expect(getSignedUrl).toHaveBeenCalledWith(
        s3Instance,
        expect.any(GetObjectCommand),
        { expiresIn: 300 },
      );
      expect(url).toBe('signed-url');
    });

    it('throws FileStorageException on error', async () => {
      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('fail'));
      await expect(service.getFileUrl(fileName)).rejects.toThrow(
        FileStorageException,
      );
    });
  });

  describe('uploadFile', () => {
    const fakeFile = { mimetype: 'text/plain', buffer: Buffer.from('hi') };

    it('uploads and returns generated filename', async () => {
      jest.spyOn(service as any, 'generateFileName').mockReturnValue('uuid');
      s3Instance.send.mockResolvedValue({});

      const name = await service.uploadFile(fakeFile as any);
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Key: 'uuid',
        Bucket: bucketName,
        ContentType: fakeFile.mimetype,
        Body: fakeFile.buffer,
      });
      expect(s3Instance.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand),
      );
      expect(name).toBe('uuid');
    });

    it('throws FileStorageException on error', async () => {
      s3Instance.send.mockRejectedValue(new Error('oops'));
      await expect(
        service.uploadFile({ mimetype: '', buffer: Buffer.alloc(0) } as any),
      ).rejects.toThrow(FileStorageException);
    });
  });

  describe('deleteFile', () => {
    const fileName = 'del.txt';

    it('deletes object and returns result', async () => {
      const resp = { $metadata: {} };
      s3Instance.send.mockResolvedValue(resp);

      const result = await service.deleteFile(fileName);
      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: bucketName,
        Key: fileName,
      });
      expect(s3Instance.send).toHaveBeenCalledWith(
        expect.any(DeleteObjectCommand),
      );
      expect(result).toBe(resp);
    });

    it('throws FileStorageException on error', async () => {
      s3Instance.send.mockRejectedValue(new Error('err'));
      await expect(service.deleteFile(fileName)).rejects.toThrow(
        FileStorageException,
      );
    });
  });
});
