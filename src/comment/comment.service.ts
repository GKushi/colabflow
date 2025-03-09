import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Comment,
  type CommentableType,
  type File,
  Prisma,
  type User,
} from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/interfaces';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, EditCommentDto } from './dto';
import type { UserInSession } from '../auth/interfaces';
import { TaskService } from '../task/task.service';
import { FileService } from '../file/file.service';

@Injectable()
export class CommentService {
  private readonly commentableMap = {
    Project: this.projectService,
    Task: this.taskService,
  };

  constructor(
    private prismaService: PrismaService,
    private projectService: ProjectService,
    private taskService: TaskService,
    @Inject(forwardRef(() => FileService))
    private fileService: FileService,
    private notificationService: NotificationService,
  ) {}

  async checkReadAccess(user: UserInSession, commentId: number) {
    const comment = await this.getOne(commentId);

    await this.commentableMap[comment.commentableType].checkAccess(
      user,
      comment.commentableId,
    );
  }

  async checkModifyAccess(user: UserInSession, commentId: number) {
    const comment = await this.getOne(commentId);

    if (user.role === 'ADMIN') return;

    if (comment.createdById !== user.id)
      throw new ForbiddenException('You are not the creator of this comment');
  }

  async getComments(
    commentableId: number,
    commentableType: CommentableType,
    files?: true,
  ): Promise<(Comment & { createdBy: User; files: File[] })[]>;

  async getComments(
    commentableId: number,
    commentableType: CommentableType,
    files: false,
  ): Promise<(Comment & { createdBy: User })[]>;

  async getComments(
    commentableId: number,
    commentableType: CommentableType,
    files = true,
  ) {
    const comments = await this.prismaService.comment.findMany({
      where: { commentableId, commentableType },
      include: { createdBy: true },
    });

    if (!files) return comments;

    const fullComments: (Comment & { createdBy: User; files: File[] })[] = [];

    for (const comment of comments) {
      const files = await this.fileService.getFiles(
        comment.id,
        'Comment',
        true,
      );

      fullComments.push({ ...comment, files });
    }

    return fullComments;
  }

  async getOne(id: number) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id },
      include: { createdBy: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const files = await this.fileService.getFiles(comment.id, 'Comment', true);

    return { ...comment, files };
  }

  async createComment(
    createCommentDto: CreateCommentDto,
    uploadedFiles: Express.Multer.File[],
    userId: number,
    commentableId: number,
    commentableType: CommentableType,
  ) {
    const comment = await this.prismaService.comment.create({
      data: {
        ...createCommentDto,
        commentableId,
        commentableType,
        createdBy: {
          connect: { id: userId },
        },
      },
      include: { createdBy: true },
    });

    const notifiableUsers =
      await this.commentableMap[commentableType].getNotifiableUsers(
        commentableId,
      );

    await this.notificationService.createNotifications(
      notifiableUsers.filter((el) => el !== userId),
      commentableType === 'Task'
        ? NotificationType.TaskCommented
        : NotificationType.ProjectCommented,
      commentableId,
      commentableType,
    );

    const files =
      uploadedFiles.length > 0
        ? await this.fileService.createFiles(
            uploadedFiles,
            userId,
            comment.id,
            'Comment',
            true,
          )
        : [];

    return { ...comment, files };
  }

  async editComment(id: number, editCommentDto: EditCommentDto) {
    try {
      return await this.prismaService.comment.update({
        where: { id },
        data: editCommentDto,
        include: { createdBy: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Comment not found');
      }

      throw e;
    }
  }

  async deleteComment(id: number) {
    try {
      const deletedComment = await this.prismaService.comment.delete({
        where: { id },
      });

      await this.fileService.deleteFiles(id, 'Comment');

      return deletedComment;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Comment not found');
      }

      throw e;
    }
  }

  async deleteComments(id: number, commentableType: CommentableType) {
    const comments = await this.getComments(id, commentableType, false);

    for (const comment of comments) {
      await this.deleteComment(comment.id);
    }
  }
}
