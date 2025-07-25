import { NotificationModule } from '../notification/notification.module';
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
    NotificationModule,
    forwardRef(() => ProjectModule),
    forwardRef(() => CommentModule),
    forwardRef(() => FileModule),
  ],
})
export class TaskModule {}
