import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsISO4217CurrencyCode,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
export class CreatePaymentDto {
  @ApiProperty({ description: 'Opaque card token', example: 'a1b2c3deadbeef' })
  @IsString()
  card_token!: string;
  @ApiProperty({ example: 19.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Max(999999999.99)
  amount!: number;
  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.toUpperCase() : '',
  )
  @IsISO4217CurrencyCode()
  currency?: string;
  @ApiPropertyOptional({
    description: 'Optional if Idempotency-Key header is provided',
  })
  @IsOptional()
  @IsUUID('4')
  idempotency_key?: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
