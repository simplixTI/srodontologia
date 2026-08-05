// Medium: 50 VUs, 5 minutes.
import { sleep } from 'k6';
import { getBaseUrl, healthCheck, statusPage, anonHome, readinessCheck } from '../lib/common.js';

export const options = {
  scenarios: {
    medium: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 }
      ]
    }
  },
  thresholds: {
    'http_req_failed':                ['rate<0.03'],
    'http_req_duration{name:health}': ['p(95)<500'],
    'http_req_duration{name:home}':   ['p(95)<2500']
  }
};

const BASE = getBaseUrl();

export default function () {
  healthCheck(BASE);
  readinessCheck(BASE);
  anonHome(BASE);
  statusPage(BASE);
  sleep(2);
}
