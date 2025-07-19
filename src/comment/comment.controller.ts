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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { CommentModifyAccessGuard } from './guards/comment-modify-access.guard';
import { CommentReadAccessGuard } from './guards/comment-read-access.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserMapper } from '../user/mappers/user.mapper';
import { User } from '../auth/decorators/user.decorator';
import type { UserInSession } from '../auth/interfaces';
import { FileService } from '../file/file.service';
import { CommentService } from './comment.service';
import { Throttle } from '@nestjs/throttler';
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
    const comment = await this.commentService.getOne(id);

    return {
      ...comment,
      createdById: undefined,
      commentableId: undefined,
      commentableType: undefined,
      createdBy: UserMapper.toPublic(comment.createdBy),
      files: comment.files.map((file) => ({
        ...file,
        createdById: undefined,
        fileableId: undefined,
        fileableType: undefined,
        createdBy: undefined,
      })),
    };
  }

  @UseGuards(CommentModifyAccessGuard)
  @Patch(':id')
  async editComment(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editCommentDto: EditCommentDto,
  ) {
    const comment = await this.commentService.editComment(id, editCommentDto);

    return {
      ...comment,
      createdById: undefined,
      commentableId: undefined,
      commentableType: undefined,
      createdBy: UserMapper.toPublic(comment.createdBy),
    };
  }

  @UseGuards(CommentModifyAccessGuard)
  @Delete(':id')
  async deleteComment(@Param('id', ParseIntPipe) id: number) {
    await this.commentService.deleteComment(id);
    return { success: true, message: 'Comment deleted' };
  }

  @UseGuards(CommentModifyAccessGuard)
  @UseInterceptors(FilesInterceptor('file', 2))
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post(':id/files')
  async createFiles(
    @Param('id', ParseIntPipe) commentId: number,
    @User() user: UserInSession,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10485760 }),
          new FileTypeValidator({ fileType: /^image\/.+$/i }),
        ],
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
      commentId,
      'Comment',
      true,
    );

    return files.map((file) => ({
      ...file,
      createdById: undefined,
      fileableId: undefined,
      fileableType: undefined,
      createdBy: UserMapper.toPublic(file.createdBy),
    }));
  }
}
