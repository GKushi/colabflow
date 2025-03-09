import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  providers: [EmailService, NotificationService],
  imports: [ConfigModule],
  exports: [EmailService, NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
