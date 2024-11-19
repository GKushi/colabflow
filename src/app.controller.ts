import { Controller, Get, Session, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';

@Controller('app')
export class AppController {
  @Get()
  @UseGuards(AuthGuard)
  getHello(@Session() session: Record<string, any>) {
    console.log(session);
    return session;
  }
}
