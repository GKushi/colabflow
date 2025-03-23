import { Prisma, type Project, type Task, type User } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { UserNotInProjectException } from '../project/exceptions';
import { ResourceNotFoundException } from '../common/exceptions';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { NotificationType } from '../notification/interfaces';
import { ProjectService } from '../project/project.service';
import { CommentService } from '../comment/comment.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UserInSession } from '../auth/interfaces';
import { FileService } from '../file/file.service';
import { CreateTaskDto, EditTaskDto } from './dto';

@Injectable()
export class TaskService {
  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
    @Inject(forwardRef(() => FileService))
    private fileService: FileService,
    @Inject(forwardRef(() => CommentService))
    private commentService: CommentService,
    private notificationService: NotificationService,
  ) {}

  async checkReadAccess(user: UserInSession, taskId: number) {
    const task = await this.getOne(taskId);

    await this.projectService.checkReadAccess(user, task.projectId);
  }

  async checkModifyAccess(user: UserInSession, taskId: number) {
    await this.checkReadAccess(user, taskId);
  }

  async getNotifiableUsers(taskId: number) {
    const task = await this.getOne(taskId);

    if (task.assignedTo.id === task.createdBy.id) return [task.createdBy.id];

    return [task.assignedTo.id, task.createdBy.id];
  }

  getTasks(projectId: number) {
    return this.prismaService.task.findMany({
      where: {
        project: {
          id: projectId,
        },
      },
      include: {
        assignedTo: true,
      },
    });
  }

  async getOne(id: number) {
    const task = await this.prismaService.task.findUnique({
      where: { id },
      include: { project: true, assignedTo: true, createdBy: true },
    });

    if (!task) throw new ResourceNotFoundException('Task', id);

    const files = await this.fileService.getFiles(task.id, 'Task');

    return { ...task, files };
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    userId: number,
    projectId: number,
  ) {
    const project = await this.projectService.getOne(projectId);

    if (!project.users.some((el) => el.user.id === createTaskDto.assignedTo))
      throw new UserNotInProjectException(userId, projectId);

    try {
      const newTask = await this.prismaService.task.create({
        data: {
          ...createTaskDto,
          deadline: new Date(createTaskDto.deadline),
          project: {
            connect: {
              id: projectId,
            },
          },
          assignedTo: {
            connect: {
              id: createTaskDto.assignedTo,
            },
          },
          createdBy: {
            connect: { id: userId },
          },
        },
        include: {
          assignedTo: true,
          project: true,
          createdBy: true,
        },
      });

      if (newTask.assignedTo.id !== userId)
        await this.notificationService.createNotification(
          newTask.assignedTo.id,
          NotificationType.TaskAssigned,
          newTask.id,
          'Task',
        );

      return newTask;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new ResourceNotFoundException('Project or user');
      }

      throw e;
    }
  }

  async editTask(id: number, editTaskDto: EditTaskDto, editorId?: number) {
    const { assignedTo, ...editTaskProps } = editTaskDto;

    const task = await this.getOne(id);

    const fetchedProject = await this.projectService.getOne(task.projectId);

    if (
      assignedTo &&
      !fetchedProject.users.some((el) => el.user.id === assignedTo)
    )
      throw new UserNotInProjectException(assignedTo, fetchedProject.id);

    const assignedToField = assignedTo
      ? { assignedTo: { connect: { id: assignedTo } } }
      : {};

    let updatedTask: Task & {
      project: Project;
      assignedTo: User;
      createdBy: User;
    };

    try {
      updatedTask = await this.prismaService.task.update({
        where: { id },
        data: { ...editTaskProps, ...assignedToField },
        include: { project: true, assignedTo: true, createdBy: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new ResourceNotFoundException('Project or user');
      }

      throw e;
    }

    if (assignedTo && updatedTask.assignedTo.id !== editorId)
      await this.notificationService.createNotification(
        updatedTask.assignedTo.id,
        NotificationType.TaskAssigned,
        updatedTask.id,
        'Task',
      );

    if (Object.keys(editTaskProps).length > 0)
      await this.notificationService.createNotifications(
        [
          updatedTask.createdBy.id,
          ...(assignedTo ? [] : [updatedTask.assignedTo.id]),
        ].filter((el) => el !== editorId),
        NotificationType.TaskChanged,
        updatedTask.id,
        'Task',
      );

    return updatedTask;
  }

  async deleteTask(id: number) {
    let deletedTask: Task;
    try {
      deletedTask = await this.prismaService.task.delete({
        where: { id },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw new ResourceNotFoundException('Task', id);
      }

      throw e;
    }

    await this.fileService.deleteFiles(id, 'Task');

    await this.commentService.deleteComments(id, 'Task');

    return deletedTask;
  }

  async deleteTasks(projectId: number) {
    const tasks = await this.prismaService.task.findMany({
      where: {
        project: {
          id: projectId,
        },
      },
    });

    for (const task of tasks) {
      await this.deleteTask(task.id);
    }
  }
}
