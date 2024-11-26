import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  providers: [EmailService],
  imports: [ConfigModule],
  exports: [EmailService],
})
export class MessagingModule {}
