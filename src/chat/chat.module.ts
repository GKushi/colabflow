import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { UserModule } from 'src/user/user.module';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

@Module({
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  imports: [UserModule],
})
export class ChatModule {}
