import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule],
})
export class AppModule {}
