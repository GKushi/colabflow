import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetOrCreateChatDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  users: number[];
}
