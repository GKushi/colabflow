import { ResourceNotFoundException } from '../common/exceptions';
import { EmailService } from '../notification/email.service';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationTokenType } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { InvalidTokenException } from './exceptions';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let config: ConfigService;

  const userId = 123;
  const userEmail = 'user@test.com';
  const FRONTEND_URL = 'http://frontend.test';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: PrismaService,
          useValue: {
            verificationToken: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(FRONTEND_URL),
          },
        },
      ],
    }).compile();

    service = module.get(VerificationService);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
    config = module.get(ConfigService);
  });

  describe('createAndSendEmailVerificationToken', () => {
    it('creates a new token if none exists and sends email', async () => {
      (prisma.verificationToken.findFirst as jest.Mock).mockResolvedValue(null);
      const fakeToken = {
        id: 1,
        userId,
        token: 'email-token',
        expiresAt: new Date(Date.now() + 10000),
      };
      (prisma.verificationToken.create as jest.Mock).mockResolvedValue(
        fakeToken,
      );

      await service.createAndSendEmailVerificationToken(userId, userEmail);

      expect(prisma.verificationToken.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { gt: expect.any(Date) },
          type: VerificationTokenType.EMAIL_VERIFICATION,
        },
      });

      expect(prisma.verificationToken.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: VerificationTokenType.EMAIL_VERIFICATION,
          expiresAt: expect.any(Date),
          token: expect.any(String),
        },
      });

      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: userEmail,
          subject: 'Verify your email address',
          htmlMessage: expect.stringContaining(
            `${FRONTEND_URL}/verify/${fakeToken.token}`,
          ),
        }),
      );
    });

    it('reuses existing token if not expired', async () => {
      const existing = {
        id: 2,
        userId,
        token: 'existing-token',
        expiresAt: new Date(Date.now() + 5000),
      };
      (prisma.verificationToken.findFirst as jest.Mock).mockResolvedValue(
        existing,
      );

      await service.createAndSendEmailVerificationToken(userId, userEmail);

      expect(prisma.verificationToken.create).not.toHaveBeenCalled();
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlMessage: expect.stringContaining(
            `${FRONTEND_URL}/verify/${existing.token}`,
          ),
        }),
      );
    });
  });

  describe('createAndSendPasswordResetToken', () => {
    it('creates or reuses a PASSWORD_RESET token and sends email', async () => {
      (prisma.verificationToken.findFirst as jest.Mock).mockResolvedValue(null);
      const fakeToken = {
        id: 3,
        userId,
        token: 'reset-token',
        expiresAt: new Date(Date.now() + 10000),
      };
      (prisma.verificationToken.create as jest.Mock).mockResolvedValue(
        fakeToken,
      );

      await service.createAndSendPasswordResetToken(userId, userEmail);

      expect(prisma.verificationToken.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          expiresAt: { gt: expect.any(Date) },
          type: VerificationTokenType.PASSWORD_RESET,
        },
      });
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: userEmail,
          subject: 'Reset your password',
          htmlMessage: expect.stringContaining(
            `${FRONTEND_URL}/reset-password/${fakeToken.token}`,
          ),
        }),
      );
    });
  });

  describe('verifyToken', () => {
    const tokenString = 'verify-me';

    it('deletes and returns userId when token is valid', async () => {
      const found = {
        id: 10,
        userId,
        token: tokenString,
        expiresAt: new Date(Date.now() + 10000),
      };
      (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(
        found,
      );

      const result = await service.verifyToken(tokenString);

      expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: tokenString },
      });
      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: found.id },
      });
      expect(result).toBe(userId);
    });

    it('throws ResourceNotFoundException if token not found', async () => {
      (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.verifyToken('nope')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('throws InvalidTokenException if token expired', async () => {
      const expired = {
        id: 11,
        userId,
        token: tokenString,
        expiresAt: new Date(Date.now() - 10000),
      };
      (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue(
        expired,
      );

      await expect(service.verifyToken(tokenString)).rejects.toThrow(
        InvalidTokenException,
      );
    });
  });

  describe('removeExpiredTokens', () => {
    it('logs and deletes tokens older than now', async () => {
      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => {});
      (prisma.verificationToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      await service.removeExpiredTokens();

      expect(logSpy).toHaveBeenCalledWith(
        'Routinely clearing expired verification tokens',
      );
      expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });
  });
});
