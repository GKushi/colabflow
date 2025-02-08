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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { CommentModifyAccessGuard } from './guards/comment-modify-access.guard';
import { CommentReadAccessGuard } from './guards/comment-read-access.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '../auth/decorators/user.decorator';
import type { UserInSession } from '../auth/interfaces';
import { FileService } from '../file/file.service';
import { CommentService } from './comment.service';
import { EditCommentDto } from './dto';

@Controller('comment')
export class CommentController {
  constructor(
    private commentService: CommentService,
    private fileService: FileService,
  ) {}

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

  @UseGuards(CommentReadAccessGuard)
  @Get(':id/files')
  async getFiles(@Param('id', ParseIntPipe) commentId: number) {
    const files = await this.fileService.getFiles(commentId, 'Comment');

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

  @UseGuards(CommentModifyAccessGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id/files')
  async createFile(
    @Param('id', ParseIntPipe) commentId: number,
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
      commentId,
      'Comment',
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
