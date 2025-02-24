import { ProjectModule } from '../project/project.module';
import { CommentModule } from '../comment/comment.module';
import { forwardRef, Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { FileModule } from '../file/file.module';
import { TaskService } from './task.service';

@Module({
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
  imports: [
    forwardRef(() => ProjectModule),
    forwardRef(() => CommentModule),
    forwardRef(() => FileModule),
    forwardRef(() => TaskModule),
  ],
})
export class TaskModule {}
