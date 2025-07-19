import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditCommentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  description: string;
}
