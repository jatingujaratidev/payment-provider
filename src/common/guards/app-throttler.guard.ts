import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request & {
      user?: {
        sub?: string;
      };
    };
    const path = request.path ?? request.url ?? '';
    if (path.includes('/payments') && request.method === 'POST') {
      return Promise.resolve(
        request.user?.sub
          ? `payments:${request.user.sub}`
          : `payments:${request.ip}`,
      );
    }
    if (path.includes('/auth/login') && request.method === 'POST') {
      return Promise.resolve(`login:${request.ip}`);
    }
    return Promise.resolve(`global:${request.ip}`);
  }
}
