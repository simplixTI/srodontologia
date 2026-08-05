// Baseline: 1 VU, 2 minutes. Sanity check + captura p95 base.
import { sleep } from 'k6';
import { getBaseUrl, healthCheck, statusPage, anonHome } from '../lib/common.js';

export const options = {
  vus: 1,
  duration: '2m',
  thresholds: {
    'http_req_failed{name:health}':   ['rate<0.01'],
    'http_req_duration{name:health}': ['p(95)<300'],
    'http_req_duration{name:home}':   ['p(95)<1500']
  }
};

const BASE = getBaseUrl();

export default function () {
  healthCheck(BASE);
  anonHome(BASE);
  statusPage(BASE);
  sleep(2);
}
