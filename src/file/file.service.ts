import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentService } from 'src/comment/comment.service';
import { ProjectService } from '../project/project.service';
import { type FileableType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UserInSession } from '../auth/interfaces';
import { TaskService } from '../task/task.service';
import { StorageService } from './storage.service';

interface FileableService {
  checkAccess?: (user: UserInSession, id: number) => Promise<void>;
  checkReadAccess?: (user: UserInSession, id: number) => Promise<void>;
  getOne(id: number): Promise<any>;
}

@Injectable()
export class FileService {
  private readonly fileableMap: Record<FileableType, FileableService> = {
    Project: this.projectService,
    Task: this.taskService,
    Comment: this.commentService,
  };

  constructor(
    private prismaService: PrismaService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private commentService: CommentService,
    private storageService: StorageService,
  ) {}

  async checkReadAccess(user: UserInSession, fileId: number) {
    const file = await this.getOne(fileId);
    const service = this.fileableMap[file.fileableType];

    if (service.checkAccess) {
      await service.checkAccess(user, file.fileableId);
    } else if (service.checkReadAccess) {
      await service.checkReadAccess(user, file.fileableId);
    } else {
      throw new Error(
        `No access check method found for type ${file.fileableType}`,
      );
    }
  }

  async checkModifyAccess(user: UserInSession, fileId: number) {
    if (user.role === 'ADMIN') return;

    const file = await this.getOne(fileId);

    if (file.createdById !== user.id)
      throw new ForbiddenException('You are not the creator of this file');
  }

  async getFiles(fileableId: number, fileableType: FileableType) {
    await this.fileableMap[fileableType].getOne(fileableId);

    return this.prismaService.file.findMany({
      where: { fileableId, fileableType },
      include: { createdBy: true },
    });
  }

  async getOne(id: number) {
    const file = await this.prismaService.file.findUnique({
      where: { id },
      include: { createdBy: true },
    });

    if (!file) throw new NotFoundException('File not found');

    const url = await this.storageService.getFileUrl(file.fileName);

    return { ...file, url };
  }

  async createFile(
    file: Express.Multer.File,
    userId: number,
    fileableId: number,
    fileableType: FileableType,
  ) {
    await this.fileableMap[fileableType].getOne(fileableId);

    const fileName = await this.storageService.uploadFile(file);

    return this.prismaService.file.create({
      data: {
        fileName: fileName,
        mimeType: file.mimetype,
        fileableType,
        fileableId,
        createdBy: {
          connect: { id: userId },
        },
      },
      include: { createdBy: true },
    });
  }

  async deleteFile(id: number) {
    try {
      const deleted = await this.prismaService.file.delete({ where: { id } });
      await this.storageService.deleteFile(deleted.fileName);
      return deleted;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw new NotFoundException('File not found');
      }

      throw e;
    }
  }
}
