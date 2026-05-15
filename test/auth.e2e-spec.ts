import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApplication } from './test-app.factory';
import { e2eSuite } from './describe-e2e';
e2eSuite('Auth (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createE2eApplication();
  });
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
  it('registers and logs in', async () => {
    const email = `user_${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(200);
    expect(login.body.success).toBe(true);
    expect(login.body.data.access_token).toBeDefined();
  });
  it('rejects duplicate email', async () => {
    const email = `dup_${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass2' })
      .expect(409);
  });
});
