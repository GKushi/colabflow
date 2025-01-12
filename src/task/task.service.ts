import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, EditTaskDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(
    private prismaService: PrismaService,
    private projectService: ProjectService,
  ) {}

  async getTasks(project?: number) {
    if (project) await this.projectService.getProject(project);

    return this.prismaService.task.findMany({
      where: {
        project: {
          id: project,
        },
      },
    });
  }

  async getTask(id: number) {
    const task = await this.prismaService.task.findUnique({ where: { id } });

    if (!task) throw new NotFoundException('Task not found');

    return task;
  }

  async createTask(
    createTaskDto: CreateTaskDto,
    userId: number,
    projectId: number,
  ) {
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
    const { project, assignedTo, ...editTaskProps } = editTaskDto;

    const projectField = project
      ? { project: { connect: { id: project } } }
      : {};

    const assignedToField = assignedTo
      ? { assignedTo: { connect: { id: assignedTo } } }
      : {};

    try {
      return await this.prismaService.task.update({
        where: { id },
        data: { ...editTaskProps, ...projectField, ...assignedToField },
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
