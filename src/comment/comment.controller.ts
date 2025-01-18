import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { User } from 'src/auth/decorators/user.decorator';
import { UserInSession } from 'src/auth/interfaces';
import { CommentService } from './comment.service';
import { EditCommentDto } from './dto';

@Controller('comment')
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Get(':id')
  getComment(@Param('id', ParseIntPipe) id: number) {
    return this.commentService.getComment(id);
  }

  @Patch(':id')
  editComment(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editCommentDto: EditCommentDto,
    @User() user: UserInSession,
  ) {
    return this.commentService.editComment(id, editCommentDto, user.id);
  }

  @Delete(':id')
  deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserInSession,
  ) {
    return this.commentService.deleteComment(id, user.id);
  }
}
