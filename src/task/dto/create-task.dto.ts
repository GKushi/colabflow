import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { Status, Priority } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @IsNumber()
  @ApiProperty()
  assignedTo: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  description: string;

  @IsEnum(Priority)
  @ApiProperty()
  priority: Priority;

  @IsEnum(Status)
  @ApiProperty()
  status: Status;

  @IsDateString()
  @ApiProperty()
  deadline: string;
}
