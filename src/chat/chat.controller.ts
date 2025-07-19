import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { GetChatMessagesQueryDto } from './dto/get-chat-messages-query.dto';
import { ChatAccessGuard } from './guards/chat-access.guard';
import { User } from '../auth/decorators/user.decorator';
import { UserMapper } from '../user/mappers/user.mapper';
import { EditChatDto, GetOrCreateChatDto } from './dto';
import { UserInSession } from '../auth/interfaces';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  async getChats(@User() user: UserInSession) {
    const { id } = user;

    const chats = await this.chatService.getUserChats(id);

    return chats;
  }

  @UseGuards(ChatAccessGuard)
  @Get(':id')
  async getChat(@Param('id', ParseIntPipe) id: number) {
    const chat = await this.chatService.getChatById(id);

    return {
      ...chat,
      users: UserMapper.multipleToPublic(chat.users),
    };
  }

  @Post()
  async getOrCreateChat(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    getOrCreateChatDto: GetOrCreateChatDto,
    @User() user: UserInSession,
  ) {
    const { id } = user;

    const chat = await this.chatService.getOrCreateChat({
      ...getOrCreateChatDto,
      users: [...getOrCreateChatDto.users, id],
    });

    return {
      ...chat,
      users: UserMapper.multipleToPublic(chat.users),
    };
  }

  @UseGuards(ChatAccessGuard)
  @Patch(':id')
  async editChat(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    editChatDto: EditChatDto,
  ) {
    return this.chatService.editChat(id, editChatDto);
  }

  @UseGuards(ChatAccessGuard)
  @Get(':id/messages')
  async getChatMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    getChatMessagesQueryDto: GetChatMessagesQueryDto,
  ) {
    const messages = await this.chatService.getChatMessages(
      id,
      getChatMessagesQueryDto,
    );

    return messages.map((message) => ({
      ...message,
      createdById: undefined,
      chatId: undefined,
      createdBy: UserMapper.toPublic(message.createdBy),
    }));
  }
}
