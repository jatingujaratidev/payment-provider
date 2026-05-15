import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AppLoggerService } from '../logging/logger.service';
import type { Request } from 'express';
import { JwtPayload } from '../../modules/auth/jwt-payload.interface';
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<
      Request & {
        user?: JwtPayload;
      }
    >();
    const started = Date.now();
    const userId = req.user?.sub;
    const routePath = req.path ?? '';
    this.logger.log('Incoming HTTP request', {
      eventType: 'HTTP_REQUEST',
      userId: userId ?? null,
      metadata: { method: req.method, path: routePath },
    });
    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse<{
            statusCode: number;
          }>();
          const durationMs = Date.now() - started;
          this.logger.log('Outgoing HTTP response', {
            eventType: 'HTTP_RESPONSE',
            userId: userId ?? null,
            durationMs,
            metadata: {
              method: req.method,
              path: routePath,
              status: res.statusCode,
            },
          });
        },
        error: (err: unknown) => {
          const durationMs = Date.now() - started;
          this.logger.error('HTTP request failed', {
            userId: userId ?? null,
            durationMs,
            metadata: { method: req.method, path: routePath },
            error:
              err instanceof Error
                ? { code: 'HTTP_ERROR', message: err.message, stack: err.stack }
                : { code: 'HTTP_ERROR', message: String(err) },
          });
        },
      }),
    );
  }
}
