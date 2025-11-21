/* Supertest */
import request from 'supertest';

/* App modules */
import { app } from '../src/test-app';


/* Test GET /api/health */
describe('Health', () => {
  it('GET /api/health -> 200 { ok: true }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
