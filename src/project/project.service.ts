import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, EditProjectDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private prismaService: PrismaService) {}

  async getProjects() {
    return this.prismaService.project.findMany();
  }

  async getProject(id: number) {
    const project = await this.prismaService.project.findUnique({
      where: { id },
      include: { users: { select: { userId: true } } },
    });

    if (!project) throw new NotFoundException('Project with this id not found');

    return project;
  }

  async createProject(createProjectDto: CreateProjectDto) {
    return this.prismaService.project.create({
      data: createProjectDto,
    });
  }

  async editProject(id: number, editProjectDto: EditProjectDto) {
    try {
      return await this.prismaService.project.update({
        where: { id },
        data: editProjectDto,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Project with this id not found');
      }
      throw e;
    }
  }

  async deleteProject(id: number) {
    try {
      return await this.prismaService.project.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Project with this id not found');
      }
      throw e;
    }
  }

  async addUserToProject(id: number, userId: number) {
    try {
      await this.prismaService.project.update({
        where: { id },
        data: { users: { create: { userId } } },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Project with this id not found');
        if (e.code === 'P2003')
          throw new NotFoundException('User with this id not found');
        if (e.code === 'P2002')
          throw new ConflictException('User already in project');
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
        if (e.code === 'P2017')
          throw new NotFoundException('That relation does not exist');
      }
      throw e;
    }
  }
}
