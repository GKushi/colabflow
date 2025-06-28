import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { UserInSession } from '../auth/interfaces';
import { ChatService } from './chat.service';
import { GetOrCreateChatDto } from './dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  getOrCreateChat(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    getOrCreateChatDto: GetOrCreateChatDto,
    @User() user: UserInSession,
  ) {
    const { id } = user;

    return this.chatService.getOrCreateChat({
      ...getOrCreateChatDto,
      users: [...getOrCreateChatDto.users, id],
    });
  }
}
