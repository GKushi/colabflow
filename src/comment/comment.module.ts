import { NotificationModule } from '../notification/notification.module';
import { ProjectModule } from '../project/project.module';
import { CommentController } from './comment.controller';
import { forwardRef, Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { TaskModule } from '../task/task.module';
import { FileModule } from '../file/file.module';

@Module({
  providers: [CommentService],
  controllers: [CommentController],
  exports: [CommentService],
  imports: [
    forwardRef(() => TaskModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => FileModule),
    NotificationModule,
  ],
})
export class CommentModule {}
