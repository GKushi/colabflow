import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { Status, Priority } from '@prisma/client';

export class CreateTaskDto {
  @IsNumber()
  project: number;

  @IsNumber()
  assignedTo: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsEnum(Status)
  status: Status;

  @IsDateString()
  deadline: string;
}
