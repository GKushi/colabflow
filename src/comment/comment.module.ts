import { ProjectModule } from '../project/project.module';
import { CommentController } from './comment.controller';
import { forwardRef, Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { TaskModule } from '../task/task.module';

@Module({
  providers: [CommentService],
  controllers: [CommentController],
  exports: [CommentService],
  imports: [forwardRef(() => TaskModule), forwardRef(() => ProjectModule)],
})
export class CommentModule {}
