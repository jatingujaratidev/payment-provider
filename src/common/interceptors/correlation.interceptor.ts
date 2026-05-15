import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../cls/cls.constants';
import { Response } from 'express';
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const id = String(this.cls.getId());
      this.cls.set(CLS_CORRELATION_ID, id);
      const res = context.switchToHttp().getResponse<Response>();
      res.setHeader('X-Correlation-Id', id);
    }
    return next.handle();
  }
}
