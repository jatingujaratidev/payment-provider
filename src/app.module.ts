import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './config/app-config.module';
import { LoggingModule } from './common/logging/logging.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CardsModule } from './modules/cards/cards.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { HealthModule } from './modules/health/health.module';
import { User } from './modules/users/user.entity';
import { Card } from './modules/cards/card.entity';
import { Transaction } from './modules/transactions/transaction.entity';
import { TransactionStateHistory } from './modules/transactions/transaction-state-history.entity';
import { IdempotencyKey } from './modules/payments/idempotency-key.entity';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { CorrelationInterceptor } from './common/interceptors/correlation.interceptor';
@Module({
  imports: [
    AppConfigModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: IncomingMessage) => {
          const raw =
            req.headers['x-correlation-id'] ?? req.headers['X-Correlation-Id'];
          const header = Array.isArray(raw) ? raw[0] : raw;
          if (typeof header === 'string' && /^[0-9a-f-]{36}$/i.test(header)) {
            return header;
          }
          return randomUUID();
        },
      },
    }),
    LoggingModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttler = config.get<{
          ttl: number;
          limit: number;
        }>('throttler');
        return [
          {
            ttl: throttler?.ttl ?? 60000,
            limit: throttler?.limit ?? 100,
          },
        ];
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<{
          host: string;
          port: number;
          username: string;
          password?: string;
          database: string;
        }>('database');
        const appCfg = config.get<{
          nodeEnv: string;
        }>('app');
        const nodeEnv = appCfg?.nodeEnv ?? 'development';
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          entities: [
            User,
            Card,
            Transaction,
            TransactionStateHistory,
            IdempotencyKey,
          ],
          synchronize: nodeEnv === 'test',
          migrationsRun: false,
          logging: nodeEnv === 'development',
          ...(nodeEnv === 'test' ? { retryAttempts: 1, retryDelay: 100 } : {}),
        };
      },
    }),
    UsersModule,
    AuthModule,
    CardsModule,
    PaymentsModule,
    MetricsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationInterceptor },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
  ],
})
export class AppModule {}
