// Peak: 100 VUs, 3 minutes. Rush de fim de dia — não destrutivo.
import { sleep } from 'k6';
import { getBaseUrl, healthCheck, anonHome, statusPage } from '../lib/common.js';

export const options = {
  scenarios: {
    peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 }
      ]
    }
  },
  thresholds: {
    'http_req_failed':                ['rate<0.05'],
    'http_req_duration{name:health}': ['p(95)<800']
  }
};

const BASE = getBaseUrl();

export default function () {
  healthCheck(BASE);
  anonHome(BASE);
  statusPage(BASE);
  sleep(1);
}
