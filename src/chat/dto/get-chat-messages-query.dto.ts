import { IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class GetChatMessagesQueryDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  offset?: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}
