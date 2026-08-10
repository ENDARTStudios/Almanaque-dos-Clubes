import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

const errorRate = new Rate('errors');
const loginLatency = new Trend('login_duration');
const clubsLatency = new Trend('clubs_list_duration');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },     // Stay at 100
    { duration: '30s', target: 200 },    // Ramp up to 200
    { duration: '1m', target: 200 },     // Stay at 200
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.05'],               // < 5% errors
    http_req_duration: ['p(95)<500'],    // 95% requests < 500ms
    login_duration: ['p(95)<1000'],      // Login < 1s
  },
};

export default function () {
  // 1. Healthcheck
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health status 200': (r) => r.status === 200 });
  errorRate.add(health.status !== 200);

  // 2. List clubs
  const clubsStart = Date.now();
  const clubs = http.get(`${BASE_URL}/clubs?limit=20`);
  clubsLatency.add(Date.now() - clubsStart);
  check(clubs, { 'clubs list 200': (r) => r.status === 200 });
  errorRate.add(clubs.status !== 200);

  // 3. Search clubs
  const search = http.get(`${BASE_URL}/clubs?search=Flamengo`);
  check(search, { 'search 200': (r) => r.status === 200 });

  // 4. Login attempt (will fail for random users — tests auth endpoint)
  const loginStart = Date.now();
  const login = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `user-${__VU}@test.com`,
    password: 'wrongpass',
  }), { headers: { 'Content-Type': 'application/json' } });
  loginLatency.add(Date.now() - loginStart);
  check(login, { 'login returns 401 for invalid': (r) => r.status === 401 });

  sleep(1);
}
