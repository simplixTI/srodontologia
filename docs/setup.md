# SR HUB · Setup (Fase 1)

## 1. Pré-requisitos
- Node.js 18+ (recomendado 20 LTS)
- npm 10+
- CLI do Supabase — `npm i -g supabase` ou usar via `npx`
- Uma conta no Supabase com o projeto `wcxwngfuwwzylcmsgoyu` acessível

## 2. Clonar e instalar
```bash
git clone https://github.com/simplixTI/srodontologia.git
cd srodontologia
npm install
```

## 3. Variáveis de ambiente
Copie o template:
```bash
cp .env.example .env.local
```

Preencha:

| Variável | Onde encontrar |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Já preenchido: `https://wcxwngfuwwzylcmsgoyu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard Supabase → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase → Settings → API → `service_role` (⚠️ nunca commitar) |
| `INITIAL_ADMIN_EMAIL` | `alinebabo@yahoo.com.br` |
| `INITIAL_ADMIN_PASSWORD` | Uma senha temporária **forte** (>10 chars, com símbolos) |
| `INITIAL_ADMIN_NAME` | `Aline` |
| `RESEND_API_KEY` | **Gerar nova key** no dashboard da Resend (a antiga foi exposta em chat) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.srodontologiadigital.com.br` |

## 4. Aplicar as migrations
Se você usa o CLI do Supabase:
```bash
# Link com o projeto remoto uma única vez
supabase link --project-ref wcxwngfuwwzylcmsgoyu

# Enviar as migrations pro banco remoto
supabase db push
```

Ou execute os arquivos SQL manualmente no **SQL Editor** do dashboard, na ordem:
`0001` → `0002` → ... → `0011`.

## 5. Criar a super_admin (Aline)
Depois que as migrations passaram:

```bash
npm run hub:create-admin
```

O script:
1. Cria o usuário no Auth com a senha temporária
2. Marca o e-mail como confirmado
3. Cria a linha em `profiles` com role=`super_admin`, status=`active`, `must_change_password=true`
4. É idempotente — se o usuário já existir, apenas re-sincroniza o profile

⚠️ **Depois da primeira execução, remova `INITIAL_ADMIN_PASSWORD` do ambiente.**

## 6. Rodar em desenvolvimento
```bash
npm run dev
```
Abre em `http://localhost:3000`.

## 7. Fluxo de teste
1. Vá em `http://localhost:3000/login`
2. Faça login com `alinebabo@yahoo.com.br` + senha temporária
3. Você será **automaticamente redirecionada** para `/change-password`
4. Defina uma nova senha forte
5. Você chega no `/dashboard` do SR HUB

## 8. Testes de segurança rápidos
- Deslogar e tentar acessar `/dashboard` → deve mandar para `/login?next=/dashboard`
- Suspender manualmente o profile (`UPDATE profiles SET status='suspended'`) → o próximo request desloga
- Tentar `SELECT * FROM profiles` no SQL editor com um usuário JWT (não service role) — só retorna a própria linha e a do próprio org
- `curl http://localhost:3000/api/health` → deve retornar `{ ok: true, service: 'SR HUB', ... }`

## 9. Deploy
Recomendado: **Vercel**. Passos:
1. Conectar o repo `simplixTI/srodontologia`
2. Configurar todas as env vars do `.env.example`
3. Deploy — o Next 14 App Router + middleware funciona out-of-the-box
