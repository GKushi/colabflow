import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Session,
  ValidationPipe,
} from '@nestjs/common';
import { NoVerification } from './decorators/no-verification.decorator';
import { SessionWithUser, UserInSession } from './interfaces';
import { VerificationService } from './verification.service';
import { Public } from './decorators/public.decorator';
import { User } from './decorators/user.decorator';
import { LoginDto, RegisterDto } from './dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
  ) {}

  @Post('register')
  @Public()
  async register(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true }))
    registerDto: RegisterDto,
  ) {
    const createdUser = await this.authService.register(registerDto);
    return {
      id: createdUser.id,
      nickName: createdUser.nickName,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      email: createdUser.email,
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true }))
    loginDto: LoginDto,
    @Session() session: SessionWithUser,
  ) {
    const loggedUser = await this.authService.login(loginDto);

    session.user = {
      id: loggedUser.id,
      email: loggedUser.email,
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Session() session: SessionWithUser) {
    return new Promise<{ message: string }>((res, rej) => {
      session.destroy((err) => {
        if (err) rej(err);
        res({ message: 'Logged out' });
      });
    });
  }

  @Get('send-verification-token')
  @NoVerification()
  async sendVerificationToken(@User() user: UserInSession) {
    await this.verificationService.createAndSendToken(user.id);
    return { message: 'Verification token sent' };
  }

  @Get('verify/:token')
  @Public()
  async verify(@Param('token') token: string) {
    await this.verificationService.verifyToken(token);
    return { message: 'Email verified' };
  }
}
