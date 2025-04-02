import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { PrismaClient } from '@prisma/client';
import { WinstonModule } from 'nest-winston';
import { transports, format } from 'winston';
import * as session from 'express-session';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      level: 'info',
      format: format.combine(format.timestamp(), format.json()),
      transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.Console(),
      ],
    }),
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'example-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24h
      },
      store: new PrismaSessionStore(new PrismaClient(), {
        checkPeriod: 2 * 60 * 1000, //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }),
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
