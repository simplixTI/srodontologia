# UAT — User Acceptance Test plan

Roteiro de homologação por perfil. **Executado por operadores reais**, não por automação. Cada linha vira uma `uat_results` row com evidência (screenshot ou log sanitizado — nunca dados clínicos reais).

## Perfil: Dono do laboratório (`owner`)

| Cenário | Entrada | Resultado esperado | Como validar |
|---------|---------|--------------------|--------------|
| Login + primeira senha | E-mail + `SenhaTempYYYY!` | Redireciona para `/change-password`, força troca | Screenshot do redirecionamento |
| Definir branding | Upload logo + cor primária | Aparece no header em ~5s | Screenshot |
| Convidar dentista | E-mail válido | Convite chega no destinatário | Ver `email_outbox` = sent |
| Ver plano atual | — | Mostra plano + trial restante | Screenshot |
| Cancelar (dentro do trial) | Botão cancelar | Fluxo com confirmação forte | Não deve cancelar sem digitar "CANCELAR" |

## Perfil: Administrador (`admin`)

| Cenário | Entrada | Resultado esperado |
|---------|---------|--------------------|
| Criar clínica | Nome + endereço | Aparece na listagem, RLS impede outro tenant ver |
| Importar dentistas via CSV | 5 linhas válidas | Dry-run OK 5/0; após apply, 5 dentistas criados |
| Reprocessar linha CSV com erro | Ver relatório de erros | Erro mostra linha + campo específico |
| Suspender usuário interno | Botão suspender | Usuário não consegue mais logar |
| Rate limit rotas API | 100 req/s no `/api/v1/cases` | 429 após limite; header `x-ratelimit-remaining` correto |

## Perfil: Operador (`operator`)

| Cenário | Entrada | Resultado esperado |
|---------|---------|--------------------|
| Criar caso | Dentista + paciente + tipo | Caso criado com status `pending` |
| Upload de arquivo JPG | 500KB | Comprimido, thumbnail gerada |
| Upload de STL | 20MB | Sem compressão, apenas armazenado |
| Enviar mensagem no chat | Texto | Dentista recebe notificação (email_outbox) |
| Gerar orçamento | Preencher itens | Orçamento em status `draft` |
| Enviar orçamento | Botão enviar | Status vira `sent`, e-mail enfileirado |

## Perfil: Financeiro (`finance`)

| Cenário | Entrada | Resultado esperado |
|---------|---------|--------------------|
| Ver invoices | — | Lista com filtro por status |
| Ver plano do laboratório | — | Sem acesso a `/super-admin` |
| Ver histórico de pagamentos | — | Somente do próprio tenant (RLS) |

## Perfil: Dentista (portal externo)

| Cenário | Entrada | Resultado esperado |
|---------|---------|--------------------|
| Aceitar convite via link | Token válido | Cria conta + senha, redireciona portal |
| Ver caso próprio | — | Só vê os próprios (RLS + rota `/portal/casos/:id`) |
| Tentar acessar outro caso | Path forjado | 403 |
| Aprovar orçamento | Botão aprovar | Status muda para `approved`, IP+UA capturados |
| Solicitar mudança no planejamento | Comentário obrigatório | Status vira `changes_requested` |
| Confirmar recebimento | Assinatura + notas | Delivery vira `delivered` |
| Ver Super Admin | Path `/super-admin` | 403 imediato |

## Cenários de segurança (todos os perfis)

- Sessão revogada em outro dispositivo → deve ser deslogado ao acessar `/super-admin`, `/configuracoes`, `/financeiro`, `/api/v1/admin/*`
- Novo device login → e-mail `security_alert` enfileirado
- Tentativa de open redirect (`?next=https://evil.com/x`) → sanitized para path relativo

## Formato de resultado

Cada teste vira uma row em `uat_results`:
```
scenario_key: "owner.branding.set_color"
status:       "passed" | "failed" | "skipped"
observation:  "cor aplicada em 3s"
evidence_url: "s3://uat-evidence/2026-08-05/owner-branding.png"
```

## Aprovação final

Fase 9 UAT considerada concluída quando:
- 100% dos cenários owner + admin `passed`
- 90%+ dos cenários operator + dentista `passed`
- Zero cenário de segurança `failed`
