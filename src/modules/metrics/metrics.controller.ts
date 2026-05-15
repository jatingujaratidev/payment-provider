import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { MetricsApiGuard } from '../../common/guards/metrics-api.guard';
import { MetricsService } from './metrics.service';
@ApiTags('Metrics')
@SkipThrottle()
@Controller('metrics')
@UseGuards(MetricsApiGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}
  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Operational metrics (optional `METRICS_API_KEY`: send `X-Metrics-Key` or `Authorization: Bearer`)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing metrics API key',
  })
  @ApiResponse({ status: 500 })
  async getMetrics(): Promise<Record<string, unknown>> {
    return this.metrics.getSnapshot();
  }
}
