import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AppLoggerService } from '../../common/logging/logger.service';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: AppLoggerService,
  ) {}
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Internal error' })
  async register(
    @Body()
    dto: RegisterDto,
  ): Promise<{
    userId: string;
    email: string;
  }> {
    const result = await this.authService.register(dto.email, dto.password);
    this.logger.log('User registered', {
      eventType: 'AUTH_REGISTER',
      userId: result.userId,
    });
    return result;
  }
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Authenticate and receive JWT' })
  @ApiResponse({ status: 200, description: 'JWT issued' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'Internal error' })
  async login(
    @Body()
    dto: LoginDto,
  ): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    try {
      const tokens = await this.authService.login(dto.email, dto.password);
      this.logger.log('Login success', {
        eventType: 'AUTH_LOGIN_SUCCESS',
        metadata: { email_domain: dto.email.split('@')[1] ?? 'unknown' },
      });
      return tokens;
    } catch (e) {
      this.logger.warn('Login failed', {
        eventType: 'AUTH_LOGIN_FAILURE',
        metadata: { email_domain: dto.email.split('@')[1] ?? 'unknown' },
        error:
          e instanceof Error
            ? { code: 'LOGIN_FAILED', message: e.message }
            : undefined,
      });
      throw e;
    }
  }
}
