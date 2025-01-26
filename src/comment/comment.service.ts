import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommentableType, Prisma } from '@prisma/client';
import { CreateCommentDto, EditCommentDto } from './dto';
import { TaskService } from '../task/task.service';
import { UserInSession } from '../auth/interfaces';

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
  ) {}

  async checkReadAccess(user: UserInSession, commentId: number) {
    const comment = await this.getOne(commentId);

    await this.commentableMap[comment.commentableType].checkAccess(
      user,
      comment.commentableId,
    );
  }

  async checkModifyAccess(user: UserInSession, commentId: number) {
    if (user.role === 'ADMIN') return;

    const comment = await this.getOne(commentId);

    if (comment.createdById !== user.id)
      throw new ForbiddenException('You are not the creator of this comment');
  }

  async getComments(commentableId: number, commentableType: CommentableType) {
    await this.commentableMap[commentableType].getOne(commentableId);

    return this.prismaService.comment.findMany({
      where: { commentableId, commentableType },
      include: { createdBy: true },
    });
  }

  async getOne(id: number) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id },
      include: { createdBy: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    return comment;
  }

  async createComment(
    createCommentDto: CreateCommentDto,
    userId: number,
    commentableId: number,
    commentableType: CommentableType,
  ) {
    await this.commentableMap[commentableType].getOne(commentableId);

    return this.prismaService.comment.create({
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
      return await this.prismaService.comment.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Comment not found');
      }

      throw e;
    }
  }
}
