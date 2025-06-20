import {
  ResourceNotFoundException,
  PermissionDeniedException,
} from '../common/exceptions';
import {
  UserAlreadyInProjectException,
  UserNotInProjectException,
} from './exceptions';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/interfaces';
import { UserNotVerifiedException } from '../auth/exceptions';
import { CommentService } from '../comment/comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from '../file/file.service';
import { TaskService } from '../task/task.service';
import { ProjectService } from './project.service';
import { Prisma } from '@prisma/client';

describe('ProjectService', () => {
  let service: ProjectService;

  // Explicit mocks so jest.fn() methods support .mockResolvedValue()
  const projectMock = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const projectUserMock = { findMany: jest.fn() };
  const userMock = { findUnique: jest.fn() };

  const prismaMock: Partial<PrismaService> = {
    project: projectMock as any,
    projectUser: projectUserMock as any,
    user: userMock as any,
  };

  const fileServiceMock = {
    getFiles: jest.fn(),
    deleteFiles: jest.fn(),
  };
  const commentServiceMock = { deleteComments: jest.fn() };
  const taskServiceMock = { deleteTasks: jest.fn() };
  const notificationServiceMock = {
    createNotifications: jest.fn(),
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: FileService, useValue: fileServiceMock },
        { provide: CommentService, useValue: commentServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  describe('checkReadAccess', () => {
    it('throws if TEAM_MEMBER is not in project', async () => {
      const user = { id: 1, role: 'TEAM_MEMBER' } as any;
      projectMock.findUnique.mockResolvedValue({
        id: 2,
        users: [{ user: { id: 99 } }],
      });
      await expect(service.checkReadAccess(user, 2)).rejects.toThrow(
        UserNotInProjectException,
      );
    });

    it('allows ADMIN or member of project', async () => {
      const admin = { id: 1, role: 'ADMIN' } as any;
      projectMock.findUnique.mockResolvedValue({ id: 2, users: [] });
      await expect(service.checkReadAccess(admin, 2)).resolves.toBeUndefined();

      const member = { id: 5, role: 'TEAM_MEMBER' } as any;
      projectMock.findUnique.mockResolvedValue({
        id: 2,
        users: [{ user: { id: 5 } }],
      });
      await expect(service.checkReadAccess(member, 2)).resolves.toBeUndefined();
    });
  });

  describe('checkModifyAccess', () => {
    it('throws PermissionDeniedException for TEAM_MEMBER', async () => {
      const user = { id: 1, role: 'TEAM_MEMBER' } as any;
      projectMock.findUnique.mockResolvedValue({
        id: 5,
        users: [{ user: { id: 1 } }],
      });
      await expect(service.checkModifyAccess(user, 5)).rejects.toThrow(
        PermissionDeniedException,
      );
    });
  });

  describe('getNotifiableUsers', () => {
    it('returns list of user IDs', async () => {
      projectUserMock.findMany.mockResolvedValue([
        { userId: 7 },
        { userId: 8 },
      ]);
      await expect(service.getNotifiableUsers(3)).resolves.toEqual([7, 8]);
    });
  });

  describe('getProjects', () => {
    it('filters by TEAM_MEMBER', async () => {
      const records = [{ id: 1 }, { id: 2 }];
      projectMock.findMany.mockResolvedValue(records);
      const user = { id: 99, role: 'TEAM_MEMBER' } as any;
      await expect(service.getProjects(user)).resolves.toEqual(records);
      expect(projectMock.findMany).toHaveBeenCalledWith({
        where: { users: { some: { userId: 99 } } },
      });
    });

    it('returns all for others', async () => {
      const all = [{ id: 42 }];
      projectMock.findMany.mockResolvedValue(all);
      await expect(
        service.getProjects({ role: 'ADMIN' } as any),
      ).resolves.toEqual(all);
    });
  });

  describe('getOne', () => {
    it('returns project with files', async () => {
      const proj = { id: 5, users: [], name: 'X' } as any;
      projectMock.findUnique.mockResolvedValue(proj);
      fileServiceMock.getFiles.mockResolvedValue([{ id: 10 }]);
      const result = await service.getOne(5);
      expect(result).toEqual({ ...proj, files: [{ id: 10 }] });
    });

    it('throws if not found', async () => {
      projectMock.findUnique.mockResolvedValue(null);
      await expect(service.getOne(123)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('createProject', () => {
    it('creates via Prisma', async () => {
      const dto = { name: 'New' } as any;
      projectMock.create.mockResolvedValue({ id: 9, ...dto });
      await expect(service.createProject(dto)).resolves.toEqual({
        id: 9,
        ...dto,
      });
      expect(projectMock.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('editProject', () => {
    const dto = { name: 'Edited' } as any;

    it('updates and notifies others', async () => {
      projectMock.update.mockResolvedValue({ id: 7, ...dto });
      projectUserMock.findMany.mockResolvedValue([
        { userId: 1 },
        { userId: 2 },
        { userId: 3 },
      ]);
      const result = await service.editProject(7, dto, 2);
      expect(result).toEqual({ id: 7, ...dto });
      expect(notificationServiceMock.createNotifications).toHaveBeenCalledWith(
        [1, 3],
        NotificationType.ProjectChanged,
        7,
        'Project',
      );
    });

    it('maps P2025 to ResourceNotFoundException', async () => {
      const prismaErr = new Error('not found') as any;
      prismaErr.code = 'P2025';
      Object.setPrototypeOf(
        prismaErr,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );

      (projectMock.update as jest.Mock).mockRejectedValue(prismaErr);

      await expect(service.editProject(8, dto)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('deleteProject', () => {
    it('deletes tasks, project, files, and comments', async () => {
      projectMock.delete.mockResolvedValue({ id: 9 } as any);
      const result = await service.deleteProject(9);
      expect(taskServiceMock.deleteTasks).toHaveBeenCalledWith(9);
      expect(projectMock.delete).toHaveBeenCalledWith({ where: { id: 9 } });
      expect(fileServiceMock.deleteFiles).toHaveBeenCalledWith(9, 'Project');
      expect(commentServiceMock.deleteComments).toHaveBeenCalledWith(
        9,
        'Project',
      );
      expect(result).toEqual({ id: 9 });
    });

    it('maps P2025 to ResourceNotFoundException', async () => {
      const prismaErr = new Error('not found') as any;
      prismaErr.code = 'P2025';
      Object.setPrototypeOf(
        prismaErr,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );

      (projectMock.delete as jest.Mock).mockRejectedValue(prismaErr);

      await expect(service.deleteProject(10)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('addUserToProject', () => {
    const projId = 11;
    const userId = 22;

    it('throws if user not found', async () => {
      userMock.findUnique.mockResolvedValue(null);
      await expect(service.addUserToProject(projId, userId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('throws if user not verified', async () => {
      userMock.findUnique.mockResolvedValue({
        id: userId,
        emailVerified: false,
      });
      await expect(service.addUserToProject(projId, userId)).rejects.toThrow(
        UserNotVerifiedException,
      );
    });

    it('adds user and notifies when assignerId differs', async () => {
      userMock.findUnique.mockResolvedValue({
        id: userId,
        emailVerified: true,
      });
      projectMock.update.mockResolvedValue({} as any);
      await service.addUserToProject(projId, userId, /*assignerId=*/ 99);
      expect(projectMock.update).toHaveBeenCalled();
      expect(notificationServiceMock.createNotification).toHaveBeenCalledWith(
        userId,
        NotificationType.ProjectAssigned,
        projId,
        'Project',
      );
    });

    it('does not notify when assignerId equals userId', async () => {
      userMock.findUnique.mockResolvedValue({
        id: userId,
        emailVerified: true,
      });
      projectMock.update.mockResolvedValue({} as any);
      await service.addUserToProject(projId, userId, userId);
      expect(notificationServiceMock.createNotification).not.toHaveBeenCalled();
    });

    it('maps P2003 to ResourceNotFoundException', async () => {
      userMock.findUnique.mockResolvedValue({
        id: userId,
        emailVerified: true,
      });

      const prismaErr = new Error('not found') as any;
      prismaErr.code = 'P2003';
      Object.setPrototypeOf(
        prismaErr,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );

      (projectMock.update as jest.Mock).mockRejectedValue(prismaErr);

      await expect(service.addUserToProject(projId, userId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('maps P2002 to UserAlreadyInProjectException', async () => {
      userMock.findUnique.mockResolvedValue({
        id: userId,
        emailVerified: true,
      });

      const prismaErr = new Error('not found') as any;
      prismaErr.code = 'P2002';
      Object.setPrototypeOf(
        prismaErr,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );

      (projectMock.update as jest.Mock).mockRejectedValue(prismaErr);

      await expect(service.addUserToProject(projId, userId)).rejects.toThrow(
        UserAlreadyInProjectException,
      );
    });
  });

  describe('removeUserFromProject', () => {
    it('removes the relation', async () => {
      projectMock.update.mockResolvedValue({} as any);
      await service.removeUserFromProject(5, 6);
      expect(projectMock.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: {
          users: {
            delete: { userId_projectId: { userId: 6, projectId: 5 } },
          },
        },
      });
    });

    it('maps P2017 to ResourceNotFoundException', async () => {
      const prismaErr = new Error('not found') as any;

      prismaErr.code = 'P2017';

      Object.setPrototypeOf(
        prismaErr,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );

      (projectMock.update as jest.Mock).mockRejectedValue(prismaErr);

      await expect(service.removeUserFromProject(5, 6)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });
});
