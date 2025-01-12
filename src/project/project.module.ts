import { ProjectController } from './project.controller';
import { forwardRef, Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { TaskModule } from '../task/task.module';

@Module({
  providers: [ProjectService],
  controllers: [ProjectController],
  exports: [ProjectService],
  imports: [forwardRef(() => TaskModule)],
})
export class ProjectModule {}
