# k6 load tests

Real load scripts. Requires k6 installed (`brew install k6` or Chocolatey `choco install k6`).

## Guardas
- **Não rode em produção.** Todos os scripts checam `BASE_URL` — se apontar para o domínio de produção, abortam
- Use conta dedicada de smoke test (nunca conta real)
- Executa contra `http://localhost:3000` ou staging isolado

## Como rodar

```bash
# Baseline (1 VU, 2 min)
BASE_URL=http://localhost:3000 k6 run k6/scenarios/baseline.js

# Operação pequena
BASE_URL=https://staging.srdigital.com.br k6 run k6/scenarios/small.js

# Operação média
BASE_URL=https://staging.srdigital.com.br k6 run k6/scenarios/medium.js

# Pico
BASE_URL=https://staging.srdigital.com.br k6 run k6/scenarios/peak.js
```

## Cenários

| Cenário   | VUs | Duração | Propósito                                       |
|-----------|----:|--------:|-------------------------------------------------|
| baseline  |   1 |     2m  | Sanity check + captura de p95 base              |
| small     |  10 |     5m  | Uso típico de laboratório pequeno               |
| medium    |  50 |     5m  | Laboratório médio                               |
| peak      | 100 |     3m  | Pico curto (rush de fim de dia)                 |

## Thresholds sugeridos

- `http_req_failed < 0.01` (1%)
- `http_req_duration{name:health} p(95) < 300`
- `http_req_duration{name:dashboard} p(95) < 1500`

Ajustar depois da primeira execução real. **Nunca inventar valores**.

## Relatório

Após rodar, salva JSON:

```bash
k6 run --summary-export=k6/results/small-$(date +%Y%m%d).json k6/scenarios/small.js
```

Consolidar em `docs/load-test-results.md` (template no repo).
