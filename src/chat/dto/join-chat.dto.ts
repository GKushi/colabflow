import { IsNotEmpty, IsNumber } from 'class-validator';

export class JoinChatDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
