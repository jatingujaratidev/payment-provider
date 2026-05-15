import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ErrorCodes } from '../errors/error-codes';
@Injectable()
export class MetricsApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const key = this.config.get<string>('app.metricsApiKey') ?? '';
    if (key.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    const headerKey = req.headers['x-metrics-key'];
    const fromHeader =
      typeof headerKey === 'string'
        ? headerKey
        : Array.isArray(headerKey)
          ? headerKey[0]
          : undefined;
    const auth = req.headers.authorization;
    const fromBearer =
      typeof auth === 'string' && auth.startsWith('Bearer ')
        ? auth.slice('Bearer '.length).trim()
        : undefined;
    if (fromHeader === key || fromBearer === key) {
      return true;
    }
    throw new UnauthorizedException({
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Invalid or missing metrics API key',
    });
  }
}
