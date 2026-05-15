import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { MockBankService } from '../src/modules/bank/mock-bank.service';
export async function createE2eApplication(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MockBankService)
    .useValue({
      authorizePayment: jest.fn().mockResolvedValue({
        success: true,
        authorization_code: 'AUTH_TEST',
        bank_request_id: 'bank_test',
        processed_at: new Date().toISOString(),
      }),
    })
    .compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
