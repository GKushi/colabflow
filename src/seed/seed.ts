import { SeedService } from './seed.service';
import { SeedModule } from './seed.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(SeedModule);
  const seedService = app.get(SeedService);
  const withFiles = process.argv.includes('files');
  await seedService.run(withFiles);
  await app.close();
}

bootstrap();
