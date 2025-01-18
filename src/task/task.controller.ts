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
} from '@nestjs/common';
import { CommentService } from '../comment/comment.service';
import { User } from '../auth/decorators/user.decorator';
import type { UserInSession } from '../auth/interfaces';
import { CreateCommentDto } from '../comment/dto';
import { TaskService } from './task.service';
import { EditTaskDto } from './dto';

@Controller('task')
export class TaskController {
  constructor(
    private taskService: TaskService,
    private commentService: CommentService,
  ) {}

  @Get(':id')
  getTask(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.getTask(id);
  }

  @Patch(':id')
  editTask(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editTaskDto: EditTaskDto,
  ) {
    return this.taskService.editTask(id, editTaskDto);
  }

  @Delete(':id')
  deleteTask(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.deleteTask(id);
  }

  @Get(':id/comments')
  getComments(@Param('id', ParseIntPipe) taskId: number) {
    return this.commentService.getComments(taskId, 'Task');
  }

  @Post(':id/comments')
  createComment(
    @Param('id', ParseIntPipe) taskId: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createCommentDto: CreateCommentDto,
    @User() user: UserInSession,
  ) {
    return this.commentService.createComment(
      createCommentDto,
      user.id,
      taskId,
      'Task',
    );
  }
}
