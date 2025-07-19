import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  message: string;
}
