import {
  PermissionDeniedException,
  ResourceNotFoundException,
} from '../common/exceptions';
import { UserNotVerifiedException } from '../auth/exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user/user.service';
import { ChatService } from './chat.service';
import { Prisma } from '@prisma/client';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;
  let userService: UserService;

  const mockChat = {
    id: 1,
    name: 'Test Chat',
    users: [{ user: { id: 10 } }, { user: { id: 20 } }],
  };

  const mockMessage = {
    id: 100,
    chatId: 1,
    createdById: 10,
    description: 'Hello',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: {
            chat: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            checkIfUserVerified: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ChatService);
    prisma = module.get(PrismaService);
    userService = module.get(UserService);
  });

  describe('checkAccess', () => {
    it('allows access for chat members', async () => {
      jest.spyOn(service, 'getChatById').mockResolvedValue(mockChat as any);
      await expect(
        service.checkAccess({ id: 10 } as any, 1),
      ).resolves.toBeUndefined();
    });

    it('denies access for non-members', async () => {
      jest.spyOn(service, 'getChatById').mockResolvedValue(mockChat as any);
      await expect(service.checkAccess({ id: 999 } as any, 1)).rejects.toThrow(
        PermissionDeniedException,
      );
    });
  });

  describe('getUserChats', () => {
    it('returns user chats', async () => {
      (prisma.chat.findMany as jest.Mock).mockResolvedValue([mockChat]);
      const chats = await service.getUserChats(10);
      expect(prisma.chat.findMany).toHaveBeenCalledWith({
        where: { users: { some: { userId: 10 } } },
      });
      expect(chats).toEqual([mockChat]);
    });
  });

  describe('getChatById', () => {
    it('returns chat if found', async () => {
      (prisma.chat.findFirst as jest.Mock).mockResolvedValue(mockChat);
      const chat = await service.getChatById(1);
      expect(chat).toEqual(mockChat);
    });

    it('throws ResourceNotFoundException if not found', async () => {
      (prisma.chat.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.getChatById(999)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('getOrCreateChat', () => {
    it('returns existing chat if found', async () => {
      jest.spyOn(service as any, 'getChatByUsers').mockResolvedValue(mockChat);
      const result = await service.getOrCreateChat({ users: [10, 20] });
      expect(result).toEqual(mockChat);
    });

    it('creates new chat if none exists', async () => {
      jest.spyOn(service as any, 'getChatByUsers').mockResolvedValue(null);
      (userService.checkIfUserVerified as jest.Mock).mockResolvedValue(true);
      (prisma.chat.create as jest.Mock).mockResolvedValue(mockChat);

      const result = await service.getOrCreateChat({
        users: [10, 20],
        name: 'New Chat',
      });
      expect(prisma.chat.create).toHaveBeenCalled();
      expect(result).toEqual(mockChat);
    });

    it('throws UserNotVerifiedException if any user not verified', async () => {
      jest.spyOn(service as any, 'getChatByUsers').mockResolvedValue(null);
      (userService.checkIfUserVerified as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.getOrCreateChat({ users: [10, 20], name: 'Chat' }),
      ).rejects.toThrow(UserNotVerifiedException);
    });
  });

  describe('editChat', () => {
    it('updates chat', async () => {
      (prisma.chat.update as jest.Mock).mockResolvedValue({
        ...mockChat,
        name: 'Updated',
      });
      const result = await service.editChat(1, { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(prisma.chat.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated' },
      });
    });
  });

  describe('sendMessageToChat', () => {
    it('sends message when access allowed', async () => {
      jest.spyOn(service, 'getChatById').mockResolvedValue(mockChat as any);
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);
      const result = await service.sendMessageToChat(
        1,
        { id: 10 } as any,
        'Hello',
      );
      expect(result).toEqual(mockMessage);
    });
  });

  describe('getChatMessages', () => {
    it('fetches chat messages', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);
      const result = await service.getChatMessages(1, { limit: 20, offset: 0 });
      expect(result).toEqual([mockMessage]);
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { chatId: 1 },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        include: { createdBy: true },
      });
    });
  });

  describe('getChatByUsers', () => {
    it('returns null if no chat exists', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
      const result = await (service as any).getChatByUsers([10, 20]);
      expect(result).toBeNull();
    });

    it('returns chat if found', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ chatId: 1 }]);
      jest.spyOn(service, 'getChatById').mockResolvedValue(mockChat as any);
      const result = await (service as any).getChatByUsers([10, 20]);
      expect(result).toEqual(mockChat);
    });
  });
});
