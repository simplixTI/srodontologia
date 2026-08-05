# Restore drill

Documento operacional. **Nunca executar em produção.**

## Objetivo

Validar que, em caso de perda de dados em produção, conseguimos restaurar em ambiente isolado (staging ou projeto de sandbox Supabase) com RPO e RTO documentados.

## Pré-requisitos externos (aguardando cliente)

- Supabase PITR habilitado no projeto de produção (plano Pro ou superior). ⚠️ **Pendente** — verificar em Supabase Dashboard → Database → Backups
- Projeto Supabase separado para restore-target (staging ou drill sandbox)
- Acesso admin ao projeto de origem para acionar restore

## Passos do drill (a executar quando pré-requisitos estiverem OK)

1. **Snapshot inicial** — anotar contagem de linhas em:
   - `organizations`, `profiles`, `cases`, `case_messages`, `quotes`
2. **Marcar timestamp T0** (usar `select now();` no destino)
3. **Simular perda** — em staging, apagar 100 linhas de `cases` (dados sintéticos)
4. **Solicitar restore PITR** no Supabase para T0
5. **Aguardar restore** — Supabase notifica quando concluído (5-15 min típico)
6. **Validar integridade**:
   - Contagem de linhas volta ao snapshot inicial
   - `select count(*) from cases where created_at <= T0;`
7. **RTO observado**: (tempo total desde solicitação até validação)
8. **RPO observado**: (diferença entre T0 e último dado no restore)
9. **Documentar aqui**

## Guardrails

- Restore **destrutivo** em produção NUNCA. Sempre para projeto separado + swap DNS/env se realmente necessário
- Ao concluir drill, dropar o projeto sandbox

## Resultados

_Nenhum drill executado ainda. Aguardando: (a) PITR ativado, (b) projeto sandbox criado._

## Template para registrar

```
### Drill YYYY-MM-DD
- Executor: <nome>
- Projeto origem: <ref>
- Projeto destino: <ref>
- T0: <iso>
- Snapshot inicial: cases=N, profiles=M, ...
- Perda simulada: <descrição>
- Restore solicitado às: <iso>
- Restore concluído às: <iso>
- RTO observado: <min>
- RPO observado: <segundos>
- Validação: passou | falhou (<motivo>)
- Cleanup: sandbox deletada em <iso>
```
