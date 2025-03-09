import { NotificationModule } from '../notification/notification.module';
import { CommentModule } from '../comment/comment.module';
import { ProjectController } from './project.controller';
import { forwardRef, Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { TaskModule } from '../task/task.module';
import { FileModule } from '../file/file.module';

@Module({
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService],
  imports: [
    NotificationModule,
    forwardRef(() => TaskModule),
    forwardRef(() => CommentModule),
    forwardRef(() => FileModule),
  ],
})
export class ProjectModule {}
