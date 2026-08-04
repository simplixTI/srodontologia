# SR HUB · Case Checklist Engine

Motor de checklists por tipo de caso. Impede que casos cheguem incompletos ao laboratório.

## Modelo de dados

### `case_types` (0012)
Um por tipo de trabalho (Protocolo, Coroa, Guia, Faceta, Laminado, Modelo). Fully editable pelo admin.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| organization_id | uuid | FK org (multitenancy) |
| code | text | slug único por org (`PROTOCOLO_IMPLANTE`) |
| name | text | nome exibido |
| description | text | opcional |
| icon | text | nome de ícone Lucide |
| active | bool | dentistas só veem ativos |
| sort_order | int | menor primeiro |

### `case_checklist_templates` (0013)
Itens que compõem o checklist de cada tipo.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| case_type_id | uuid | FK |
| code | text | opcional, para auto-classificação futura |
| title | text | |
| description | text | opcional |
| category | enum | `stl`, `dicom_tomography`, `intraoral_photo`, `extraoral_photo`, `xray`, `planning`, `material_spec`, `shade`, `notes`, `bite_registration`, `other`, `obj` |
| required | bool | trava envio do caso se true |
| accepted_file_types | text[] | extensões (ex.: `{stl,obj}`) |
| minimum_files | int | ≥ 0 |
| maximum_files | int | ≥ minimum |
| sort_order | int | |

## RLS

- **Internal staff** (super_admin, admin, commercial, technical_planning, production, finance, logistics): SELECT tudo do próprio org
- **Dentistas**: SELECT apenas de tipos `active = true` do próprio org
- **Escrita**: apenas `super_admin` e `admin`

## Seed padrão

Migration `0014_seed_default_checklists.sql` popula os 6 tipos + todos os itens especificados. Idempotente — safe re-run.

## UI

Rota | Descrição
-----|----------
`/checklists` | Grid de cards, um por tipo de caso; conta itens totais e obrigatórios; toggle ativo/inativo visual
`/checklists/new` | Formulário para criar tipo de caso
`/checklists/[id]` | Editor completo do tipo: metadata (código, nome, descrição, ícone, ordem, ativo), lista de itens com reordenação (↑↓), toggle obrigatório/opcional, edição inline, remoção, adição de novos itens; painel lateral com preview de como o dentista vai ver

## Actions

`src/features/checklists/actions/case-types.ts`
- `createCaseTypeAction`, `updateCaseTypeAction`, `deleteCaseTypeAction`, `toggleCaseTypeActive`

`src/features/checklists/actions/templates.ts`
- `createTemplateItemAction`, `updateTemplateItemAction`, `deleteTemplateItemAction`, `toggleRequiredAction`, `reorderItemAction`

Todos protegidos por `requireAdmin()` (super_admin ou admin) + RLS no banco.

## Preview do dentista

`DentistPreview.tsx` renderiza o checklist com o mesmo aspecto que o portal do dentista terá (Fase 4):
- Itens obrigatórios com borda rósea
- Barra de progresso 0 → 100%
- Aviso "Faltam informações obrigatórias" quando há requireds
- Botão "Enviar caso" bloqueado

## Auto-classificação de upload (futuro)

O campo `category` + `accepted_file_types` de cada template já permitem, na Fase 3 (upload de arquivos), que o sistema tente combinar automaticamente:

```ts
// exemplo simplificado
function guessTemplate(file: File, templates: TemplateItem[]) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return templates.find(t =>
    t.accepted_file_types.includes(ext ?? '') &&
    !alreadyFilledSlots(t.id)
  );
}
```

## Preparação para IA (futuro)

O schema está pronto para receber uma coluna `ai_verified` em `case_checklist_items` (tabela de instância, criada na Fase 3 junto com `cases`) e um serviço de análise que confere:
- Se STLs parecem válidos (mesh não vazio, tamanho razoável)
- Se tomografia tem número mínimo de slices
- Se fotos têm resolução mínima
- Se descrição clínica menciona os campos esperados

## Próximos passos (Fase 3)

Para o dentista efetivamente USAR este engine, faltam:
1. Tabela `patients` (com minimização LGPD)
2. Tabela `cases` (com `case_type_id` FK → `case_types`)
3. Tabela `case_checklist_items` (instância por caso, referenciando `template_id`)
4. Tabela `case_files` + bucket `case-files` no Storage
5. Rota `/portal/casos/novo` no portal do dentista com wizard + upload com auto-classificação
6. Validação server-side antes de submit: todos os `required` completos
