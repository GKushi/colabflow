import { StorageService } from '../file/storage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { SeedService } from './seed.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [SeedService, StorageService],
})
export class SeedModule {}
