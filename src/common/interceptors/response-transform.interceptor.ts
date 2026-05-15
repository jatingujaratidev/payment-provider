import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../cls/cls.constants';
import { Response as ExpressResponse } from 'express';
export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
  correlationId: string;
  timestamp: string;
}
const SENSITIVE_KEYS = new Set([
  'password_hash',
  'passwordHash',
  'encrypted_card_number',
  'encryptedCardNumber',
  'encryption_iv',
  'encryptionIv',
  'encryption_tag',
  'encryptionTag',
]);
function stripSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => stripSensitive(v));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'idempotencyReplay' || k === '__pagination') {
        continue;
      }
      if (SENSITIVE_KEYS.has(k)) {
        continue;
      }
      out[k] = stripSensitive(v);
    }
    return out;
  }
  return value;
}
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const res = context.switchToHttp().getResponse<ExpressResponse>();
    return next.handle().pipe(
      map((raw: unknown) => {
        const correlationId = this.cls.get<string>(CLS_CORRELATION_ID) ?? '';
        if (
          raw &&
          typeof raw === 'object' &&
          'success' in (raw as Record<string, unknown>)
        ) {
          return raw;
        }
        if (
          raw &&
          typeof raw === 'object' &&
          '__terminalPayment' in (raw as Record<string, unknown>)
        ) {
          const r = raw as {
            __terminalPayment: true;
            ok: false;
            snapshot: unknown;
          };
          return {
            success: false,
            data: stripSensitive(r.snapshot),
            correlationId,
            timestamp: new Date().toISOString(),
          };
        }
        let idempotencyReplay = false;
        let body: unknown = raw;
        if (
          raw &&
          typeof raw === 'object' &&
          'idempotencyReplay' in (raw as Record<string, unknown>)
        ) {
          const r = raw as {
            idempotencyReplay?: boolean;
            data?: unknown;
          };
          idempotencyReplay = Boolean(r.idempotencyReplay);
          body = r.data ?? raw;
        }
        if (idempotencyReplay) {
          res.setHeader('X-Idempotency-Replay', 'true');
        }
        const cleaned = stripSensitive(body) as Record<string, unknown>;
        let meta:
          | {
              page: number;
              limit: number;
              total: number;
            }
          | undefined;
        let data: unknown = cleaned;
        if (
          cleaned &&
          typeof cleaned === 'object' &&
          '__pagination' in cleaned
        ) {
          const { __pagination, ...rest } = cleaned as Record<
            string,
            unknown
          > & {
            __pagination: {
              page: number;
              limit: number;
              total: number;
            };
          };
          meta = __pagination;
          data = rest;
        }
        const envelope: ApiSuccessEnvelope<unknown> = {
          success: true,
          data,
          correlationId,
          timestamp: new Date().toISOString(),
        };
        if (meta) {
          envelope.meta = meta;
        }
        return envelope;
      }),
    );
  }
}
