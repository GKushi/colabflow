import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UserInSession } from '../auth/interfaces';
import { CreateTaskDto, EditTaskDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(
    private prismaService: PrismaService,
    private projectService: ProjectService,
  ) {}

  async checkIfUserCanAccessTask(user: UserInSession, taskId: number) {
    const task = await this.getTask(taskId);

    await this.projectService.checkIfUserCanAccessProject(user, task.projectId);
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

  async getTask(id: number) {
    const task = await this.prismaService.task.findUnique({
      where: { id },
      include: { project: true, assignedTo: true, createdBy: true },
    });

    if (!task) throw new NotFoundException('Task not found');

    return task;
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    userId: number,
    projectId: number,
  ) {
    const project = await this.projectService.getProject(projectId);

    if (!project.users.some((el) => el.user.id === createTaskDto.assignedTo))
      throw new ForbiddenException('User is not in this project');

    try {
      return await this.prismaService.task.create({
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Project or User with this id not found');
      }

      throw e;
    }
  }

  async editTask(id: number, editTaskDto: EditTaskDto) {
    const { assignedTo, ...editTaskProps } = editTaskDto;

    const task = await this.getTask(id);

    const fetchedProject = await this.projectService.getProject(task.projectId);

    if (
      assignedTo &&
      !fetchedProject.users.some((el) => el.user.id === assignedTo)
    )
      throw new BadRequestException('User is not in this project');

    const assignedToField = assignedTo
      ? { assignedTo: { connect: { id: assignedTo } } }
      : {};

    try {
      return await this.prismaService.task.update({
        where: { id },
        data: { ...editTaskProps, ...assignedToField },
        include: { project: true, assignedTo: true, createdBy: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Project or User with this id not found');
      }

      throw e;
    }
  }

  async deleteTask(id: number) {
    try {
      return await this.prismaService.task.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Task with this id not found');
      }

      throw e;
    }
  }
}
