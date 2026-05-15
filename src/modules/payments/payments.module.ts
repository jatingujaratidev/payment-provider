import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { CardsModule } from '../cards/cards.module';
import { BankModule } from '../bank/bank.module';
import { MetricsModule } from '../metrics/metrics.module';
@Module({
  imports: [TransactionsModule, CardsModule, BankModule, MetricsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
