import { ResourceNotFoundException } from '../common/exceptions';
import { ProjectService } from '../project/project.service';
import { CommentService } from '../comment/comment.service';
import { FileLimitExceededException } from './exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, File, User } from '@prisma/client';
import { TaskService } from '../task/task.service';
import { UserInSession } from '../auth/interfaces';
import { StorageService } from './storage.service';
import { FileService } from './file.service';

describe('FileService', () => {
  let service: FileService;

  const fileDelegateMock = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  const prismaMock: Partial<PrismaService> = {
    file: fileDelegateMock as any,
  };

  const projectServiceMock = {
    checkReadAccess: jest.fn(),
    checkModifyAccess: jest.fn(),
  };
  const taskServiceMock = {
    checkReadAccess: jest.fn(),
    checkModifyAccess: jest.fn(),
  };
  const commentServiceMock = {
    checkReadAccess: jest.fn(),
    checkModifyAccess: jest.fn(),
  };
  const storageServiceMock = {
    getFileUrl: jest.fn(),
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: CommentService, useValue: commentServiceMock },
        { provide: StorageService, useValue: storageServiceMock },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  describe('checkReadAccess', () => {
    it('fetches file and delegates to correct service', async () => {
      const file = {
        id: 1,
        fileableId: 10,
        fileableType: 'Project',
        fileName: 'f',
        createdBy: {},
      } as File & { createdBy: User };
      fileDelegateMock.findUnique.mockResolvedValue(file);
      storageServiceMock.getFileUrl.mockResolvedValue('url');
      const user = { id: 2, role: 'ADMIN' } as UserInSession;

      await service.checkReadAccess(user, 1);
      expect(projectServiceMock.checkReadAccess).toHaveBeenCalledWith(user, 10);
    });

    it('throws if file not found', async () => {
      fileDelegateMock.findUnique.mockResolvedValue(null);
      await expect(service.checkReadAccess({} as any, 5)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('checkModifyAccess', () => {
    it('delegates to projectService.checkModifyAccess', async () => {
      const file = {
        id: 2,
        fileableId: 20,
        fileableType: 'Task',
        fileName: 'g',
        createdBy: {},
      } as any;
      fileDelegateMock.findUnique.mockResolvedValue(file);
      storageServiceMock.getFileUrl.mockResolvedValue('url');
      const user = { id: 3, role: 'USER' } as any;

      await service.checkModifyAccess(user, 2);
      expect(taskServiceMock.checkModifyAccess).toHaveBeenCalledWith(user, 20);
    });
  });

  describe('getFiles', () => {
    it('returns files without urls when withUrl=false', async () => {
      const files = [{ id: 1 }, { id: 2 }] as any[];
      fileDelegateMock.findMany.mockResolvedValue(files);

      const result = await service.getFiles(5, 'Comment', false);
      expect(result).toEqual(files);
      expect(storageServiceMock.getFileUrl).not.toHaveBeenCalled();
    });

    it('returns files with urls when withUrl=true', async () => {
      const files = [
        { id: 3, fileName: 'a' },
        { id: 4, fileName: 'b' },
      ] as any[];
      fileDelegateMock.findMany.mockResolvedValue(files);
      storageServiceMock.getFileUrl
        .mockResolvedValueOnce('url-a')
        .mockResolvedValueOnce('url-b');

      const result = await service.getFiles(5, 'Comment', true);
      expect(storageServiceMock.getFileUrl).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { ...files[0], url: 'url-a' },
        { ...files[1], url: 'url-b' },
      ]);
    });
  });

  describe('getOne', () => {
    it('returns file with url when found', async () => {
      const file = { id: 7, fileName: 'z', createdBy: {} } as any;
      fileDelegateMock.findUnique.mockResolvedValue(file);
      storageServiceMock.getFileUrl.mockResolvedValue('signed');

      const result = await service.getOne(7);
      expect(fileDelegateMock.findUnique).toHaveBeenCalledWith({
        where: { id: 7 },
        include: { createdBy: true },
      });
      expect(storageServiceMock.getFileUrl).toHaveBeenCalledWith('z');
      expect(result).toEqual({ ...file, url: 'signed' });
    });

    it('throws if not found', async () => {
      fileDelegateMock.findUnique.mockResolvedValue(null);
      await expect(service.getOne(8)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('createFiles', () => {
    const userId = 11;
    const fileableId = 22;
    const files = [
      { mimetype: 'img/png', buffer: Buffer.from('x') } as Express.Multer.File,
    ];

    it('throws when limit exceeded', async () => {
      // Project limit = 100
      fileDelegateMock.count.mockResolvedValue(100);
      await expect(
        service.createFiles(files, userId, fileableId, 'Project', false),
      ).rejects.toThrow(FileLimitExceededException);
    });

    it('uploads and creates records without url', async () => {
      fileDelegateMock.count.mockResolvedValue(0);
      jest.spyOn((service as any).logger, 'log').mockImplementation(() => {});
      storageServiceMock.uploadFile.mockResolvedValue('fn');
      fileDelegateMock.create.mockResolvedValue({
        id: 9,
        fileName: 'fn',
        mimetype: 'img/png',
        fileableType: 'Project',
        fileableId,
        createdBy: { id: userId },
      } as any);

      const result = await service.createFiles(
        files,
        userId,
        fileableId,
        'Project',
      );
      expect(storageServiceMock.uploadFile).toHaveBeenCalledWith(files[0]);
      expect(fileDelegateMock.create).toHaveBeenCalledWith({
        data: {
          fileName: 'fn',
          mimeType: 'img/png',
          fileableType: 'Project',
          fileableId,
          createdBy: { connect: { id: userId } },
        },
        include: { createdBy: true },
      });
      expect(result[0]).toMatchObject({ id: 9, url: undefined });
    });

    it('uploads and creates records with url when withUrl=true', async () => {
      fileDelegateMock.count.mockResolvedValue(0);
      storageServiceMock.uploadFile.mockResolvedValue('fn2');
      storageServiceMock.getFileUrl.mockResolvedValue('url2');
      fileDelegateMock.create.mockResolvedValue({
        id: 10,
        fileName: 'fn2',
        mimetype: 'img/png',
        fileableType: 'Project',
        fileableId,
        createdBy: { id: userId },
      } as any);

      const result = await service.createFiles(
        files,
        userId,
        fileableId,
        'Project',
        true,
      );
      expect(storageServiceMock.getFileUrl).toHaveBeenCalledWith('fn2');
      expect(result[0]).toMatchObject({ id: 10, url: 'url2' });
    });
  });

  describe('deleteFile', () => {
    it('deletes db record and storage', async () => {
      const del = { id: 5, fileName: 'f5' } as any;
      fileDelegateMock.delete.mockResolvedValue(del);
      storageServiceMock.deleteFile.mockResolvedValue(undefined);
      const spyLog = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation();

      const result = await service.deleteFile(5);
      expect(spyLog).toHaveBeenCalledWith('Deleting file: 5');
      expect(fileDelegateMock.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(storageServiceMock.deleteFile).toHaveBeenCalledWith('f5');
      expect(result).toBe(del);
    });

    it('maps P2025 to ResourceNotFoundException', async () => {
      const err: any = new Error('not found');
      err.code = 'P2025';
      Object.setPrototypeOf(
        err,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );
      fileDelegateMock.delete.mockRejectedValue(err);

      await expect(service.deleteFile(6)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('deleteFiles', () => {
    it('calls deleteFile for each file', async () => {
      const filesList = [{ id: 1 }, { id: 2 }] as any[];
      jest.spyOn(service, 'getFiles').mockResolvedValue(filesList as any);
      const spy = jest
        .spyOn(service, 'deleteFile')
        .mockResolvedValue({} as any);

      await service.deleteFiles(3, 'Comment');
      expect(service.getFiles).toHaveBeenCalledWith(3, 'Comment');
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledWith(2);
    });
  });
});
