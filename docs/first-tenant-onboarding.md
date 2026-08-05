# Onboarding do primeiro tenant

Checklist operacional para cadastrar o primeiro laboratório real em produção.

## Pré-requisitos

- ✅ Fases 1-7 concluídas
- ✅ Migration 0041 aplicada
- ✅ Stripe live configurado + webhook cadastrado
- ✅ Email transacional configurado + DNS (SPF/DKIM/DMARC)
- ✅ Backups Supabase Pro habilitados
- ✅ Termos + Política publicados
- ✅ Domínio principal (app.srdigital.com.br) apontando para Vercel
- ✅ SSL válido
- ✅ Sentry configurado (opcional mas recomendado)
- ✅ Canal de suporte definido (SLA)
- ✅ Um super_admin da plataforma criado (`platform_role='super'`)

## Etapas

### 1. Cadastro
- [ ] Cliente cria conta via `/signup` OU super admin cria via `/super-admin/tenants/novo` (rota pendente)
- [ ] Owner definido (email correto)
- [ ] Slug único escolhido (`nome-lab`)
- [ ] Plano inicial atribuído (default Starter em trial)

### 2. Onboarding
- [ ] Cliente conclui wizard em `/onboarding`
- [ ] Branding configurado (`/branding`) — logo, cores, favicon
- [ ] Primeira clínica cadastrada
- [ ] Primeiros dentistas convidados via `/equipe`
- [ ] Primeiro caso de teste criado internamente

### 3. Assinatura
- [ ] Cliente escolhe plano em `/billing`
- [ ] Checkout Stripe confirma pagamento
- [ ] Webhook processa → status `active`
- [ ] Invoice registrada em `/super-admin/faturamento`

### 4. Domínio custom (opcional)
- [ ] `/dominios` — adicionar `portal.cliente.com.br`
- [ ] Cliente adiciona TXT DNS
- [ ] Cron revalida (max 15min)
- [ ] Status → verified
- [ ] Adicionar CNAME na hospedagem
- [ ] SSL provisionado
- [ ] Testar em outro dispositivo

### 5. Release channel
- [ ] Setar `tenant_release_channels.channel = 'pilot'` (via SQL)
- [ ] Ativar features específicas do piloto se houver

### 6. Treinamento
- [ ] Call de 60min com equipe do lab
- [ ] Enviar guia impresso / PDF
- [ ] Confirmar que TOTP está ativo para admins (`/perfil/seguranca`)

### 7. Validação de fluxo real
- [ ] Cliente cria caso real (não `[DEMO]`)
- [ ] Cliente envia arquivos
- [ ] Cliente cria orçamento
- [ ] Dentista recebe convite e aceita
- [ ] Dentista aprova orçamento no portal
- [ ] Planejamento é aprovado
- [ ] Entrega confirmada
- [ ] Ticket de suporte de teste aberto e resolvido

### 8. Comunicação semanal
- [ ] Reunião fixa 30min com owner
- [ ] Dashboard de métricas (`/super-admin`) revisado
- [ ] Feedback do produto revisado

## Nunca

- Popular tenant real com `scripts/seed-demo.mjs`
- Usar credenciais internas para operar em nome do cliente sem impersonação registrada
- Publicar promessa de SLA que não temos infra para cumprir

## Runbook de emergência

Se algo quebrar durante piloto:
1. `/super-admin/alertas` — algo já detectado?
2. `docs/runbooks/*.md` para o cenário específico
3. Contato de emergência: (a preencher)
