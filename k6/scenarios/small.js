// Small: 10 VUs, 5 minutes. Uso típico de laboratório pequeno.
import { sleep } from 'k6';
import { getBaseUrl, healthCheck, statusPage, anonHome, readinessCheck } from '../lib/common.js';

export const options = {
  scenarios: {
    small: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '4m', target: 10 },
        { duration: '30s', target: 0 }
      ]
    }
  },
  thresholds: {
    'http_req_failed':                ['rate<0.02'],
    'http_req_duration{name:health}': ['p(95)<400'],
    'http_req_duration{name:home}':   ['p(95)<2000'],
    'http_req_duration{name:status}': ['p(95)<2000']
  }
};

const BASE = getBaseUrl();

export default function () {
  healthCheck(BASE);
  readinessCheck(BASE);
  anonHome(BASE);
  statusPage(BASE);
  sleep(3);
}
