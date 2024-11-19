import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Session,
  ValidationPipe,
} from '@nestjs/common';
import { SessionWithUser } from './interface';
import { LoginDto, RegisterDto } from './dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
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
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ValidationPipe({ forbidNonWhitelisted: true }))
    loginDto: LoginDto,
    @Session() session: Record<string, any>,
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Session() session: SessionWithUser) {
    return new Promise<void>((res, rej) => {
      session.destroy((err) => {
        if (err) rej(err);
        res();
      });
    });
  }
}
