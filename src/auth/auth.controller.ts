import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Session,
  ValidationPipe,
} from '@nestjs/common';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto';
import { NoVerification } from './decorators/no-verification.decorator';
import { SessionWithUser, UserInSession } from './interfaces';
import { Public } from './decorators/public.decorator';
import { User } from './decorators/user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  async register(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    registerDto: RegisterDto,
  ) {
    await this.authService.register(registerDto);

    return { success: true, message: 'User registered' };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    loginDto: LoginDto,
    @Session() session: SessionWithUser,
  ) {
    const loggedUser = await this.authService.login(loginDto);

    session.user = {
      id: loggedUser.id,
      email: loggedUser.email,
      role: loggedUser.role,
    };

    session.isAuthenticated = true;

    return {
      id: loggedUser.id,
      nickName: loggedUser.nickName,
      email: loggedUser.email,
    };
  }

  @Post('logout')
  @NoVerification()
  @HttpCode(HttpStatus.OK)
  async logout(@Session() session: SessionWithUser) {
    return new Promise<{ success: true; message: string }>((res, rej) => {
      session.destroy((err) => {
        if (err) rej(err);
        res({ success: true, message: 'Logged out' });
      });
    });
  }

  @Get('send-verification-token')
  @NoVerification()
  async sendVerificationToken(@User() user: UserInSession) {
    await this.authService.sendVerificationToken(user.id);

    return { success: true, message: 'Verification token sent' };
  }

  @Get('verify/:token')
  @Public()
  async verify(@Param('token') token: string) {
    await this.authService.verify(token);

    return { success: true, message: 'Email verified' };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    try {
      await this.authService.forgotPassword(forgotPasswordDto);
    } catch (e) {
      if (e instanceof Error) this.logger.error(e.message, e.stack);
    }

    return { success: true, message: 'Password reset token sent' };
  }

  @Post('reset-password/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('token') token: string,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    resetPasswordDto: ResetPasswordDto,
  ) {
    await this.authService.resetPassword(token, resetPasswordDto);

    return { success: true, message: 'Password reset' };
  }

  @Post('change-password')
  @NoVerification()
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @User() user: UserInSession,
    @Body(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }))
    changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(changePasswordDto, user.id);

    return { success: true, message: 'Password changed' };
  }
}
