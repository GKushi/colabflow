import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ProjectReadAccessGuard } from './guards/project-read-access.guard';
import { CommentService } from '../comment/comment.service';
import { FilesInterceptor } from '@nestjs/platform-express';
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

  @UseGuards(ProjectReadAccessGuard)
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
      files: project.files.map((file) => ({
        ...file,
        createdById: undefined,
        fileableId: undefined,
        fileableType: undefined,
        createdBy: {
          id: file.createdBy.id,
          email: file.createdBy.email,
          nickName: file.createdBy.nickName,
        },
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
    @User() user: UserInSession,
  ) {
    return this.projectService.editProject(id, editProjectDto, user.id);
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
    @User() user: UserInSession,
  ) {
    await this.projectService.addUserToProject(id, userId, user.id);

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

  @UseGuards(ProjectReadAccessGuard)
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

  @UseGuards(ProjectReadAccessGuard)
  @Post(':id/tasks')
  async createProjectTask(
    @Param('id', ParseIntPipe) project: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createTaskDto: CreateTaskDto,
    @User() user: UserInSession,
  ) {
    const task = await this.taskService.createTask(
      createTaskDto,
      user.id,
      project,
    );

    return {
      ...task,
      createdById: undefined,
      assignedToId: undefined,
      projectId: undefined,
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

  @UseGuards(ProjectReadAccessGuard)
  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) projectId: number) {
    const comments = await this.commentService.getComments(
      projectId,
      'Project',
    );

    return comments.map((comment) => ({
      ...comment,
      createdById: undefined,
      commentableId: undefined,
      commentableType: undefined,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
      files: comment.files.map((file) => ({
        ...file,
        createdById: undefined,
        fileableId: undefined,
        fileableType: undefined,
        createdBy: undefined,
      })),
    }));
  }

  @UseGuards(ProjectReadAccessGuard)
  @UseInterceptors(FilesInterceptor('file', 2))
  @Post(':id/comments')
  async createComment(
    @Param('id', ParseIntPipe) projectId: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    createCommentDto: CreateCommentDto,
    @User() user: UserInSession,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10485760 }),
          new FileTypeValidator({ fileType: /^image\/.+$/i }),
        ],
        fileIsRequired: false,
        exceptionFactory: () => {
          throw new BadRequestException('Invalid file');
        },
      }),
    )
    uploadedFiles?: Express.Multer.File[],
  ) {
    const comment = await this.commentService.createComment(
      createCommentDto,
      uploadedFiles || [],
      user.id,
      projectId,
      'Project',
    );

    return {
      ...comment,
      createdById: undefined,
      commentableId: undefined,
      commentableType: undefined,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
      files: comment.files.map((file) => ({
        ...file,
        createdById: undefined,
        fileableId: undefined,
        fileableType: undefined,
        createdBy: undefined,
      })),
    };
  }

  @UseGuards(ProjectReadAccessGuard)
  @UseInterceptors(FilesInterceptor('file', 10))
  @Post(':id/files')
  async createFiles(
    @Param('id', ParseIntPipe) projectId: number,
    @User() user: UserInSession,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2147483648 })],
        fileIsRequired: true,
        exceptionFactory: () => {
          throw new BadRequestException('Invalid file');
        },
      }),
    )
    uploadedFiles: Express.Multer.File[],
  ) {
    const files = await this.fileService.createFiles(
      uploadedFiles,
      user.id,
      projectId,
      'Project',
      true,
    );

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
}
