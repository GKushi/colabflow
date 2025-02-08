import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { CommentService } from '../comment/comment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../auth/decorators/role.decorator';
import { User } from '../auth/decorators/user.decorator';
import { CreateProjectDto, EditProjectDto } from './dto';
import { TaskService } from '../task/task.service';
import { FileService } from '../file/file.service';
import { UserInSession } from '../auth/interfaces';
import { ProjectService } from './project.service';
import { CreateCommentDto } from '../comment/dto';
import { Role as RoleEnum } from '@prisma/client';
import { CreateTaskDto } from '../task/dto';

@Controller('project')
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private taskService: TaskService,
    private commentService: CommentService,
    private fileService: FileService,
  ) {}

  @Get()
  getProjects(@User() user: UserInSession) {
    return this.projectService.getProjects(user);
  }

  @UseGuards(ProjectAccessGuard)
  @Get(':id')
  async getProject(@Param('id', ParseIntPipe) id: number) {
    const project = await this.projectService.getOne(id);

    return {
      ...project,
      users: project.users.map((el) => ({
        id: el.user.id,
        email: el.user.email,
        nickName: el.user.nickName,
      })),
    };
  }

  @Role(RoleEnum.MANAGER)
  @Post()
  createProject(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createProjectDto: CreateProjectDto,
  ) {
    return this.projectService.createProject(createProjectDto);
  }

  @Role(RoleEnum.MANAGER)
  @Patch(':id')
  editProject(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editProjectDto: EditProjectDto,
  ) {
    return this.projectService.editProject(id, editProjectDto);
  }

  @Role(RoleEnum.MANAGER)
  @Delete(':id')
  async deleteProject(@Param('id', ParseIntPipe) id: number) {
    await this.projectService.deleteProject(id);

    return { success: true, message: 'Project deleted' };
  }

  @Role(RoleEnum.MANAGER)
  @Put(':id/users/:userId')
  async addUserToProject(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.projectService.addUserToProject(id, userId);

    return { success: true, message: 'User added to project' };
  }

  @Role(RoleEnum.MANAGER)
  @Delete(':id/users/:userId')
  async removeUserFromProject(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.projectService.removeUserFromProject(id, userId);

    return { success: true, message: 'User removed from project' };
  }

  @UseGuards(ProjectAccessGuard)
  @Get(':id/tasks')
  async getProjectTasks(@Param('id', ParseIntPipe) projectId: number) {
    const tasks = await this.taskService.getTasks(projectId);

    return tasks.map((task) => {
      return {
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        status: task.status,
        priority: task.priority,
        assignedTo: {
          id: task.assignedTo.id,
          email: task.assignedTo.email,
          nickName: task.assignedTo.nickName,
        },
      };
    });
  }

  @UseGuards(ProjectAccessGuard)
  @Post(':id/tasks')
  async createProjectTask(
    @Param('id', ParseIntPipe) project: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createTaskDto: CreateTaskDto,
    @User() user: UserInSession,
  ) {
    const { createdById, assignedToId, projectId, ...task } =
      await this.taskService.createTask(createTaskDto, user.id, project);

    return {
      ...task,
      project: {
        id: task.project.id,
        name: task.project.name,
      },
      createdBy: {
        id: task.createdBy.id,
        email: task.createdBy.email,
        nickName: task.createdBy.nickName,
      },
      assignedTo: {
        id: task.assignedTo.id,
        email: task.assignedTo.email,
        nickName: task.assignedTo.nickName,
      },
    };
  }

  @UseGuards(ProjectAccessGuard)
  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) projectId: number) {
    const comments = await this.commentService.getComments(
      projectId,
      'Project',
    );

    return comments.map((comment) => ({
      id: comment.id,
      description: comment.description,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }

  @UseGuards(ProjectAccessGuard)
  @Post(':id/comments')
  async createComment(
    @Param('id', ParseIntPipe) projectId: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createCommentDto: CreateCommentDto,
    @User() user: UserInSession,
  ) {
    const { createdById, commentableType, commentableId, ...comment } =
      await this.commentService.createComment(
        createCommentDto,
        user.id,
        projectId,
        'Project',
      );

    return {
      ...comment,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
    };
  }

  @UseGuards(ProjectAccessGuard)
  @Get(':id/files')
  async getFiles(@Param('id', ParseIntPipe) projectId: number) {
    const files = await this.fileService.getFiles(projectId, 'Project');

    return files.map((file) => ({
      ...file,
      createdById: undefined,
      fileableId: undefined,
      fileableType: undefined,
      createdBy: {
        id: file.createdBy.id,
        email: file.createdBy.email,
        nickName: file.createdBy.nickName,
      },
    }));
  }

  @UseGuards(ProjectAccessGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/files')
  async createFile(
    @Param('id', ParseIntPipe) projectId: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2000 })],
      }),
    )
    uploadedFile: Express.Multer.File,
    @User() user: UserInSession,
  ) {
    const file = await this.fileService.createFile(
      uploadedFile,
      user.id,
      projectId,
      'Project',
    );

    return {
      ...file,
      fileableId: undefined,
      fileableType: undefined,
      createdById: undefined,
      createdBy: {
        id: file.createdBy.id,
        email: file.createdBy.email,
        nickName: file.createdBy.nickName,
      },
    };
  }
}
