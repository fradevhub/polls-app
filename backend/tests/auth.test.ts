/* Supertest */
import request from 'supertest';

/* App modules */
import { app } from '../src/test-app';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@polls.local';
const ADMIN_PASS = process.env.TEST_ADMIN_PASSWORD || 'Admin!123';

/* Test POST /auth/login */
describe('Auth /auth/login', () => {
  it('401 on invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('200 on valid credentials -> token + user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user?.email).toBe(ADMIN_EMAIL);
    expect(res.body.user?.role).toMatch(/^(user|admin)$/);
  });
});