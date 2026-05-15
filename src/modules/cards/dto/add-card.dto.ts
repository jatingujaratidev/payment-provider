import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { sanitizeString } from '../../../common/utils/string-sanitize.util';
export class AddCardDto {
  @ApiProperty({ example: 'Jane Doe' })
  @Transform(({ value }): string =>
    typeof value === 'string' ? sanitizeString(value) : '',
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  cardholder_name!: string;
  @ApiProperty({
    description: 'Primary Account Number (digits only or spaced)',
    example: '4111111111111111',
  })
  @IsString()
  @MinLength(13)
  @MaxLength(23)
  card_number!: string;
  @ApiProperty({ example: '12' })
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'expiry_month must be MM' })
  expiry_month!: string;
  @ApiProperty({ example: '2028' })
  @Matches(/^\d{4}$/, { message: 'expiry_year must be YYYY' })
  expiry_year!: string;
}
