import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  CARDS_LIMIT_DEFAULT,
  CARDS_LIMIT_MAX,
  CARDS_PAGE_DEFAULT,
} from '../../../common/constants/app.constants';
export class ListCardsQueryDto {
  @ApiPropertyOptional({ default: CARDS_PAGE_DEFAULT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = CARDS_PAGE_DEFAULT;
  @ApiPropertyOptional({ default: CARDS_LIMIT_DEFAULT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CARDS_LIMIT_MAX)
  limit?: number = CARDS_LIMIT_DEFAULT;
}
