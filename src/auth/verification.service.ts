import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmailService } from '../messaging/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class VerificationService {
  private readonly tokenExpirationTime = 1000 * 60 * 10;

  constructor(
    private prismaService: PrismaService,
    private emailService: EmailService,
    private userService: UserService,
    private configService: ConfigService,
  ) {}

  private async createToken(userId: number) {
    return this.prismaService.verificationToken.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + this.tokenExpirationTime),
        token: randomUUID(),
      },
    });
  }

  private async getOrCreateToken(userId: number) {
    let token = await this.prismaService.verificationToken.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (!token) token = await this.createToken(userId);

    return token;
  }

  async createAndSendToken(userId: number) {
    const user = await this.userService.findUserById(userId);

    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified)
      throw new BadRequestException('Email already verified');

    const token = await this.getOrCreateToken(userId);

    this.emailService.sendMail({
      recipient: user.email,
      subject: 'Verify your email address',
      htmlMessage: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">Email Verification</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for signing up! To complete your registration and verify your email address, please click the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get('APP_URL')}/auth/verify/${token.token}" 
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

  async verifyToken(token: string) {
    const foundToken = await this.prismaService.verificationToken.findUnique({
      where: { token },
    });

    if (!foundToken) throw new NotFoundException('Invalid token');

    if (foundToken.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    await this.userService.activateUser(foundToken.userId);
    await this.prismaService.verificationToken.delete({
      where: { id: foundToken.id },
    });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  removeExpiredTokens() {
    this.prismaService.verificationToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
