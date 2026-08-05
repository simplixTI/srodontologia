# Rollback drill

Documento operacional. Validar procedimentos de rollback em staging antes de precisar em prod.

## Cenários a exercitar

### 1. Rollback de código (Vercel)
- Deploy versão B com bug conhecido em staging
- Vercel Dashboard → Deployments → Promote previous
- Validar smoke test volta a passar em < 2 min

### 2. Desativação de feature via Feature Flag
- Ativar `ai.image_analysis` para tenant piloto
- Detectar problema
- Super Admin → Features → Override tenant=X para false
- Validar que o botão de análise de imagem desaparece na próxima navegação

### 3. Worker/cron incompatível
- Deploy versão com nova versão de payload de job (breaking)
- Jobs antigos ficam em `failed` — não em `dead_letter`
- Rollback: promover deploy anterior
- Validar que os jobs failed são retentados com sucesso

### 4. Integração externa com erro
- Simular provider de e-mail retornando 500
- Confirmar que emails ficam em `email_outbox` status `failed`
- Restaurar provider
- Confirmar que retry manual (ou cron de retry) reprocessa

### 5. Migration aditiva
- Rodar migration que adiciona coluna nullable (safe)
- Verificar: código antigo continua funcionando (não referencia coluna nova)
- Rollback: `alter table ... drop column if exists ...` (cuidado com dados)

### 6. Compatibilidade versão anterior + schema novo
- Deploy schema novo (Fase X+1) sem deploy do código X+1
- Validar app X continua funcionando (features novas ficam ocultas)

## Resultados

_Aguardando ambiente de staging configurado._

## Template

```
### Rollback Drill YYYY-MM-DD · <cenário>
- Executor: <nome>
- Passos: <lista>
- Tempo total: <min>
- Falhas encontradas: <lista>
- Melhorias aplicadas: <lista>
- Runbook atualizado? sim | não
```
