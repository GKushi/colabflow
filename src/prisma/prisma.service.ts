import { InvalidConfigurationException } from '../common/exceptions';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch {
      throw new InvalidConfigurationException(
        'Failed to connect to the database',
      );
    }
  }
}
