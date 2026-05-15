import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, MoreThan } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionStatus } from '../transactions/transaction-status.enum';
import type { StateTransitionContext } from '../transactions/transaction-state-machine';
@Injectable()
export class MetricsService {
  private totalDurationMs = 0;
  private paymentCount = 0;
  private retryTotal = 0;
  constructor(private readonly dataSource: DataSource) {}
  recordRetry(): void {
    this.retryTotal += 1;
  }
  recordPaymentDuration(durationMs: number): void {
    this.totalDurationMs += durationMs;
    this.paymentCount += 1;
  }
  async getSnapshot(): Promise<Record<string, unknown>> {
    const repo = this.dataSource.getRepository(Transaction);
    const total = await repo.count();
    const byStatus = await repo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany<{
        status: TransactionStatus;
        count: string;
      }>();
    const map: Record<string, number> = {
      INITIATED: 0,
      PROCESSING: 0,
      AUTHORIZED: 0,
      CAPTURED: 0,
      FAILED: 0,
      RETRYING: 0,
    };
    for (const row of byStatus) {
      map[row.status] = parseInt(row.count, 10);
    }
    const captured = map[TransactionStatus.CAPTURED] ?? 0;
    const successRate =
      total === 0 ? 0 : Math.round((captured / total) * 10000) / 100;
    const avg =
      this.paymentCount === 0
        ? 0
        : Math.round(this.totalDurationMs / this.paymentCount);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24h = await repo.count({ where: { createdAt: MoreThan(since) } });
    const failureRows = await repo
      .createQueryBuilder('t')
      .select('t.failure_code', 'code')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.status = :failed', { failed: TransactionStatus.FAILED })
      .andWhere('t.failure_code IS NOT NULL')
      .groupBy('t.failure_code')
      .getRawMany<{
        code: string;
        cnt: string;
      }>();
    const failure_breakdown: Record<string, number> = {};
    for (const row of failureRows) {
      failure_breakdown[row.code] = parseInt(row.cnt, 10);
    }
    return {
      uptime_seconds: Math.round(process.uptime()),
      total_transactions: total,
      transactions_by_status: map,
      success_rate_percent: successRate,
      average_response_time_ms: avg,
      total_retries: this.retryTotal,
      failure_breakdown,
      transactions_last_24h: last24h,
      timestamp: new Date().toISOString(),
    };
  }
  @OnEvent('transaction.state.changed')
  handleState(ctx: StateTransitionContext): void {
    void ctx;
  }
}
