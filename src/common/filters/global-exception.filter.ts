import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../cls/cls.constants';
import { ErrorCodes, ErrorCode } from '../errors/error-codes';
interface ErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown[];
  };
  correlationId: string;
  timestamp: string;
}
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly config: ConfigService,
    private readonly cls: ClsService,
  ) {}
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    const correlationId = this.cls.get<string>(CLS_CORRELATION_ID) ?? '';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let details: unknown[] | undefined;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = 'Validation failed';
          details = body.message as unknown[];
        }
        if (typeof body.code === 'string') {
          code = body.code as ErrorCode;
        } else if (status === HttpStatus.UNAUTHORIZED) {
          code = ErrorCodes.UNAUTHORIZED;
        } else if (status === HttpStatus.FORBIDDEN) {
          code = ErrorCodes.FORBIDDEN;
        } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
          code = ErrorCodes.RATE_LIMIT_EXCEEDED;
        } else if (status === HttpStatus.BAD_REQUEST) {
          code = ErrorCodes.VALIDATION_ERROR;
        }
      } else if (typeof response === 'string') {
        message = response;
      }
    } else if (exception instanceof QueryFailedError) {
      const err = exception as QueryFailedError & {
        code?: string;
      };
      if (err.code === '23505') {
        status = HttpStatus.CONFLICT;
        code = ErrorCodes.DUPLICATE_IDEMPOTENCY_KEY;
        message = 'Duplicate unique constraint';
      }
    } else if (exception instanceof Error) {
      message = isProd ? 'An unexpected error occurred' : exception.message;
    }
    const payload: ErrorBody = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      correlationId,
      timestamp: new Date().toISOString(),
    };
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      res.setHeader('Retry-After', '60');
    }
    res.status(status).json(payload);
  }
}
