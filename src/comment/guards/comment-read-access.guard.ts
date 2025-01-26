import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionWithUser } from '../../auth/interfaces';
import { CommentService } from '../comment.service';

@Injectable()
export class CommentReadAccessGuard implements CanActivate {
  constructor(private commentService: CommentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SessionWithUser = request.session;
    const commentId = parseInt(request.params.id);

    if (!commentId) {
      throw new NotFoundException('Comment Id not found');
    }

    if (!session.user) {
      throw new UnauthorizedException('User not found');
    }

    await this.commentService.checkReadAccess(session.user, commentId);

    return true;
  }
}
