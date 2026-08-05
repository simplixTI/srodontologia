# Load test results

Este arquivo é populado após cada execução real de k6. Nunca inventar valores.

## Como registrar uma execução

1. Rode o cenário: `k6 run --summary-export=k6/results/small-2026-08-05.json k6/scenarios/small.js`
2. Cole abaixo o bloco correspondente com os números observados
3. Commit com o resultado

## Template

```
### <cenário> · <data ISO>
- **Ambiente**: <local | staging>
- **Commit**: <sha>
- **Base URL**: <url>
- **Duração real**: <duração>
- **VUs**: <pico>
- **Req total**: <n>
- **HTTP failed**: <%>
- **p50 / p95 / p99**:
  - health:    <ms> / <ms> / <ms>
  - home:      <ms> / <ms> / <ms>
  - status:    <ms> / <ms> / <ms>
- **Gargalos observados**: <n/a se nenhum>
- **Notas**: <observações livres>
```

## Execuções

_Nenhuma execução registrada ainda. Rode `npm run k6:baseline` contra staging e cole o resultado aqui._
