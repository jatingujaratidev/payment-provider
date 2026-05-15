import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 503 })
  async health(): Promise<{
    status: string;
    database: string;
  }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'up' };
  }
}
