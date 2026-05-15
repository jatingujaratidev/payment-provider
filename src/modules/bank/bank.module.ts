import { Module } from '@nestjs/common';
import { MockBankService } from './mock-bank.service';
@Module({
  providers: [MockBankService],
  exports: [MockBankService],
})
export class BankModule {}
