import { EmailService } from './messaging/email.service';
import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppController {
  constructor(private emailService: EmailService) {}

  @Get()
  getHello() {
    return { message: 'Hello' };
  }
}
