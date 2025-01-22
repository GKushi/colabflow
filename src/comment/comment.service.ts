import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, EditCommentDto } from './dto';
import { CommentableType } from '@prisma/client';

@Injectable()
export class CommentService {
  private readonly commentableMap: Record<CommentableType, any> = {
    Project: this.prismaService.project,
    Task: this.prismaService.task,
  };

  constructor(private prismaService: PrismaService) {}

  async getComments(commentableId: number, commentableType: CommentableType) {
    const commentable = await this.commentableMap[commentableType].findUnique({
      where: { id: commentableId },
    });

    if (!commentable)
      throw new NotFoundException(`${commentableType} not found`);

    return this.prismaService.comment.findMany({
      where: { commentableId, commentableType },
      include: { createdBy: true },
    });
  }

  async getComment(id: number) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id },
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
    const commentable = await this.commentableMap[commentableType].findUnique({
      where: { id: commentableId },
    });

    if (!commentable)
      throw new NotFoundException(`${commentableType} not found`);

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

  async editComment(
    id: number,
    editCommentDto: EditCommentDto,
    userId: number,
  ) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (comment.createdById !== userId && user.role !== 'ADMIN')
      throw new ForbiddenException('You are not the creator of this comment');

    return this.prismaService.comment.update({
      where: { id },
      data: editCommentDto,
    });
  }

  async deleteComment(id: number, userId: number) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    if (comment.createdById !== userId && user.role !== 'ADMIN')
      throw new ForbiddenException('You are not the creator of this comment');

    return this.prismaService.comment.delete({ where: { id } });
  }
}
