# Testes de carga

Não incluídos no CI (requer ambiente staging + ferramenta externa). Documentação prescritiva para execução manual antes de tráfego comercial.

## Ferramenta recomendada: k6

```bash
brew install k6   # ou baixe binário
```

## Cenários mínimos

Cada script vive em `load/` (criar quando executar):

### `load/login.js`

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02']
  }
};

const BASE = __ENV.BASE_URL;
const EMAIL = __ENV.LOAD_TEST_EMAIL;
const PASSWORD = __ENV.LOAD_TEST_PASSWORD;

export default function () {
  const res = http.post(`${BASE}/api/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(res, { 'status 2xx': (r) => r.status < 400 });
  sleep(1);
}
```

### `load/health.js`

```js
import http from 'k6/http';
export const options = { stages: [{ duration: '2m', target: 100 }] };
export default function () {
  http.get(`${__ENV.BASE_URL}/api/health`);
}
```

### `load/dashboard.js`

Requer cookie de sessão pré-obtido:
```bash
COOKIE="sb-access-token=..." k6 run load/dashboard.js
```

## Rodar

```bash
BASE_URL=https://staging.srdigital.com.br k6 run load/health.js
```

## Cenários pendentes de escrita

- Listagem de casos
- Detalhe de caso (queries N+1 checagem)
- Upload metadata
- Webhook billing
- Signup (com CAPTCHA mock)

## Metas iniciais

Baseadas na infra atual (Vercel Serverless + Supabase Free/Pro):

| Endpoint | p95 | p99 | Throughput |
|---|---|---|---|
| /api/health | < 100ms | < 200ms | 500 rps sustentado |
| /dashboard | < 800ms | < 1500ms | 20 rps por instância |
| /casos (list) | < 600ms | < 1200ms | 20 rps por instância |
| POST /api/auth/login | < 500ms | < 900ms | 5 rps por IP |
| POST /api/webhooks/billing/stripe | < 300ms | < 800ms | 50 rps |

**Não são metas comerciais** — são targets de baseline. Validar com números reais após primeira execução.

## Nunca

- Rodar carga contra produção com clientes ativos
- Enviar arquivos clínicos reais
- Reutilizar credenciais de produção
