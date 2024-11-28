import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { VerificationService } from './verification.service';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private verificationService: VerificationService,
  ) {}

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  async register(registerDto: RegisterDto) {
    const { password, ...userData } = registerDto;
    const passwordHash = await this.hashPassword(password);
    const createdUser = await this.userService.createUser({
      ...userData,
      passwordHash,
    });

    try {
      await this.verificationService.createAndSendEmailVerificationToken(
        createdUser.id,
        createdUser.email,
      );
    } catch {
      console.error('Failed to send verification token');
    }

    return createdUser;
  }

  async login(loginDto: LoginDto) {
    const foundUser = await this.userService.findUserByEmail(loginDto.email);
    if (!foundUser) throw new UnauthorizedException('Invalid credentials');
    if (
      !(await this.comparePassword(loginDto.password, foundUser.passwordHash))
    )
      throw new UnauthorizedException('Invalid credentials');
    return foundUser;
  }

  async sendVerificationToken(userId: number) {
    const user = await this.userService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified)
      throw new BadRequestException('Email already verified');

    await this.verificationService.createAndSendEmailVerificationToken(
      userId,
      user.email,
    );
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const foundUser = await this.userService.findUserByEmail(
      forgotPasswordDto.email,
    );
    if (!foundUser) throw new NotFoundException('User not found');

    await this.verificationService.createAndSendPasswordResetToken(
      foundUser.id,
      foundUser.email,
    );
  }

  async verify(token: string) {
    const userId = await this.verificationService.verifyToken(token);
    await this.userService.activateUser(userId);
  }

  async resetPassword(token: string, resetPasswordDto: ResetPasswordDto) {
    const userId = await this.verificationService.verifyToken(token);
    await this.userService.updateUser(userId, {
      passwordHash: await this.hashPassword(resetPasswordDto.password),
    });
  }

  async changePassword(changePasswordDto: ChangePasswordDto, userId: number) {
    if (changePasswordDto.newPassword === changePasswordDto.oldPassword)
      throw new BadRequestException(
        'New password cannot be the same as old password',
      );

    const user = await this.userService.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (
      !(await this.comparePassword(
        changePasswordDto.oldPassword,
        user.passwordHash,
      ))
    )
      throw new UnauthorizedException('Invalid credentials');

    await this.userService.updateUser(userId, {
      passwordHash: await this.hashPassword(changePasswordDto.newPassword),
    });
  }
}
