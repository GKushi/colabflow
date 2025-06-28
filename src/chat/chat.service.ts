import {
  PermissionDeniedException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { UserNotVerifiedException } from '../auth/exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { EditChatDto, GetOrCreateChatDto } from './dto';
import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserInSession } from '../auth/interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prismaService: PrismaService,
    private userService: UserService,
  ) {}

  async checkAccess(user: UserInSession, chatId: number) {
    const chat = await this.getChatById(chatId);

    if (!chat.users.some((el) => el.user.id === user.id))
      throw new PermissionDeniedException(
        'You are not allowed to access this chat',
      );
  }

  async getUserChats(userId: number) {
    const chats = await this.prismaService.chat.findMany({
      where: { users: { some: { userId: userId } } },
    });

    return chats;
  }

  async getChatById(id: number) {
    const chat = await this.prismaService.chat.findFirst({
      where: { id: id },
      include: { users: { select: { user: true } } },
    });

    if (!chat) throw new ResourceNotFoundException('Chat', id);
    return chat;
  }

  async getOrCreateChat(getOrCreateChatDto: GetOrCreateChatDto) {
    const users = Array.from(new Set(getOrCreateChatDto.users));
    const existingChat = await this.getChatByUsers(users);

    if (existingChat) {
      this.logger.log(
        `Found existing chat with id: ${existingChat.id}, for users: ${JSON.stringify(users)}`,
      );
      return existingChat;
    }

    const newChat = await this.createChat({ ...getOrCreateChatDto, users });

    return newChat;
  }

  async editChat(id: number, editChatDto: EditChatDto) {
    const editedChat = await this.prismaService.chat.update({
      where: { id },
      data: editChatDto,
    });

    return editedChat;
  }

  private async createChat(getOrCreateChatDto: GetOrCreateChatDto) {
    for (const user of getOrCreateChatDto.users) {
      const verified = await this.userService.checkIfUserVerified(user);
      if (!verified) throw new UserNotVerifiedException(user);
    }

    return this.prismaService.chat.create({
      data: {
        name: getOrCreateChatDto.name,
        users: {
          create: getOrCreateChatDto.users.map((user) => ({ userId: user })),
        },
      },
      include: { users: { select: { user: true } } },
    });
  }

  private async getChatByUsers(users: number[]) {
    const usersLen = users.length;

    const chats = (await this.prismaService.$queryRaw`
      SELECT "c2"."chatId"
      FROM (SELECT "chatId" FROM "ChatUser" WHERE "userId" in (${Prisma.join(users)}) GROUP BY "chatId" HAVING COUNT(*) = ${usersLen}) c
      JOIN "ChatUser" c2 ON c2."chatId" = c."chatId" GROUP BY c2."chatId" HAVING COUNT(*) = ${usersLen};
    `) as { chatId: number }[];

    if (chats.length === 0) return null;

    return this.getChatById(chats[0].chatId);
  }
}
