import {
  Notification,
  NotificationResourceType,
  Prisma,
  User,
} from '@prisma/client';
import { ResourceNotFoundException } from '../common/exceptions';
import { UserNotVerifiedException } from '../auth/exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationEmailContent } from './constants';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from './interfaces';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

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
          throw new ResourceNotFoundException('Notification', notificationId);
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
    if (!notification.recipient.emailVerified)
      throw new UserNotVerifiedException(notification.recipient.id);

    const emailContent =
      NotificationEmailContent[notification.type as NotificationType];

    await this.emailService.sendMail({
      recipient: notification.recipient.email,
      subject: emailContent.subject,
      htmlMessage: emailContent.content(
        `${this.configService.get('FRONTEND_URL')}/${notification.resourceType.toLowerCase()}/${notification.resourceId}`,
      ),
    });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async removeNotifications() {
    this.logger.log('Routinely clearing notifications');

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
    this.logger.log('Routinely sending email notifications');

    const notifications = await this.prismaService.notification.findMany({
      where: { emailSent: false, read: false },
      include: { recipient: true },
    });

    for (const notification of notifications) {
      try {
        await this.sendEmailNotification(notification);

        await this.prismaService.notification.update({
          where: { id: notification.id },
          data: { emailSent: true },
        });
      } catch (e) {
        this.logger.error(
          `Failed to send email notification with id: ${notification.id} to ${notification.recipient.email}: ${e}`,
        );
      }
    }
  }
}
