import { ProjectService } from '../project/project.service';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [TaskService, ProjectService],
  controllers: [TaskController],
})
export class TaskModule {}
