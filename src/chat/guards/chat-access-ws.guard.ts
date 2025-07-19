import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions';
import { ChatService } from '../chat.service';

@Injectable()
export class ChatAccessWsGuard implements CanActivate {
  constructor(private chatService: ChatService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToWs();
    const socket = request.getClient();
    const data = request.getData();
    if (!socket || !data) {
      throw new UnauthorizedException();
    }

    const chatId = parseInt(data.id);

    if (!chatId) throw new ResourceNotFoundException('chat');

    if (!socket.session.user) throw new UnauthorizedException();

    await this.chatService.checkAccess(socket.session.user, chatId);

    return true;
  }
}
