import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  MOCK_BANK_MAX_DELAY_MS,
  MOCK_BANK_MIN_DELAY_MS,
} from '../../common/constants/app.constants';
export interface BankSuccessResponse {
  success: true;
  authorization_code: string;
  bank_request_id: string;
  processed_at: string;
}
export interface BankFailureResponse {
  success: false;
  error_code: string;
  error_message: string;
  bank_request_id: string;
  is_retryable: boolean;
}
export type BankResponse = BankSuccessResponse | BankFailureResponse;
export class BankTransportError extends Error {
  constructor(
    public readonly transportCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'BankTransportError';
  }
}
function randomDelayMs(): number {
  return (
    Math.floor(
      Math.random() * (MOCK_BANK_MAX_DELAY_MS - MOCK_BANK_MIN_DELAY_MS + 1),
    ) + MOCK_BANK_MIN_DELAY_MS
  );
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
@Injectable()
export class MockBankService {
  async authorizePayment(input: {
    amount: string;
    currency: string;
    cardToken: string;
  }): Promise<BankResponse> {
    void input.cardToken;
    await sleep(randomDelayMs());
    const bankRequestId = `bank_${randomBytes(8).toString('hex')}`;
    const roll = Math.random() * 100;
    if (roll < 85) {
      const code = `AUTH_${randomBytes(3).toString('hex').toUpperCase()}`;
      return {
        success: true,
        authorization_code: code,
        bank_request_id: bankRequestId,
        processed_at: new Date().toISOString(),
      };
    }
    if (roll < 93) {
      return {
        success: false,
        error_code: 'INSUFFICIENT_FUNDS',
        error_message: 'Insufficient funds',
        bank_request_id: bankRequestId,
        is_retryable: false,
      };
    }
    if (roll < 95) {
      return {
        success: false,
        error_code: 'INVALID_CARD',
        error_message: 'Invalid card',
        bank_request_id: bankRequestId,
        is_retryable: false,
      };
    }
    if (roll < 97) {
      return {
        success: false,
        error_code: 'CARD_EXPIRED',
        error_message: 'Card expired',
        bank_request_id: bankRequestId,
        is_retryable: false,
      };
    }
    if (roll < 99) {
      const channel = Math.random();
      if (channel < 0.34) {
        throw new BankTransportError('ECONNRESET', 'Connection reset by peer');
      }
      if (channel < 0.67) {
        throw new BankTransportError('BANK_HTTP_503', 'Bank returned HTTP 503');
      }
      return {
        success: false,
        error_code: 'NETWORK_TIMEOUT',
        error_message: 'Network timeout',
        bank_request_id: bankRequestId,
        is_retryable: true,
      };
    }
    return {
      success: false,
      error_code: 'RATE_LIMIT_EXCEEDED',
      error_message: 'Rate limit exceeded',
      bank_request_id: bankRequestId,
      is_retryable: true,
    };
  }
}
