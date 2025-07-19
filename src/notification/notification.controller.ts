import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { User } from '../auth/decorators/user.decorator';
import { UserInSession } from '../auth/interfaces';
import { ApiCookieAuth } from '@nestjs/swagger';

@ApiCookieAuth()
@Controller('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  async getNotifications(@User() user: UserInSession) {
    const notifications = await this.notificationService.getNotifications(
      user.id,
    );

    return notifications.map((notification) => ({
      ...notification,
      emailSent: undefined,
      recipientId: undefined,
    }));
  }

  @Patch()
  async readAllNotifications(@User() user: UserInSession) {
    await this.notificationService.readAllNotifications(user.id);

    return {
      success: true,
      message: 'All notifications successfully marked as read',
    };
  }

  @Patch(':id')
  async readNotification(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserInSession,
  ) {
    const notification = await this.notificationService.readNotification(
      id,
      user.id,
    );

    return { ...notification, emailSent: undefined, recipientId: undefined };
  }
}
