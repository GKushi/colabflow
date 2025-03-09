import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmailService } from '../notification/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VerificationTokenType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class VerificationService {
  private readonly tokenExpirationTime = 1000 * 60 * 10;

  constructor(
    private prismaService: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  private async getOrCreateToken(userId: number, type: VerificationTokenType) {
    let token = await this.prismaService.verificationToken.findFirst({
      where: { userId, expiresAt: { gt: new Date() }, type },
    });

    if (!token)
      token = await this.prismaService.verificationToken.create({
        data: {
          userId,
          type,
          expiresAt: new Date(Date.now() + this.tokenExpirationTime),
          token: randomUUID(),
        },
      });

    return token;
  }

  async createAndSendEmailVerificationToken(userId: number, userEmail: string) {
    const token = await this.getOrCreateToken(
      userId,
      VerificationTokenType.EMAIL_VERIFICATION,
    );

    await this.emailService.sendMail({
      recipient: userEmail,
      subject: 'Verify your email address',
      htmlMessage: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">Email Verification</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for signing up! To complete your registration and verify your email address, please click the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/verify/${token.token}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you did not create an account, you can safely ignore this email.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This verification link will expire in 10 minutes.
          </p>
        </div>
      `,
    });
  }

  async createAndSendPasswordResetToken(userId: number, userEmail: string) {
    const token = await this.getOrCreateToken(
      userId,
      VerificationTokenType.PASSWORD_RESET,
    );

    await this.emailService.sendMail({
      recipient: userEmail,
      subject: 'Reset your password',
      htmlMessage: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">Password Reset</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            To reset your password, please click the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('FRONTEND_URL')}/reset-password/${token.token}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This password reset link will expire in 10 minutes.
          </p>
        </div>
      `,
    });
  }

  async verifyToken(token: string) {
    const foundToken = await this.prismaService.verificationToken.findUnique({
      where: { token },
    });

    if (!foundToken) throw new NotFoundException('Invalid token');

    if (foundToken.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    await this.prismaService.verificationToken.delete({
      where: { id: foundToken.id },
    });

    return foundToken.userId;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async removeExpiredTokens() {
    await this.prismaService.verificationToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
