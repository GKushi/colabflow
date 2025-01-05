import {
  Patch,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  ValidationPipe,
  Delete,
  Query,
} from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { UserInSession } from '../auth/interfaces';
import { CreateTaskDto, EditTaskDto } from './dto';
import { TaskService } from './task.service';

@Controller('task')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Get()
  getTasks(
    @Query('project', new ParseIntPipe({ optional: true })) project?: number,
  ) {
    return this.taskService.getTasks(project);
  }

  @Get(':id')
  getTask(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.getTask(id);
  }

  @Post()
  async createTask(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createTaskDto: CreateTaskDto,
    @User() user: UserInSession,
  ) {
    return this.taskService.createTask(createTaskDto, user.id);
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
}
