import { IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @IsStrongPassword()
  @ApiProperty()
  password: string;
}
