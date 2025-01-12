import {
  Patch,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ValidationPipe,
  Delete,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { EditTaskDto } from './dto';

@Controller('task')
export class TaskController {
  constructor(private taskService: TaskService) {}

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
}
