import { NotificationService } from '../notification/notification.service';
import { UserNotInProjectException } from '../project/exceptions';
import { ResourceNotFoundException } from '../common/exceptions';
import { NotificationType } from '../notification/interfaces';
import { ProjectService } from '../project/project.service';
import { CommentService } from '../comment/comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from '../file/file.service';
import { CreateTaskDto, EditTaskDto } from './dto';
import { TaskService } from './task.service';
import { Prisma } from '@prisma/client';

describe('TaskService', () => {
  let service: TaskService;

  // Prisma task delegate mock
  const taskMock = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const prismaMock: Partial<PrismaService> = {
    task: taskMock as any,
  };

  const projectServiceMock = {
    checkReadAccess: jest.fn(),
    getOne: jest.fn(),
  };
  const fileServiceMock = {
    getFiles: jest.fn(),
    deleteFiles: jest.fn(),
  };
  const commentServiceMock = {
    deleteComments: jest.fn(),
  };
  const notificationServiceMock = {
    createNotification: jest.fn(),
    createNotifications: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: FileService, useValue: fileServiceMock },
        { provide: CommentService, useValue: commentServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  describe('checkReadAccess', () => {
    it('fetches task and delegates to projectService.checkReadAccess', async () => {
      const user = { id: 1, role: 'ADMIN' } as any;
      const task = { projectId: 42 } as any;
      taskMock.findUnique.mockResolvedValue(task);

      await expect(service.checkReadAccess(user, 7)).resolves.toBeUndefined();
      expect(projectServiceMock.checkReadAccess).toHaveBeenCalledWith(user, 42);
    });

    it('throws if task not found', async () => {
      taskMock.findUnique.mockResolvedValue(null);
      await expect(service.checkReadAccess({} as any, 5)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('checkModifyAccess', () => {
    it('just calls checkReadAccess', async () => {
      const spy = jest
        .spyOn(service, 'checkReadAccess')
        .mockResolvedValue(undefined);
      await service.checkModifyAccess({} as any, 99);
      expect(spy).toHaveBeenCalledWith({} as any, 99);
    });
  });

  describe('getNotifiableUsers', () => {
    it('returns single ID if assignedTo equals createdBy', async () => {
      const task = {
        assignedTo: { id: 5 },
        createdBy: { id: 5 },
      } as any;
      jest.spyOn(service, 'getOne').mockResolvedValue(task);
      await expect(service.getNotifiableUsers(1)).resolves.toEqual([5]);
    });

    it('returns both IDs if different', async () => {
      const task = {
        assignedTo: { id: 5 },
        createdBy: { id: 9 },
      } as any;
      jest.spyOn(service, 'getOne').mockResolvedValue(task);
      await expect(service.getNotifiableUsers(1)).resolves.toEqual([5, 9]);
    });
  });

  describe('getTasks', () => {
    it('delegates to prisma.task.findMany with correct where/include', async () => {
      const records = [{ id: 1 }, { id: 2 }] as any[];
      taskMock.findMany.mockResolvedValue(records);
      await expect(service.getTasks(7)).resolves.toEqual(records);
      expect(taskMock.findMany).toHaveBeenCalledWith({
        where: { project: { id: 7 } },
        include: { assignedTo: true },
      });
    });
  });

  describe('getOne', () => {
    it('returns task plus files', async () => {
      const task = {
        id: 5,
        project: {},
        assignedTo: {},
        createdBy: {},
      } as any;
      taskMock.findUnique.mockResolvedValue(task);
      fileServiceMock.getFiles.mockResolvedValue([{ id: 10 }]);
      const result = await service.getOne(5);
      expect(result).toEqual({ ...task, files: [{ id: 10 }] });
    });

    it('throws if not found', async () => {
      taskMock.findUnique.mockResolvedValue(null);
      await expect(service.getOne(3)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('createTask', () => {
    const dto: CreateTaskDto = {
      title: 'Test',
      description: 'Desc',
      deadline: new Date().toISOString(),
      assignedTo: 22,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    };

    it('throws if assignedTo user not in project', async () => {
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [{ user: { id: 99 } }],
      } as any);
      await expect(service.createTask(dto, 99, 7)).rejects.toThrow(
        UserNotInProjectException,
      );
    });

    it('creates task and skips notification when creator is assignee', async () => {
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [{ user: { id: 22 } }],
      } as any);
      const created = {
        id: 10,
        assignedTo: { id: 22 },
        createdBy: { id: 22 },
        project: { id: 7 },
      } as any;
      taskMock.create.mockResolvedValue(created);

      const result = await service.createTask(dto, 22, 7);
      expect(taskMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            project: { connect: { id: 7 } },
            assignedTo: { connect: { id: 22 } },
            createdBy: { connect: { id: 22 } },
          }),
        }),
      );
      expect(notificationServiceMock.createNotification).not.toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it('creates task and notifies when assignee is different', async () => {
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [{ user: { id: 22 } }, { user: { id: 33 } }],
      } as any);
      const created = {
        id: 11,
        assignedTo: { id: 33 },
        createdBy: { id: 22 },
        project: { id: 7 },
      } as any;
      taskMock.create.mockResolvedValue(created);

      const result = await service.createTask(dto, 22, 7);
      expect(notificationServiceMock.createNotification).toHaveBeenCalledWith(
        33,
        NotificationType.TaskAssigned,
        11,
        'Task',
      );
      expect(result).toEqual(created);
    });

    it('maps P2025 to ResourceNotFoundException', async () => {
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [{ user: { id: 22 } }],
      } as any);
      const err: any = new Error('not found');
      err.code = 'P2025';
      Object.setPrototypeOf(
        err,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );
      taskMock.create.mockRejectedValue(err);

      await expect(service.createTask(dto, 22, 7)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('editTask', () => {
    const existing = {
      id: 5,
      projectId: 7,
      assignedTo: { id: 22 },
      createdBy: { id: 33 },
    } as any;

    it('throws if new assignee not in project', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue(existing);
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [{ user: { id: 22 } }],
      } as any);
      const dto: EditTaskDto = { assignedTo: 99, title: 'X' };
      await expect(service.editTask(5, dto, 22)).rejects.toThrow(
        UserNotInProjectException,
      );
    });

    it('updates properties and notifies change', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue(existing);
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [{ user: { id: 22 } }, { user: { id: 33 } }],
      } as any);
      const dto: EditTaskDto = { title: 'NewTitle' };
      const updated = {
        ...existing,
        project: {},
        assignedTo: { id: 22 },
        createdBy: { id: 33 },
        title: 'NewTitle',
      } as any;
      taskMock.update.mockResolvedValue(updated);

      const result = await service.editTask(5, dto, 33);
      expect(taskMock.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { title: 'NewTitle' },
        include: { project: true, assignedTo: true, createdBy: true },
      });
      expect(notificationServiceMock.createNotifications).toHaveBeenCalledWith(
        [33, 22].filter((id) => id !== 33),
        NotificationType.TaskChanged,
        5,
        'Task',
      );
      expect(result).toEqual(updated);
    });

    it('reassigns user and notifies when different editor', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue(existing);
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [
          { user: { id: 99 } },
          { user: { id: 22 } },
          { user: { id: 33 } },
        ],
      } as any);
      const dto: EditTaskDto = { assignedTo: 99 };
      const updated = {
        ...existing,
        project: {},
        assignedTo: { id: 99 },
        createdBy: { id: 33 },
      } as any;
      taskMock.update.mockResolvedValue(updated);

      const result = await service.editTask(5, dto, 22);
      expect(notificationServiceMock.createNotification).toHaveBeenCalledWith(
        99,
        NotificationType.TaskAssigned,
        5,
        'Task',
      );
      expect(
        notificationServiceMock.createNotifications,
      ).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('maps P2025 to ResourceNotFoundException', async () => {
      jest.spyOn(service, 'getOne').mockResolvedValue(existing);
      projectServiceMock.getOne.mockResolvedValue({
        id: 7,
        users: [{ user: { id: 22 } }],
      } as any);
      const dto: EditTaskDto = { title: 'X' };
      const err: any = new Error('not found');
      err.code = 'P2025';
      Object.setPrototypeOf(
        err,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );
      taskMock.update.mockRejectedValue(err);

      await expect(service.editTask(5, dto, 33)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('deleteTask', () => {
    it('deletes and cleans up files & comments', async () => {
      const deleted = { id: 5 } as any;
      taskMock.delete.mockResolvedValue(deleted);
      const result = await service.deleteTask(5);
      expect(taskMock.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(fileServiceMock.deleteFiles).toHaveBeenCalledWith(5, 'Task');
      expect(commentServiceMock.deleteComments).toHaveBeenCalledWith(5, 'Task');
      expect(result).toEqual(deleted);
    });

    it('maps P2025 to ResourceNotFoundException', async () => {
      const err: any = new Error('not found');
      err.code = 'P2025';
      Object.setPrototypeOf(
        err,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );
      taskMock.delete.mockRejectedValue(err);

      await expect(service.deleteTask(5)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('deleteTasks', () => {
    it('fetches all and calls deleteTask for each', async () => {
      taskMock.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }] as any[]);
      const spy = jest
        .spyOn(service, 'deleteTask')
        .mockResolvedValue({} as any);

      await service.deleteTasks(7);
      expect(taskMock.findMany).toHaveBeenCalledWith({
        where: { project: { id: 7 } },
      });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledWith(2);
    });
  });
});
