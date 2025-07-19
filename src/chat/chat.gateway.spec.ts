import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;
  let mockSocket: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: {
            sendMessageToChat: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get(ChatGateway);
    chatService = module.get(ChatService);

    // Mock socket object
    mockSocket = {
      id: 'socket1',
      rooms: new Set<string>(['socket1']),
      join: jest.fn(),
      leave: jest.fn(),
      session: { user: { id: 10, email: 'test@x.com' } },
    };

    // Mock the WebSocket server
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };
  });

  describe('joinChat', () => {
    it('joins a chat room and leaves other rooms', async () => {
      mockSocket.rooms.add('chat_1');

      const result = await gateway.joinChat({ id: 2 }, mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('chat_1');
      expect(mockSocket.join).toHaveBeenCalledWith('chat_2');
      expect(result).toEqual({ event: 'join_chat', data: { success: true } });
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      mockSocket.rooms.add('chat_1');
    });

    it('sends message to the correct chat room', async () => {
      const mockMessage = { id: 100, description: 'Hello' };
      (chatService.sendMessageToChat as jest.Mock).mockResolvedValue(
        mockMessage,
      );

      const result = await gateway.sendMessage(
        { message: 'Hello' },
        mockSocket,
      );

      expect(chatService.sendMessageToChat).toHaveBeenCalledWith(
        1,
        mockSocket.session.user,
        'Hello',
      );

      expect((gateway as any).server.to).toHaveBeenCalledWith('chat_1');
      expect(result).toEqual({
        event: 'send_message',
        data: { success: true },
      });
    });

    it('throws if no chat room', async () => {
      mockSocket.rooms = new Set(['socket1']);

      await expect(
        gateway.sendMessage({ message: 'Test' }, mockSocket),
      ).rejects.toThrow(WsException);
    });

    it('throws if in multiple chat rooms', async () => {
      mockSocket.rooms.add('chat_1');
      mockSocket.rooms.add('chat_2');

      await expect(
        gateway.sendMessage({ message: 'Test' }, mockSocket),
      ).rejects.toThrow(WsException);
    });
  });

  describe('extractChatIdFromRoom', () => {
    it('extracts chat id correctly', () => {
      const chatId = (gateway as any).extractChatIdFromRoom('chat_42');
      expect(chatId).toBe(42);
    });

    it('throws on invalid room name', () => {
      expect(() =>
        (gateway as any).extractChatIdFromRoom('chat_invalid'),
      ).toThrow(WsException);
    });
  });

  describe('getActiveChatRoom', () => {
    it('returns active chat room', () => {
      mockSocket.rooms.add('chat_5');
      const room = (gateway as any).getActiveChatRoom(mockSocket);
      expect(room).toBe('chat_5');
    });

    it('throws if no active chat', () => {
      mockSocket.rooms = new Set(['socket1']);
      expect(() => (gateway as any).getActiveChatRoom(mockSocket)).toThrow(
        WsException,
      );
    });

    it('throws if multiple chat rooms', () => {
      mockSocket.rooms.add('chat_1');
      mockSocket.rooms.add('chat_2');
      expect(() => (gateway as any).getActiveChatRoom(mockSocket)).toThrow(
        WsException,
      );
    });
  });
});
