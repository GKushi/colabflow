import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { NotificationModule } from './notification/notification.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Logger, MiddlewareConsumer, Module } from '@nestjs/common';
import { LoggerMiddleware } from './common/logging.middleware';
import { ProjectModule } from './project/project.module';
import { CommentModule } from './comment/comment.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { RoleGuard } from './auth/guards/role.guard';
import { AuthGuard } from './auth/guards/auth.guard';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { SeedModule } from './seed/seed.module';
import { FileModule } from './file/file.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    UserModule,
    AuthModule,
    NotificationModule,
    ScheduleModule.forRoot(),
    ProjectModule,
    SeedModule,
    TaskModule,
    CommentModule,
    FileModule,
    HealthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 1000,
          limit: 3,
        },
      ],
    }),
    ChatModule,
  ],
  providers: [
    Logger,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
