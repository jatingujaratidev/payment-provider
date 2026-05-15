import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { MetricsApiGuard } from '../../common/guards/metrics-api.guard';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsApiGuard],
  exports: [MetricsService],
})
export class MetricsModule {}
