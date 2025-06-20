import { ResourceNotFoundException } from '../common/exceptions';
import { UserNotVerifiedException } from '../auth/exceptions';
import { NotificationService } from './notification.service';
import { NotificationResourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEmailContent } from './constants';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from './interfaces';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;

  const notificationMock = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const prismaMock: Partial<PrismaService> = {
    notification: notificationMock as any,
  };

  const emailServiceMock = { sendMail: jest.fn() };
  const configServiceMock = {
    get: jest.fn((key: string) =>
      key === 'FRONTEND_URL' ? 'https://app.test' : '',
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    notificationMock.findMany.mockResolvedValue([]);
    notificationMock.create.mockResolvedValue({} as any);
    notificationMock.update.mockResolvedValue({} as any);
    notificationMock.updateMany.mockResolvedValue({ count: 0 } as any);
    notificationMock.deleteMany.mockResolvedValue({ count: 0 } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('getNotifications', () => {
    it('returns notifications for the user', async () => {
      const fake = [{ id: 1 }, { id: 2 }];
      notificationMock.findMany.mockResolvedValue(fake as any);
      const result = await service.getNotifications(42);
      expect(notificationMock.findMany).toHaveBeenCalledWith({
        where: { recipientId: 42 },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(fake);
    });
  });

  describe('createNotifications', () => {
    it('calls createNotification for each recipient', async () => {
      const recipients = [5, 6, 7];
      const spy = jest
        .spyOn(service, 'createNotification')
        .mockResolvedValue({} as any);
      await service.createNotifications(
        recipients,
        NotificationType.TaskAssigned,
        10,
        'Task',
      );
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith(
        5,
        NotificationType.TaskAssigned,
        10,
        'Task',
      );
      expect(spy).toHaveBeenCalledWith(
        6,
        NotificationType.TaskAssigned,
        10,
        'Task',
      );
      expect(spy).toHaveBeenCalledWith(
        7,
        NotificationType.TaskAssigned,
        10,
        'Task',
      );
    });
  });

  describe('createNotification', () => {
    it('creates a notification record', async () => {
      await service.createNotification(
        8,
        NotificationType.ProjectChanged,
        3,
        'Project' as NotificationResourceType,
      );
      expect(notificationMock.create).toHaveBeenCalledWith({
        data: {
          recipientId: 8,
          type: NotificationType.ProjectChanged,
          resourceId: 3,
          resourceType: 'Project',
        },
      });
    });
  });

  describe('readNotification', () => {
    it('marks notification read', async () => {
      notificationMock.update.mockResolvedValue({ id: 9, read: true } as any);
      const result = await service.readNotification(9, 42);
      expect(notificationMock.update).toHaveBeenCalledWith({
        where: { id: 9, recipientId: 42 },
        data: { read: true },
      });
      expect(result).toEqual({ id: 9, read: true });
    });

    it('throws ResourceNotFoundException on P2025', async () => {
      const err: any = new Error('not found');
      err.code = 'P2025';
      Object.setPrototypeOf(
        err,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );
      notificationMock.update.mockRejectedValue(err);
      await expect(service.readNotification(5, 6)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('readAllNotifications', () => {
    it('marks all notifications read', async () => {
      await service.readAllNotifications(13);
      expect(notificationMock.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 13 },
        data: { read: true },
      });
    });
  });

  describe('sendEmailNotification', () => {
    const base = {
      id: 1,
      resourceType: 'Task' as NotificationResourceType,
      resourceId: 99,
      type: NotificationType.TaskAssigned,
    };
    it('throws if recipient email not verified', async () => {
      const notification = {
        ...base,
        recipient: { id: 7, emailVerified: false, email: 'x@x.com' },
      } as any;
      await expect(service.sendEmailNotification(notification)).rejects.toThrow(
        UserNotVerifiedException,
      );
    });

    it('sends an email with correct content', async () => {
      const template = NotificationEmailContent[NotificationType.TaskAssigned];
      const notification = {
        ...base,
        recipient: { id: 7, emailVerified: true, email: 'x@x.com' },
      } as any;

      await service.sendEmailNotification(notification);

      expect(emailServiceMock.sendMail).toHaveBeenCalledWith({
        recipient: 'x@x.com',
        subject: template.subject,
        htmlMessage: template.content(
          `https://app.test/${base.resourceType.toLowerCase()}/${base.resourceId}`,
        ),
      });
    });
  });

  describe('removeNotifications', () => {
    it('deletes read, emailed, or expired notifications', async () => {
      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => {});
      await service.removeNotifications();
      expect(logSpy).toHaveBeenCalledWith('Routinely clearing notifications');
      expect(notificationMock.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { read: true },
            { emailSent: true },
            { createdAt: { lte: expect.any(Date) } },
          ],
        },
      });
    });
  });

  describe('sendEmailNotifications', () => {
    it('sends emails and marks sent', async () => {
      const notifications = [
        {
          id: 1,
          emailSent: false,
          read: false,
          recipient: { id: 2, emailVerified: true, email: 'a@a.com' },
          type: NotificationType.ProjectChanged,
          resourceType: 'Project' as NotificationResourceType,
          resourceId: 10,
        },
        {
          id: 2,
          emailSent: false,
          read: false,
          recipient: { id: 3, emailVerified: true, email: 'b@b.com' },
          type: NotificationType.TaskChanged,
          resourceType: 'Task' as NotificationResourceType,
          resourceId: 20,
        },
      ];
      notificationMock.findMany.mockResolvedValue(notifications as any);

      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      await service.sendEmailNotifications();

      expect(notificationMock.findMany).toHaveBeenCalledWith({
        where: { emailSent: false, read: false },
        include: { recipient: true },
      });

      for (const n of notifications) {
        expect(emailServiceMock.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            recipient: n.recipient.email,
          }),
        );
        expect(notificationMock.update).toHaveBeenCalledWith({
          where: { id: n.id },
          data: { emailSent: true },
        });
      }
    });

    it('logs errors and continues on failure', async () => {
      const good = {
        id: 3,
        emailSent: false,
        read: false,
        recipient: { id: 4, emailVerified: true, email: 'c@c.com' },
        type: NotificationType.ProjectChanged,
        resourceType: 'Project' as NotificationResourceType,
        resourceId: 30,
      } as any;
      const bad = {
        id: 4,
        emailSent: false,
        read: false,
        recipient: { id: 5, emailVerified: true, email: 'd@d.com' },
        type: NotificationType.TaskAssigned,
        resourceType: 'Task' as NotificationResourceType,
        resourceId: 40,
      } as any;
      notificationMock.findMany.mockResolvedValue([good, bad] as any);
      emailServiceMock.sendMail
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('SMTP error'));

      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      await service.sendEmailNotifications();

      expect(notificationMock.update).toHaveBeenCalledWith({
        where: { id: good.id },
        data: { emailSent: true },
      });
      expect(errorSpy).toHaveBeenCalledWith(
        `Failed to send email notification with id: ${bad.id} to ${bad.recipient.email}: Error: SMTP error`,
      );
      expect(notificationMock.update).not.toHaveBeenCalledWith({
        where: { id: bad.id },
        data: { emailSent: true },
      });
    });
  });
});
