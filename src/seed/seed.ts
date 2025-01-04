import { SeedService } from './seed.service';
import { SeedModule } from './seed.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(SeedModule);
  const seedService = app.get(SeedService);
  await seedService.run();
  await app.close();
}

bootstrap();
