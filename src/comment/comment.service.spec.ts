import {
  PermissionDeniedException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/interfaces';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, EditCommentDto } from './dto';
import type { UserInSession } from '../auth/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import type { CommentableType } from '@prisma/client';
import { TaskService } from '../task/task.service';
import { FileService } from '../file/file.service';
import { CommentService } from './comment.service';
import { Prisma } from '@prisma/client';

describe('CommentService', () => {
  let service: CommentService;
  let prisma: PrismaService;
  let projectService: ProjectService;
  let taskService: TaskService;
  let fileService: FileService;
  let notificationService: NotificationService;

  const mockComment = {
    id: 10,
    commentableId: 42,
    commentableType: 'Project' as CommentableType,
    createdById: 7,
    description: 'hello',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: { id: 7, email: 'a@b.com', role: 'TEAM_MEMBER' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: PrismaService,
          useValue: {
            comment: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: ProjectService,
          useValue: {
            checkReadAccess: jest.fn(),
            getNotifiableUsers: jest.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            checkReadAccess: jest.fn(),
            getNotifiableUsers: jest.fn(),
          },
        },
        {
          provide: FileService,
          useValue: {
            getFiles: jest.fn(),
            createFiles: jest.fn(),
            deleteFiles: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            createNotifications: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CommentService);
    prisma = module.get(PrismaService);
    projectService = module.get(ProjectService);
    taskService = module.get(TaskService);
    fileService = module.get(FileService);
    notificationService = module.get(NotificationService);
  });

  describe('checkReadAccess', () => {
    it('delegates to projectService.checkReadAccess for Project', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue({
        ...mockComment,
        commentableType: 'Project',
        files: [],
      } as any);
      const user: UserInSession = {
        id: 1,
        email: 'u@x.com',
        role: 'TEAM_MEMBER',
      };
      await service.checkReadAccess(user, mockComment.id);
      expect(projectService.checkReadAccess).toHaveBeenCalledWith(
        user,
        mockComment.commentableId,
      );
    });

    it('delegates to taskService.checkReadAccess for Task', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue({
        ...mockComment,
        commentableType: 'Task',
        files: [],
      } as any);
      const user: UserInSession = {
        id: 1,
        email: 'u@x.com',
        role: 'TEAM_MEMBER',
      };
      await service.checkReadAccess(user, mockComment.id);
      expect(taskService.checkReadAccess).toHaveBeenCalledWith(
        user,
        mockComment.commentableId,
      );
    });
  });

  describe('checkModifyAccess', () => {
    it('allows ADMIN to modify', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue(mockComment as any);
      const admin: UserInSession = {
        id: 99,
        email: 'admin@x.com',
        role: 'ADMIN',
      };
      await expect(
        service.checkModifyAccess(admin, mockComment.id),
      ).resolves.toBeUndefined();
    });

    it('allows the creator to modify', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue(mockComment as any);
      const creator: UserInSession = {
        id: mockComment.createdById,
        email: 'a@b.com',
        role: 'TEAM_MEMBER',
      };
      await expect(
        service.checkModifyAccess(creator, mockComment.id),
      ).resolves.toBeUndefined();
    });

    it('denies other users', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue(mockComment as any);
      const other: UserInSession = {
        id: 999,
        email: 'other@x.com',
        role: 'TEAM_MEMBER',
      };
      await expect(
        service.checkModifyAccess(other, mockComment.id),
      ).rejects.toThrow(PermissionDeniedException);
    });
  });

  describe('getComments', () => {
    beforeEach(() => {
      (prisma.comment.findMany as jest.Mock).mockResolvedValue([
        mockComment,
      ] as any);
      (fileService.getFiles as jest.Mock).mockResolvedValue([
        { id: 55 },
      ] as any);
    });

    it('returns with files by default', async () => {
      const result = await service.getComments(
        mockComment.commentableId,
        mockComment.commentableType,
      );
      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          commentableId: mockComment.commentableId,
          commentableType: mockComment.commentableType,
        },
        include: { createdBy: true },
      });
      expect(fileService.getFiles).toHaveBeenCalledWith(
        mockComment.id,
        'Comment',
        true,
      );
      expect(result[0].files).toEqual([{ id: 55 }]);
    });

    it('skips files when files=false', async () => {
      const result = await service.getComments(
        mockComment.commentableId,
        mockComment.commentableType,
        false,
      );
      expect(fileService.getFiles).not.toHaveBeenCalled();
      expect(result).toEqual([mockComment]);
    });
  });

  describe('getOne', () => {
    it('returns comment with files', async () => {
      (prisma.comment.findUnique as jest.Mock).mockResolvedValue(
        mockComment as any,
      );
      (fileService.getFiles as jest.Mock).mockResolvedValue([
        { id: 77 },
      ] as any);

      const out = await service.getOne(mockComment.id);
      expect(prisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: mockComment.id },
        include: { createdBy: true },
      });
      expect(out.files).toEqual([{ id: 77 }]);
    });

    it('throws if not found', async () => {
      (prisma.comment.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getOne(1234)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('createComment', () => {
    const dto: CreateCommentDto = { description: 'hey there' };
    const emptyFiles: Express.Multer.File[] = [];
    const someFiles: Express.Multer.File[] = [
      { buffer: Buffer.from(''), originalname: 'a.txt' } as any,
    ];

    it('creates, notifies, and returns no files', async () => {
      const created = { ...mockComment } as any;
      (prisma.comment.create as jest.Mock).mockResolvedValue(created);
      (projectService.getNotifiableUsers as jest.Mock).mockResolvedValue([
        7, 8,
      ]);

      const result = await service.createComment(
        dto,
        emptyFiles,
        7,
        42,
        'Project',
      );
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          commentableId: 42,
          commentableType: 'Project',
          createdBy: { connect: { id: 7 } },
        },
        include: { createdBy: true },
      });
      expect(notificationService.createNotifications).toHaveBeenCalledWith(
        [8],
        NotificationType.ProjectCommented,
        42,
        'Project',
      );
      expect(result.files).toEqual([]);
    });

    it('attaches files when provided', async () => {
      const created = { ...mockComment } as any;
      (prisma.comment.create as jest.Mock).mockResolvedValue(created);
      (projectService.getNotifiableUsers as jest.Mock).mockResolvedValue([7]);
      (fileService.createFiles as jest.Mock).mockResolvedValue([
        { id: 99 },
      ] as any);

      const res = await service.createComment(dto, someFiles, 7, 42, 'Project');
      expect(fileService.createFiles).toHaveBeenCalledWith(
        someFiles,
        7,
        created.id,
        'Comment',
        true,
      );
      expect(res.files).toEqual([{ id: 99 }]);
    });

    it('uses Task path and correct notification', async () => {
      const created = {
        ...mockComment,
        commentableType: 'Task' as CommentableType,
      } as any;
      (prisma.comment.create as jest.Mock).mockResolvedValue(created);
      (taskService.getNotifiableUsers as jest.Mock).mockResolvedValue([1, 2]);

      await service.createComment(dto, emptyFiles, 1, 99, 'Task');
      expect(notificationService.createNotifications).toHaveBeenCalledWith(
        [2],
        NotificationType.TaskCommented,
        99,
        'Task',
      );
    });
  });

  describe('editComment', () => {
    it('updates and returns', async () => {
      const updated = { ...mockComment, description: 'new' } as any;
      (prisma.comment.update as jest.Mock).mockResolvedValue(updated);

      const out = await service.editComment(mockComment.id, {
        description: 'new',
      } as EditCommentDto);
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: mockComment.id },
        data: { description: 'new' },
        include: { createdBy: true },
      });
      expect(out).toBe(updated);
    });

    it('throws ResourceNotFoundException on P2025', async () => {
      const prismaErr = new Error('not found') as any;
      prismaErr.code = 'P2025';
      Object.setPrototypeOf(
        prismaErr,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );
      (prisma.comment.update as jest.Mock).mockRejectedValue(prismaErr);

      await expect(
        service.editComment(mockComment.id, { description: 'x' } as any),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('re-throws other errors', async () => {
      const err = new Error('boom');
      (prisma.comment.update as jest.Mock).mockRejectedValue(err);
      await expect(
        service.editComment(mockComment.id, { description: 'x' } as any),
      ).rejects.toThrow(err);
    });
  });

  describe('deleteComment', () => {
    it('deletes and cleans up files', async () => {
      (prisma.comment.delete as jest.Mock).mockResolvedValue(
        mockComment as any,
      );
      const out = await service.deleteComment(mockComment.id);
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: mockComment.id },
      });
      expect(fileService.deleteFiles).toHaveBeenCalledWith(
        mockComment.id,
        'Comment',
      );
      expect(out).toEqual(mockComment);
    });

    it('throws ResourceNotFoundException on P2025', async () => {
      const prismaErr = new Error('nf') as any;
      prismaErr.code = 'P2025';
      Object.setPrototypeOf(
        prismaErr,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );
      (prisma.comment.delete as jest.Mock).mockRejectedValue(prismaErr);

      await expect(service.deleteComment(mockComment.id)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('re-throws other errors', async () => {
      const err = new Error('fail');
      (prisma.comment.delete as jest.Mock).mockRejectedValue(err);
      await expect(service.deleteComment(mockComment.id)).rejects.toThrow(err);
    });
  });

  describe('deleteComments', () => {
    it('fetches all then calls deleteComment for each', async () => {
      const c1 = { id: 1 } as any;
      const c2 = { id: 2 } as any;
      jest.spyOn(service, 'getComments').mockResolvedValue([c1, c2] as any);
      const delSpy = jest
        .spyOn(service, 'deleteComment')
        .mockResolvedValue(undefined as any);

      await service.deleteComments(50, 'Project');
      expect(service.getComments).toHaveBeenCalledWith(50, 'Project', false);
      expect(delSpy).toHaveBeenCalledTimes(2);
      expect(delSpy).toHaveBeenCalledWith(1);
      expect(delSpy).toHaveBeenCalledWith(2);
    });
  });
});
