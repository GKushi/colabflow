import { CommentModule } from '../comment/comment.module';
import { ProjectModule } from '../project/project.module';
import { forwardRef, Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { StorageService } from './storage.service';
import { TaskModule } from '../task/task.module';
import { ConfigModule } from '@nestjs/config';
import { FileService } from './file.service';

@Module({
  controllers: [FileController],
  providers: [FileService, StorageService],
  exports: [FileService, StorageService],
  imports: [
    forwardRef(() => TaskModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => CommentModule),
    ConfigModule,
  ],
})
export class FileModule {}
