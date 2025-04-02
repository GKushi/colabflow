import {
  InvalidCredentialsException,
  PasswordUnchangedException,
  UserAlreadyVerifiedException,
} from './exceptions';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { ResourceNotFoundException } from '../common/exceptions';
import { VerificationService } from './verification.service';
import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    this.logger.log(`Registering new user: ${registerDto.nickName}`);

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
      this.logger.error(
        `Failed to send verification token while registering user: ${createdUser.id}`,
      );
    }

    return createdUser;
  }

  async login(loginDto: LoginDto) {
    const foundUser = await this.userService.findUserByEmail(loginDto.email);

    if (!foundUser) throw new InvalidCredentialsException();

    if (
      !(await this.comparePassword(loginDto.password, foundUser.passwordHash))
    )
      throw new InvalidCredentialsException();

    return foundUser;
  }

  async sendVerificationToken(userId: number) {
    this.logger.log(`Sending verification token to user: ${userId}`);

    const user = await this.userService.findUserById(userId);

    if (!user) throw new ResourceNotFoundException('User', userId);

    if (user.emailVerified) throw new UserAlreadyVerifiedException(userId);

    await this.verificationService.createAndSendEmailVerificationToken(
      userId,
      user.email,
    );
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(
      `Sending password reset token to: ${forgotPasswordDto.email}`,
    );

    const foundUser = await this.userService.findUserByEmail(
      forgotPasswordDto.email,
    );

    if (!foundUser) throw new ResourceNotFoundException('User');

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
    this.logger.log(`Resetting password for user with token: ${token}`);

    const userId = await this.verificationService.verifyToken(token);

    await this.userService.updateUser(userId, {
      passwordHash: await this.hashPassword(resetPasswordDto.password),
    });
  }

  async changePassword(changePasswordDto: ChangePasswordDto, userId: number) {
    this.logger.log(`Changing password for user: ${userId}`);

    if (changePasswordDto.newPassword === changePasswordDto.oldPassword)
      throw new PasswordUnchangedException();

    const user = await this.userService.findUserById(userId);

    if (!user) throw new ResourceNotFoundException('User', userId);

    if (
      !(await this.comparePassword(
        changePasswordDto.oldPassword,
        user.passwordHash,
      ))
    )
      throw new InvalidCredentialsException();

    await this.userService.updateUser(userId, {
      passwordHash: await this.hashPassword(changePasswordDto.newPassword),
    });
  }
}
