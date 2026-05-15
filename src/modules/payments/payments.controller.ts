import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { ErrorCodes } from '../../common/errors/error-codes';
import { isTransientTerminalFailure } from './payment-http.util';
@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a payment' })
  @ApiResponse({ status: 200, description: 'Idempotent replay' })
  @ApiResponse({ status: 201, description: 'Captured successfully' })
  @ApiResponse({ status: 422, description: 'Bank declined (non-retryable)' })
  @ApiResponse({
    status: 503,
    description: 'Transient failures exhausted or transport errors',
  })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409 })
  @ApiResponse({ status: 429 })
  @ApiResponse({ status: 500 })
  async create(
    @Req()
    req: Request & {
      user: JwtPayload;
    },
    @Res({ passthrough: true })
    res: Response,
    @Headers('idempotency-key')
    headerKey: string | undefined,
    @Body()
    body: CreatePaymentDto,
  ): Promise<
    | Record<string, unknown>
    | {
        idempotencyReplay: true;
        data: Record<string, unknown>;
      }
    | {
        __terminalPayment: true;
        ok: false;
        snapshot: Record<string, unknown>;
      }
  > {
    const key = headerKey ?? body.idempotency_key;
    if (!key) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message:
          'Idempotency-Key header or idempotency_key body field is required',
      });
    }
    if (
      headerKey &&
      body.idempotency_key &&
      headerKey !== body.idempotency_key
    ) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Idempotency-Key header must match idempotency_key body field',
      });
    }
    const result = await this.paymentsService.processPayment(req.user.sub, {
      cardToken: body.card_token,
      amount: body.amount,
      currency: body.currency ?? 'USD',
      idempotencyKey: key,
      metadata: body.metadata,
    });
    if (
      result &&
      typeof result === 'object' &&
      'idempotencyReplay' in result &&
      result.idempotencyReplay
    ) {
      const snap = result.data as Record<string, unknown>;
      this.applyPaymentHttpStatus(res, snap);
      return result;
    }
    const snapshot = result as Record<string, unknown>;
    if (snapshot.status === 'CAPTURED') {
      res.status(HttpStatus.CREATED);
      return snapshot;
    }
    if (snapshot.status === 'FAILED') {
      this.applyPaymentHttpStatus(res, snapshot);
      return {
        __terminalPayment: true,
        ok: false,
        snapshot,
      };
    }
    res.status(HttpStatus.CREATED);
    return snapshot;
  }
  private applyPaymentHttpStatus(
    res: Response,
    snapshot: Record<string, unknown>,
  ): void {
    const status = snapshot.status as string | undefined;
    if (status === 'FAILED') {
      const fc = snapshot.failure_code as string | undefined;
      res.status(
        isTransientTerminalFailure(fc)
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.UNPROCESSABLE_ENTITY,
      );
      return;
    }
    res.status(HttpStatus.OK);
  }
}
