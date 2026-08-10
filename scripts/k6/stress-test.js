import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  stages: [
    { duration: '2m', target: 1000 },    // Ramp to 1000 users
    { duration: '3m', target: 1000 },    // Stay at peak
    { duration: '2m', target: 0 },       // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // Allow slower for peak test
    http_req_failed: ['rate<0.10'],      // < 10% failures
  },
};

export default function () {
  const endpoints = [
    `${BASE_URL}/health`,
    `${BASE_URL}/clubs?limit=10`,
    `${BASE_URL}/clubs?search=FC&limit=10`,
  ];

  for (const url of endpoints) {
    const res = http.get(url);
    check(res, { [`${url} 200`]: (r) => r.status === 200 });
  }

  sleep(0.5);
}
