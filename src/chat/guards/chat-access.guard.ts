import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionWithUser } from '../../auth/interfaces';
import { ChatService } from '../chat.service';

@Injectable()
export class ChatAccessGuard implements CanActivate {
  constructor(private chatService: ChatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SessionWithUser = request.session;
    const chatId = parseInt(request.params.id);

    if (!chatId) throw new NotFoundException('Chat not found');

    if (!session.user) throw new UnauthorizedException('User not found');

    await this.chatService.checkAccess(session.user, chatId);

    return true;
  }
}
