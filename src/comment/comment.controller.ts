import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CommentModifyAccessGuard } from './guards/comment-modify-access.guard';
import { CommentReadAccessGuard } from './guards/comment-read-access.guard';
import { CommentService } from './comment.service';
import { EditCommentDto } from './dto';

@Controller('comment')
export class CommentController {
  constructor(private commentService: CommentService) {}

  @UseGuards(CommentReadAccessGuard)
  @Get(':id')
  async getComment(@Param('id', ParseIntPipe) id: number) {
    const { createdById, commentableType, commentableId, ...comment } =
      await this.commentService.getOne(id);

    return {
      ...comment,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
    };
  }

  @UseGuards(CommentModifyAccessGuard)
  @Patch(':id')
  async editComment(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editCommentDto: EditCommentDto,
  ) {
    const { createdById, commentableType, commentableId, ...comment } =
      await this.commentService.editComment(id, editCommentDto);

    return {
      ...comment,
      createdBy: {
        id: comment.createdBy.id,
        email: comment.createdBy.email,
        nickName: comment.createdBy.nickName,
      },
    };
  }

  @UseGuards(CommentModifyAccessGuard)
  @Delete(':id')
  async deleteComment(@Param('id', ParseIntPipe) id: number) {
    await this.commentService.deleteComment(id);
    return { success: true, message: 'Comment deleted' };
  }
}
