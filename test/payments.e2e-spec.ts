import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { createE2eApplication } from './test-app.factory';
import { e2eSuite } from './describe-e2e';
e2eSuite('Payments (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let cardToken: string;
  beforeAll(async () => {
    app = await createE2eApplication();
    const email = `pay_${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(200);
    token = login.body.data.access_token as string;
    const card = await request(app.getHttpServer())
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardholder_name: 'Pay User',
        card_number: '4111111111111111',
        expiry_month: '12',
        expiry_year: '2030',
      })
      .expect(201);
    cardToken = card.body.data.token as string;
  });
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
  it('processes a successful payment', async () => {
    const idem = randomUUID();
    const res = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idem)
      .send({
        card_token: cardToken,
        amount: 12.34,
        currency: 'USD',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CAPTURED');
  });
  it('replays idempotent requests', async () => {
    const idem = randomUUID();
    const first = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idem)
      .send({ card_token: cardToken, amount: 5.0, currency: 'USD' })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idem)
      .send({ card_token: cardToken, amount: 5.0, currency: 'USD' })
      .expect(200);
    expect(second.headers['x-idempotency-replay']).toBe('true');
    expect(second.body.data).toEqual(first.body.data);
  });
  it('rejects unknown card token for other users', async () => {
    const email = `other_${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(200);
    const otherToken = login.body.data.access_token as string;
    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ card_token: cardToken, amount: 1, currency: 'USD' })
      .expect(404);
  });
});
