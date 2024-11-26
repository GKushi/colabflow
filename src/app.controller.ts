import { Controller, Get, Session } from '@nestjs/common';
import { EmailService } from './messaging/email.service';

@Controller('app')
export class AppController {
  constructor(private emailService: EmailService) {}

  @Get()
  getHello(@Session() session: Record<string, any>) {
    console.log(session);
    return session;
  }
}
