import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { sanitizeString } from '../../../common/utils/string-sanitize.util';
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Unique email address',
  })
  @Transform(({ value }): string =>
    typeof value === 'string' ? sanitizeString(value).toLowerCase() : '',
  )
  @IsEmail()
  email!: string;
  @ApiProperty({
    example: 'Str0ng!Pass',
    description: 'Strong password (8+ chars, mixed case, number, symbol)',
  })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must include upper, lower, number, and special character',
  })
  password!: string;
}
