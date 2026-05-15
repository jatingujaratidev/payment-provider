import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { sanitizeString } from '../../../common/utils/string-sanitize.util';
export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }): string =>
    typeof value === 'string' ? sanitizeString(value).toLowerCase() : '',
  )
  @IsEmail()
  email!: string;
  @ApiProperty({ example: 'Str0ng!Pass' })
  @IsString()
  @MinLength(8)
  password!: string;
}
