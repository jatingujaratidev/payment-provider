import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApplication } from './test-app.factory';
import { e2eSuite } from './describe-e2e';
e2eSuite('Cards (e2e)', () => {
  let app: INestApplication;
  let token: string;
  beforeAll(async () => {
    app = await createE2eApplication();
    const email = `cards_${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(200);
    token = login.body.data.access_token as string;
  });
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
  it('adds a valid card', async () => {
    const res = await request(app.getHttpServer())
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardholder_name: 'Test User',
        card_number: '4111111111111111',
        expiry_month: '12',
        expiry_year: '2030',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });
  it('rejects invalid Luhn', async () => {
    await request(app.getHttpServer())
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardholder_name: 'Test User',
        card_number: '4111111111111112',
        expiry_month: '12',
        expiry_year: '2030',
      })
      .expect(422);
  });
  it('lists and deletes cards', async () => {
    const add = await request(app.getHttpServer())
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cardholder_name: 'Del User',
        card_number: '5555555555554444',
        expiry_month: '01',
        expiry_year: '2031',
      })
      .expect(201);
    const id = add.body.data.id as string;
    const list = await request(app.getHttpServer())
      .get('/cards')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.success).toBe(true);
    await request(app.getHttpServer())
      .delete(`/cards/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
