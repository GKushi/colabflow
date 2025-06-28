import { PrismaService } from '../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { GetOrCreateChatDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(private prismaService: PrismaService) {}

  async getOrCreateChat(getOrCreateChatDto: GetOrCreateChatDto) {
    const users = getOrCreateChatDto.users;
    const usersLen = users.length;
    const chats = (await this.prismaService.$queryRaw`
      SELECT "c2"."chatId"
      FROM (SELECT "chatId" FROM "ChatUser" WHERE "userId" in (${Prisma.join(users)}) GROUP BY "chatId" HAVING COUNT(*) = ${usersLen}) c
      JOIN "ChatUser" c2 ON c2."chatId" = c."chatId" GROUP BY c2."chatId" HAVING COUNT(*) = ${usersLen};
    `) as { chatId: number }[];
    this.logger.log(`Found chat: ${JSON.stringify(chats)}`);

    if (chats.length > 0) {
      const chat = await this.prismaService.chat.findFirst({
        where: { id: chats[0].chatId },
      });
      return chat;
    }

    const newChat = await this.prismaService.chat.create({
      data: {
        name: getOrCreateChatDto.name,
        users: { create: users.map((user) => ({ userId: user })) },
      },
    });

    return newChat;
  }
}
