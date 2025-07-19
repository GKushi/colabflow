import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DomainExceptionWsFilter } from '../common/filters/domain-exception-ws.filter';
import { SocketWithSession } from '../auth/interfaces/socket-with-session.interface';
import { ChatAccessWsGuard } from './guards/chat-access-ws.guard';
import { SocketStatusCode } from '../common/socket/status-codes';
import { JoinChatDto, SendMessageDto } from './dto';
import { ChatService } from './chat.service';
import { Server } from 'socket.io';

@UseFilters(DomainExceptionWsFilter)
@UsePipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    whitelist: true,
    exceptionFactory: (errors) => {
      const message = errors
        .map((error) =>
          error.constraints ? Object.values(error.constraints)[0] : undefined,
        )
        .filter((value) => value !== undefined);

      return new WsException({
        error: 'Bad Request',
        statusCode: SocketStatusCode.BAD_REQUEST,
        message,
      });
    },
  }),
)
@WebSocketGateway()
export class ChatGateway implements OnGatewayInit {
  private readonly chatPrefix = 'chat_';
  private readonly logger = new Logger(ChatGateway.name);
  @WebSocketServer() private server: Server;

  constructor(private chatService: ChatService) {}

  afterInit() {
    this.logger.log(`Inited successfully`);
  }

  @UseGuards(ChatAccessWsGuard)
  @SubscribeMessage('join_chat')
  async joinChat(
    @MessageBody()
    joinChatDto: JoinChatDto,
    @ConnectedSocket() socket: SocketWithSession,
  ) {
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }

    await socket.join(`${this.chatPrefix}${joinChatDto.id}`);

    return { event: 'join_chat', data: { success: true } };
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @MessageBody()
    sendMessageDto: SendMessageDto,
    @ConnectedSocket() socket: SocketWithSession,
  ) {
    const room = this.getActiveChatRoom(socket);

    const chatId = this.extractChatIdFromRoom(room);

    const message = await this.chatService.sendMessageToChat(
      chatId,
      socket.session.user!,
      sendMessageDto.message,
    );

    this.server.to(room).emit('message', {
      event: 'message',
      data: message,
    });

    return { event: 'send_message', data: { success: true } };
  }

  private getActiveChatRoom(socket: SocketWithSession): string {
    const rooms = Array.from(socket.rooms).filter((r) =>
      r.startsWith(this.chatPrefix),
    );

    if (rooms.length === 0)
      throw new WsException({
        error: 'Bad Request',
        statusCode: SocketStatusCode.BAD_REQUEST,
        message: 'You are not in any chat',
      });

    if (rooms.length > 1)
      throw new WsException({
        error: 'Bad Request',
        statusCode: SocketStatusCode.BAD_REQUEST,
        message:
          'You are in multiple chats. Please leave one before sending a message.',
      });

    return rooms[0];
  }

  private extractChatIdFromRoom(room: string): number {
    const chatId = room.replace(this.chatPrefix, '');
    const parsedChatId = Number(chatId);

    if (isNaN(parsedChatId))
      throw new WsException({
        error: 'Bad Request',
        statusCode: SocketStatusCode.BAD_REQUEST,
        message: 'Invalid chat room format',
      });

    return parsedChatId;
  }
}
