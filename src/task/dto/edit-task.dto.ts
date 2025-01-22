import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Status, Priority } from '@prisma/client';

export class EditTaskDto {
  @IsNumber()
  @IsOptional()
  assignedTo?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
