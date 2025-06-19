import { Public } from '../auth/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  @Public()
  healthCheck() {
    return { status: 'ok' };
  }
}
