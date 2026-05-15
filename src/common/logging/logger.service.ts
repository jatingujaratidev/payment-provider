import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import * as winston from 'winston';
import {
  CLS_CORRELATION_ID,
  CLS_TRANSACTION_ID,
  CLS_USER_ID,
} from '../cls/cls.constants';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export interface StructuredLogFields {
  userId?: string | null;
  transactionId?: string | null;
  eventType?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}
@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  constructor(
    private readonly config: ConfigService,
    private readonly cls: ClsService,
  ) {
    const serviceName =
      this.config.get<string>('app.name') ?? 'payment-provider';
    const nodeEnv = this.config.get<string>('app.nodeEnv') ?? 'development';
    this.logger = winston.createLogger({
      level: nodeEnv === 'production' ? 'info' : 'debug',
      defaultMeta: { service: serviceName },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
          const { timestamp, level, message, service, ...rest } = info;
          const payload = {
            timestamp,
            level,
            service,
            message,
            ...rest,
          };
          return JSON.stringify(payload);
        }),
      ),
      transports: [new winston.transports.Console()],
    });
  }
  private baseFields(extra: StructuredLogFields): Record<string, unknown> {
    const correlationId =
      (this.cls.get<string>(CLS_CORRELATION_ID) as string | undefined) ?? null;
    const clsUser = this.cls.get<string | undefined>(CLS_USER_ID);
    const clsTx = this.cls.get<string | undefined>(CLS_TRANSACTION_ID);
    return {
      correlationId,
      userId: extra.userId ?? clsUser ?? null,
      transactionId: extra.transactionId ?? clsTx ?? null,
      eventType: extra.eventType,
      duration: extra.durationMs,
      metadata: extra.metadata,
      error: extra.error,
    };
  }
  log(message: string, extra: StructuredLogFields = {}): void {
    this.logger.info({ message, ...this.baseFields(extra) });
  }
  warn(message: string, extra: StructuredLogFields = {}): void {
    this.logger.warn({ message, ...this.baseFields(extra) });
  }
  error(message: string, extra: StructuredLogFields = {}): void {
    this.logger.error({ message, ...this.baseFields(extra) });
  }
  debug(message: string, extra: StructuredLogFields = {}): void {
    this.logger.debug({ message, ...this.baseFields(extra) });
  }
  verbose(message: string, extra: StructuredLogFields = {}): void {
    this.debug(message, extra);
  }
  paymentEvent(message: string, extra: StructuredLogFields): void {
    this.log(message, extra);
  }
}
