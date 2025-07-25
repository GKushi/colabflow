import {
  PermissionDeniedException,
  ResourceNotFoundException,
} from '../common/exceptions';
import {
  UserAlreadyInProjectException,
  UserNotInProjectException,
} from './exceptions';
import { NotificationService } from '../notification/notification.service';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../notification/interfaces';
import { UserNotVerifiedException } from '../auth/exceptions';
import { CommentService } from '../comment/comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, EditProjectDto } from './dto';
import type { UserInSession } from '../auth/interfaces';
import { FileService } from '../file/file.service';
import { TaskService } from '../task/task.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => FileService))
    private fileService: FileService,
    @Inject(forwardRef(() => CommentService))
    private commentService: CommentService,
    private taskService: TaskService,
    private notificationService: NotificationService,
  ) {}

  async checkReadAccess(user: UserInSession, projectId: number) {
    const project = await this.getOne(projectId);

    if (user.role === 'TEAM_MEMBER') {
      if (!project.users.some((el) => el.user.id === user.id))
        throw new UserNotInProjectException(user.id, projectId);
    }
  }

  async checkModifyAccess(user: UserInSession, projectId: number) {
    await this.checkReadAccess(user, projectId);

    if (user.role === 'TEAM_MEMBER')
      throw new PermissionDeniedException(
        'You are not allowed to modify this project',
      );
  }

  async getNotifiableUsers(projectId: number) {
    const projectUsers = await this.prismaService.projectUser.findMany({
      where: { projectId },
    });

    return projectUsers.map((el) => el.userId);
  }

  async getProjects(user?: UserInSession) {
    if (user?.role === 'TEAM_MEMBER')
      return this.prismaService.project.findMany({
        where: { users: { some: { userId: user.id } } },
      });

    return this.prismaService.project.findMany();
  }

  async getOne(id: number) {
    const project = await this.prismaService.project.findUnique({
      where: { id },
      include: { users: { select: { user: true } } },
    });

    if (!project) throw new ResourceNotFoundException('Project', id);

    const files = await this.fileService.getFiles(id, 'Project');

    return { ...project, files };
  }

  createProject(createProjectDto: CreateProjectDto) {
    this.logger.log(`Creating project: ${createProjectDto.name}`);

    return this.prismaService.project.create({
      data: createProjectDto,
    });
  }

  async editProject(
    id: number,
    editProjectDto: EditProjectDto,
    editorId?: number,
  ) {
    try {
      const editedProject = await this.prismaService.project.update({
        where: { id },
        data: editProjectDto,
      });

      const users = await this.getNotifiableUsers(id);

      await this.notificationService.createNotifications(
        users.filter((el) => el !== editorId),
        NotificationType.ProjectChanged,
        id,
        'Project',
      );

      return editedProject;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new ResourceNotFoundException('Project', id);
      }

      throw e;
    }
  }

  async deleteProject(id: number) {
    try {
      this.logger.log(`Deleting project: ${id}`);

      await this.taskService.deleteTasks(id);

      const deletedProject = await this.prismaService.project.delete({
        where: { id },
      });

      await this.fileService.deleteFiles(id, 'Project');

      await this.commentService.deleteComments(id, 'Project');

      return deletedProject;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new ResourceNotFoundException('Project', id);
      }

      throw e;
    }
  }

  async addUserToProject(id: number, userId: number, assignerId?: number) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new ResourceNotFoundException('Project', id);

      if (!user.emailVerified) throw new UserNotVerifiedException(user.id);

      await this.prismaService.project.update({
        where: { id },
        data: { users: { create: { userId } } },
      });

      if (assignerId !== userId)
        await this.notificationService.createNotification(
          userId,
          NotificationType.ProjectAssigned,
          id,
          'Project',
        );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new ResourceNotFoundException('Project', id);

        if (e.code === 'P2003')
          throw new ResourceNotFoundException('User', userId);

        if (e.code === 'P2002')
          throw new UserAlreadyInProjectException(userId, id);
      }

      throw e;
    }
  }

  async removeUserFromProject(id: number, userId: number) {
    try {
      await this.prismaService.project.update({
        where: { id },
        data: {
          users: { delete: { userId_projectId: { userId, projectId: id } } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2017') throw new ResourceNotFoundException('Relation');
      }

      throw e;
    }
  }
}
