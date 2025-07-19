import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Status, Priority } from '@prisma/client';

export class EditTaskDto {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  assignedTo?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional()
  description?: string;

  @IsEnum(Priority)
  @IsOptional()
  @ApiPropertyOptional()
  priority?: Priority;

  @IsEnum(Status)
  @IsOptional()
  @ApiPropertyOptional()
  status?: Status;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional()
  deadline?: string;
}
