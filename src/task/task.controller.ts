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
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { TaskAccessGuard } from './guards/task-access.guard';
import { CommentService } from '../comment/comment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../auth/decorators/user.decorator';
import type { UserInSession } from '../auth/interfaces';
import { FileService } from '../file/file.service';
import { CreateCommentDto } from '../comment/dto';
import { TaskService } from './task.service';
import { EditTaskDto } from './dto';

@Controller('task')
@UseGuards(TaskAccessGuard)
export class TaskController {
  constructor(
    private taskService: TaskService,
    private commentService: CommentService,
    private fileService: FileService,
  ) {}

  @Get(':id')
  async getTask(@Param('id', ParseIntPipe) id: number) {
    const { projectId, assignedToId, createdById, ...task } =
      await this.taskService.getOne(id);

    return {
      ...task,
      project: {
        id: task.project.id,
        name: task.project.name,
      },
      assignedTo: {
        id: task.assignedTo.id,
        email: task.assignedTo.email,
        nickName: task.assignedTo.nickName,
      },
      createdBy: {
        id: task.createdBy.id,
        email: task.createdBy.email,
        nickName: task.createdBy.nickName,
      },
    };
  }

  @Patch(':id')
  async editTask(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editTaskDto: EditTaskDto,
  ) {
    const { projectId, assignedToId, createdById, ...task } =
      await this.taskService.editTask(id, editTaskDto);

    return {
      ...task,
      project: {
        id: task.project.id,
        name: task.project.name,
      },
      assignedTo: {
        id: task.assignedTo.id,
        email: task.assignedTo.email,
        nickName: task.assignedTo.nickName,
      },
      createdBy: {
        id: task.createdBy.id,
        email: task.createdBy.email,
        nickName: task.createdBy.nickName,
      },
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
      id: comment.id,
      description: comment.description,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }

  @Post(':id/comments')
  async createComment(
    @Param('id', ParseIntPipe) taskId: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createCommentDto: CreateCommentDto,
    @User() user: UserInSession,
  ) {
    const { createdById, commentableType, commentableId, ...comment } =
      await this.commentService.createComment(
        createCommentDto,
        user.id,
        taskId,
        'Task',
      );

    return {
      ...comment,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
    };
  }

  @Get(':id/files')
  async getFiles(@Param('id', ParseIntPipe) taskId: number) {
    const files = await this.fileService.getFiles(taskId, 'Task');

    return files.map((file) => ({
      ...file,
      createdById: undefined,
      fileableId: undefined,
      fileableType: undefined,
      createdBy: {
        id: file.createdBy.id,
        email: file.createdBy.email,
        nickName: file.createdBy.nickName,
      },
    }));
  }

  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/files')
  async createFile(
    @Param('id', ParseIntPipe) taskId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2000 })],
      }),
    )
    uploadedFile: Express.Multer.File,
    @User() user: UserInSession,
  ) {
    const file = await this.fileService.createFile(
      uploadedFile,
      user.id,
      taskId,
      'Task',
    );

    return {
      ...file,
      fileableId: undefined,
      fileableType: undefined,
      createdById: undefined,
      createdBy: {
        id: file.createdBy.id,
        email: file.createdBy.email,
        nickName: file.createdBy.nickName,
      },
    };
  }
}
