import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { Role } from '../auth/decorators/role.decorator';
import { User } from '../auth/decorators/user.decorator';
import { CreateProjectDto, EditProjectDto } from './dto';
import { TaskService } from '../task/task.service';
import { UserInSession } from '../auth/interfaces';
import { ProjectService } from './project.service';
import { Role as RoleEnum } from '@prisma/client';
import { CreateTaskDto } from '../task/dto';

@Controller('project')
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private taskService: TaskService,
  ) {}

  @Get()
  async getProjects() {
    return this.projectService.getProjects();
  }

  @Get(':id')
  async getProject(@Param('id', ParseIntPipe) id: number) {
    const project = await this.projectService.getProject(id);
    return { ...project, users: project.users.map((el) => el.userId) };
  }

  @Role(RoleEnum.MANAGER)
  @Post()
  async createProject(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createProjectDto: CreateProjectDto,
  ) {
    return this.projectService.createProject(createProjectDto);
  }

  @Role(RoleEnum.MANAGER)
  @Patch(':id')
  async editProject(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editProjectDto: EditProjectDto,
  ) {
    return this.projectService.editProject(id, editProjectDto);
  }

  @Role(RoleEnum.MANAGER)
  @Delete(':id')
  async deleteProject(@Param('id', ParseIntPipe) id: number) {
    return this.projectService.deleteProject(id);
  }

  @Role(RoleEnum.MANAGER)
  @Put(':id/users/:userId')
  async addUserToProject(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.projectService.addUserToProject(id, userId);
    return { message: 'User added to project' };
  }

  @Role(RoleEnum.MANAGER)
  @Delete(':id/users/:userId')
  async removeUserFromProject(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.projectService.removeUserFromProject(id, userId);
    return { message: 'User removed from project' };
  }

  @Get(':id/tasks')
  async getProjectTasks(@Param('id', ParseIntPipe) projectId: number) {
    const tasks = await this.taskService.getTasks(projectId);
    return tasks.map((task) => {
      const { projectId, createdAt, updatedAt, ...rest } = task;
      return rest;
    });
  }

  @Post(':id/tasks')
  async createProjectTask(
    @Param('id', ParseIntPipe) projectId: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createTaskDto: CreateTaskDto,
    @User() user: UserInSession,
  ) {
    return this.taskService.createTask(createTaskDto, user.id, projectId);
  }
}
