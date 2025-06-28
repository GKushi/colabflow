import { ChatController } from './chat.controller';
import { UserModule } from 'src/user/user.module';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Module } from '@nestjs/common';

@Module({
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  imports: [UserModule],
})
export class ChatModule {}
