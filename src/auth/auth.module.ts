import { NotificationModule } from '../notification/notification.module';
import { VerificationService } from './verification.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [AuthService, VerificationService],
  controllers: [AuthController],
  imports: [UserModule, NotificationModule, ConfigModule],
})
export class AuthModule {}
