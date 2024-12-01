import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
