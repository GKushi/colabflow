import {
  type FileableType,
  Prisma,
  type User,
  type File,
} from '@prisma/client';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ResourceNotFoundException } from '../common/exceptions';
import { CommentService } from '../comment/comment.service';
import { ProjectService } from '../project/project.service';
import { FileLimitExceededException } from './exceptions';
import { PrismaService } from '../prisma/prisma.service';
import type { UserInSession } from '../auth/interfaces';
import { TaskService } from '../task/task.service';
import { StorageService } from './storage.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  private readonly fileableMap = {
    Project: { service: this.projectService, limit: 100 },
    Task: { service: this.taskService, limit: 20 },
    Comment: { service: this.commentService, limit: 2 },
  };

  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => ProjectService))
    private projectService: ProjectService,
    @Inject(forwardRef(() => TaskService))
    private taskService: TaskService,
    @Inject(forwardRef(() => CommentService))
    private commentService: CommentService,
    private storageService: StorageService,
  ) {}

  async checkReadAccess(user: UserInSession, fileId: number) {
    const file = await this.getOne(fileId);
    const fileable = this.fileableMap[file.fileableType];

    await fileable.service.checkReadAccess(user, file.fileableId);
  }

  async checkModifyAccess(user: UserInSession, fileId: number) {
    const file = await this.getOne(fileId);
    const fileable = this.fileableMap[file.fileableType];

    await fileable.service.checkModifyAccess(user, file.fileableId);
  }

  async getFiles(
    fileableId: number,
    fileableType: FileableType,
    withUrl: true,
  ): Promise<(File & { url: string; createdBy: User })[]>;
  async getFiles(
    fileableId: number,
    fileableType: FileableType,
    withUrl?: false,
  ): Promise<(File & { createdBy: User })[]>;

  async getFiles(
    fileableId: number,
    fileableType: FileableType,
    withUrl = false,
  ) {
    const files = await this.prismaService.file.findMany({
      where: { fileableId, fileableType },
      include: { createdBy: true },
    });

    if (!withUrl) return files;

    const filesWithUrl: (File & { url: string })[] = [];

    for (const file of files) {
      const url = await this.storageService.getFileUrl(file.fileName);
      filesWithUrl.push({ ...file, url });
    }

    return filesWithUrl;
  }

  async getOne(id: number) {
    const file = await this.prismaService.file.findUnique({
      where: { id },
      include: { createdBy: true },
    });

    if (!file) throw new ResourceNotFoundException('File', id);

    const url = await this.storageService.getFileUrl(file.fileName);

    return { ...file, url };
  }

  async createFiles(
    files: Array<Express.Multer.File>,
    userId: number,
    fileableId: number,
    fileableType: FileableType,
    withUrl = false,
  ) {
    await this.checkFileLimit(fileableId, fileableType, files.length);

    this.logger.log(`User: ${userId}, uploading ${files.length} files`);

    const createdFiles: (File & {
      createdBy: User;
      url?: string;
    })[] = [];

    for (const file of files) {
      const fileName = await this.storageService.uploadFile(file);

      const url = withUrl
        ? await this.storageService.getFileUrl(fileName)
        : undefined;

      const createdFile = await this.prismaService.file.create({
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

      createdFiles.push({ ...createdFile, url });
    }

    return createdFiles;
  }

  async deleteFile(id: number) {
    try {
      this.logger.log(`Deleting file: ${id}`);

      const deleted = await this.prismaService.file.delete({ where: { id } });

      await this.storageService.deleteFile(deleted.fileName);

      return deleted;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') throw new ResourceNotFoundException('File', id);
      }

      throw e;
    }
  }

  async deleteFiles(fileableId: number, fileableType: FileableType) {
    const files = await this.getFiles(fileableId, fileableType);

    for (const file of files) {
      await this.deleteFile(file.id);
    }
  }

  private async checkFileLimit(
    fileableId: number,
    fileableType: FileableType,
    newFiles: number,
  ) {
    const fileable = this.fileableMap[fileableType];

    const files = await this.prismaService.file.count({
      where: { fileableId, fileableType },
    });

    if (files + newFiles > fileable.limit)
      throw new FileLimitExceededException(fileableType, fileableId);
  }
}
