import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditChatDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;
}
