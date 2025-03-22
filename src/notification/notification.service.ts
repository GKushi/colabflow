import {
  Notification,
  NotificationResourceType,
  Prisma,
  User,
} from '@prisma/client';
import {
  NotificationEmailContent,
  NotificationMailingSettings,
} from './constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from './interfaces';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  private readonly notificationExpirationTime = 1000 * 60 * 60 * 24 * 7;

  constructor(
    private prismaService: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async getNotifications(userId: number) {
    const fetchedNotifications = await this.prismaService.notification.findMany(
      {
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
      },
    );

    return fetchedNotifications;
  }

  async createNotifications(
    recipients: number[],
    type: NotificationType,
    resourceId: number,
    resourceType: NotificationResourceType,
  ) {
    for (const recipientId of recipients) {
      await this.createNotification(
        recipientId,
        type,
        resourceId,
        resourceType,
      );
    }
  }

  createNotification(
    recipientId: number,
    type: NotificationType,
    resourceId: number,
    resourceType: NotificationResourceType,
  ) {
    return this.prismaService.notification.create({
      data: {
        recipientId,
        type,
        resourceId,
        resourceType,
      },
    });
  }

  async readNotification(notificationId: number, userId: number) {
    try {
      return await this.prismaService.notification.update({
        where: { id: notificationId, recipientId: userId },
        data: { read: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Notification with this id not found');
      }

      throw e;
    }
  }

  readAllNotifications(userId: number) {
    return this.prismaService.notification.updateMany({
      where: { recipientId: userId },
      data: { read: true },
    });
  }

  async sendEmailNotification(
    notification: Notification & { recipient: User },
  ) {
    if (!notification.recipient.emailVerified) return false;

    const emailContent =
      NotificationEmailContent[notification.type as NotificationType];

    try {
      await this.emailService.sendMail({
        recipient: notification.recipient.email,
        subject: emailContent.subject,
        htmlMessage: emailContent.content(
          `${this.configService.get('FRONTEND_URL')}/${notification.resourceType.toLowerCase()}/${notification.resourceId}`,
        ),
      });

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async removeNotifications() {
    await this.prismaService.notification.deleteMany({
      where: {
        OR: [
          { read: true },
          { emailSent: true },
          {
            createdAt: {
              lte: new Date(Date.now() - this.notificationExpirationTime),
            },
          },
        ],
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendEmailNotifications() {
    const notifications = await this.prismaService.notification.findMany({
      where: { emailSent: false, read: false },
      include: { recipient: true },
    });

    for (const notification of notifications) {
      const success = await this.sendEmailNotification(notification);
      if (!success) continue;
      await this.prismaService.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    }
  }
}
