import { PrismaModule } from '../prisma/prisma.module';
import { SeedService } from './seed.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  providers: [SeedService],
})
export class SeedModule {}
