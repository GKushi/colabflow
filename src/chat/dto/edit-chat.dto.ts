import { IsNotEmpty, IsString } from 'class-validator';

export class EditChatDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
