import {
  Patch,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ValidationPipe,
  Delete,
  Post,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  UploadedFiles,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { TaskReadAccessGuard } from './guards/task-read-access.guard';
import { CommentService } from '../comment/comment.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { User } from '../auth/decorators/user.decorator';
import { UserMapper } from '../user/mappers/user.mapper';
import type { UserInSession } from '../auth/interfaces';
import { FileService } from '../file/file.service';
import { CreateCommentDto } from '../comment/dto';
import { ApiCookieAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TaskService } from './task.service';
import { EditTaskDto } from './dto';

@ApiCookieAuth()
@Controller('task')
@UseGuards(TaskReadAccessGuard)
export class TaskController {
  constructor(
    private taskService: TaskService,
    private commentService: CommentService,
    private fileService: FileService,
  ) {}

  @Get(':id')
  async getTask(@Param('id', ParseIntPipe) id: number) {
    const task = await this.taskService.getOne(id);

    return {
      ...task,
      createdById: undefined,
      assignedToId: undefined,
      projectId: undefined,
      project: {
        id: task.project.id,
        name: task.project.name,
      },
      assignedTo: UserMapper.toPublic(task.assignedTo),
      createdBy: UserMapper.toPublic(task.createdBy),
      files: task.files.map((file) => ({
        ...file,
        createdById: undefined,
        fileableId: undefined,
        fileableType: undefined,
        createdBy: UserMapper.toPublic(file.createdBy),
      })),
    };
  }

  @Patch(':id')
  async editTask(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editTaskDto: EditTaskDto,
    @User() user: UserInSession,
  ) {
    const task = await this.taskService.editTask(id, editTaskDto, user.id);

    return {
      ...task,
      createdById: undefined,
      assignedToId: undefined,
      projectId: undefined,
      project: {
        id: task.project.id,
        name: task.project.name,
      },
      assignedTo: UserMapper.toPublic(task.assignedTo),
      createdBy: UserMapper.toPublic(task.createdBy),
    };
  }

  @Delete(':id')
  async deleteTask(@Param('id', ParseIntPipe) id: number) {
    await this.taskService.deleteTask(id);

    return { success: true, message: 'Task deleted' };
  }

  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) taskId: number) {
    const comments = await this.commentService.getComments(taskId, 'Task');

    return comments.map((comment) => ({
      ...comment,
      createdById: undefined,
      commentableId: undefined,
      commentableType: undefined,
      createdBy: UserMapper.toPublic(comment.createdBy),
      files: comment.files.map((file) => ({
        ...file,
        createdById: undefined,
        fileableId: undefined,
        fileableType: undefined,
        createdBy: undefined,
      })),
    }));
  }

  @UseInterceptors(FilesInterceptor('file', 2))
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post(':id/comments')
  async createComment(
    @Param('id', ParseIntPipe) taskId: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createCommentDto: CreateCommentDto,
    @User() user: UserInSession,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10485760 }),
          new FileTypeValidator({ fileType: /^image\/.+$/i }),
        ],
        fileIsRequired: false,
        exceptionFactory: () => {
          throw new BadRequestException('Invalid file');
        },
      }),
    )
    uploadedFiles?: Express.Multer.File[],
  ) {
    const comment = await this.commentService.createComment(
      createCommentDto,
      uploadedFiles || [],
      user.id,
      taskId,
      'Task',
    );

    return {
      ...comment,
      createdById: undefined,
      commentableId: undefined,
      commentableType: undefined,
      createdBy: UserMapper.toPublic(comment.createdBy),
      files: comment.files.map((file) => ({
        ...file,
        createdById: undefined,
        fileableId: undefined,
        fileableType: undefined,
        createdBy: undefined,
      })),
    };
  }

  @UseInterceptors(FilesInterceptor('file', 10))
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post(':id/files')
  async createFiles(
    @Param('id', ParseIntPipe) taskId: number,
    @User() user: UserInSession,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2147483648 })],
        fileIsRequired: true,
        exceptionFactory: () => {
          throw new BadRequestException('Invalid file');
        },
      }),
    )
    uploadedFiles: Express.Multer.File[],
  ) {
    const files = await this.fileService.createFiles(
      uploadedFiles || [],
      user.id,
      taskId,
      'Task',
      true,
    );

    return files.map((file) => ({
      ...file,
      createdById: undefined,
      fileableId: undefined,
      fileableType: undefined,
      createdBy: UserMapper.toPublic(file.createdBy),
    }));
  }
}
