import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EditProjectDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;
}
