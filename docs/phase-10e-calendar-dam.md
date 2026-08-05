# Fase 10E · Agenda + DAM (Digital Asset Management)

## Migration `0049_phase10e_calendar_dam.sql`

### Agenda

| Tabela | Uso |
|---|---|
| `calendar_events` | Eventos por org com `kind` (9 tipos), `start_at`/`end_at`, `all_day`, `location`, `case_id`, `source_type/id` |
| `calendar_event_attendees` | Participantes (profile) com `response` (pending/accepted/declined/tentative) |

**Enum `calendar_event_kind`** — `pickup`, `delivery`, `production`, `meeting`,
`return`, `deadline`, `sla`, `internal`, `other`.

**RPC `generate_ics(event_id)`** — retorna string ICS mínima (VCALENDAR/VEVENT
com UID, DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION).

### DAM

| Tabela | Uso |
|---|---|
| `file_tags` | Tags coloridas (org-scoped) |
| `file_tag_assignments` | M:N `case_files` ↔ `file_tags` |
| `file_collections` | Pastas virtuais (`is_shared` false = pessoal do criador) |
| `file_collection_items` | Files em coleções com `position` |
| `file_favorites` | Favoritos por usuário |

**View `v_dam_file_summary`** — agrega `tag_names[]`, `is_favorite` (usa
`auth.uid()`), `collection_count` por arquivo.

### RLS

- Todas as tabelas: internal-only, org-scoped
- `file_collections` seleciona também `is_shared OR created_by = auth.uid()`
- `file_favorites` só o próprio usuário

## Feature layer

### `src/features/calendar/`
- **types.ts** — CalendarEvent, Attendee com labels/colors por kind
- **validations/calendar.ts** — `calendarEventSchema` com refine que valida
  `end_at >= start_at`; extractor FormData
- **queries.ts** — `listEvents(range)`, `getEvent`, `listEventsUpcoming`, `generateIcs`
- **service.ts** — CRUD completo (create/update/cancel/delete)
- **actions.ts** — 4 server actions com role gate internal-only

### `src/features/dam/`
- **types.ts** — FileTag, FileCollection, DamFileSummary, FileWithMeta
- **validations/dam.ts** — 4 schemas (tag, collection, tagAssign, collectionAdd)
- **queries.ts** — `listTags`, `listCollections`, `listRecentFiles` (com JOIN em
  v_dam_file_summary + favoritos), `listCollectionFiles`, `listFavorites`
- **service.ts** — CRUDs + `assignTag`, `unassignTag`, `addFileToCollection`,
  `removeFileFromCollection`, `toggleFavorite`
- **actions.ts** — 9 server actions

## Rotas UI

### Agenda
| Rota | Descrição |
|---|---|
| `/agenda` | Grid mensal (7 colunas) com eventos colorizados, navegação prev/next/hoje, legenda |
| `/agenda/novo` | Form completo (kind, título, início/fim, dia inteiro, local, descrição, cor) |
| `/agenda/[eventId]` | Detalhe + ações (cancelar/excluir) + download .ics |

**Endpoint API**: `GET /api/agenda/[eventId]/ics` — retorna
`Content-Type: text/calendar` via RPC `generate_ics`.

### DAM
| Rota | Descrição |
|---|---|
| `/arquivos` | Grid de arquivos (60 recentes) com busca por nome/caso, filtro por tag, toggle favorito, badges de tags |
| `/arquivos/tags` | CRUD de tags coloridas |
| `/arquivos/colecoes` | CRUD de coleções (compartilhada vs pessoal) |
| `/arquivos/favoritos` | Meus favoritos |

Nav: `/agenda` e `/arquivos` ativos no grupo Estúdio.

## Testes

- **`tests/calendar-dam-validations.test.ts`** — 20 testes
- **`e2e/calendar-dam.spec.ts`** — 6 smoke tests

Suite total: **197 testes vitest passando** · typecheck 0 erros.

## Próximos passos

- Integração Google Calendar / Outlook via OAuth
- Recurring events (repetição via RRULE)
- Attendees UI + notificação por email quando criado
- Preview inline de imagem/PDF no grid DAM
- Editor de posição por drag em collection items
- Filtro por período no /arquivos
- OCR indexado no busca do DAM (usar case_files existente)
