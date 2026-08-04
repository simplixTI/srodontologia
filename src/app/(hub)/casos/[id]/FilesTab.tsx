'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Box,
  ScanLine,
  Download,
  Trash2,
  Link2,
  Loader2,
  Eye,
  X
} from 'lucide-react';
import type { CaseFile } from '@/features/files/queries';
import type { CaseChecklistItem } from '@/features/cases/queries';
import {
  uploadCaseFileAction,
  deleteCaseFileAction,
  linkFileToChecklistItemAction,
  getSignedFileUrlAction
} from '@/features/files/actions';

type UploadItem = {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
};

export function FilesTab({
  caseId,
  initialFiles,
  checklistItems,
  readOnly
}: {
  caseId: string;
  initialFiles: CaseFile[];
  checklistItems: CaseChecklistItem[];
  readOnly: boolean;
}) {
  const [files, setFiles] = useState<CaseFile[]>(initialFiles);
  const [inFlight, setInFlight] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<{ url: string; name: string; kind: 'image' | 'pdf' | 'other' } | null>(null);
  const confirm = useConfirm();

  const uploadOne = useCallback(
    async (file: File): Promise<void> => {
      const tempId = crypto.randomUUID();
      setInFlight((prev) => [
        ...prev,
        { id: tempId, name: file.name, size: file.size, status: 'uploading' }
      ]);

      const fd = new FormData();
      fd.append('file', file);

      // Try to auto-suggest a checklist item by extension
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const suggested = checklistItems.find(
        (i) => i.accepted_file_types_snapshot.includes(ext) && !filesAlreadyOn(i.id).length
      );
      if (suggested) fd.append('checklist_item_id', suggested.id);

      try {
        const result = await uploadCaseFileAction(caseId, fd);
        if (!result.ok) {
          setInFlight((prev) =>
            prev.map((it) => (it.id === tempId ? { ...it, status: 'error', error: result.error } : it))
          );
          return;
        }
        // Refresh from server through parent revalidation would be ideal, but we
        // do a client-side optimistic prepend so the user sees it immediately.
        // The server has revalidated the path — on next full render it's canonical.
        setInFlight((prev) => prev.map((it) => (it.id === tempId ? { ...it, status: 'done' } : it)));
        // Keep the placeholder visible for a moment
        setTimeout(() => {
          setInFlight((prev) => prev.filter((it) => it.id !== tempId));
          // Reload files via refresh trick (would require router.refresh in real app)
          window.location.reload();
        }, 400);
      } catch (e) {
        setInFlight((prev) =>
          prev.map((it) =>
            it.id === tempId ? { ...it, status: 'error', error: (e as Error).message } : it
          )
        );
      }
    },
    [caseId, checklistItems]
  );

  const filesAlreadyOn = useCallback(
    (checklistItemId: string) => files.filter((f) => f.checklist_item_id === checklistItemId),
    [files]
  );

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    for (const f of Array.from(list)) {
      await uploadOne(f);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const changeLink = (fileId: string, itemId: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, checklist_item_id: itemId || null } : f)));
    startTransition(async () => {
      try {
        await linkFileToChecklistItemAction(fileId, caseId, itemId || null);
        toast.success('Arquivo vinculado');
      } catch (e) {
        toast.error('Erro ao vincular', { description: (e as Error).message });
      }
    });
  };

  const removeFile = async (fileId: string) => {
    const ok = await confirm({
      title: 'Remover arquivo?',
      description: 'Esta ação não pode ser desfeita. O arquivo será excluído do storage.',
      confirmLabel: 'Remover',
      tone: 'danger'
    });
    if (!ok) return;
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    startTransition(async () => {
      try {
        await deleteCaseFileAction(fileId, caseId);
        toast.success('Arquivo removido');
      } catch (e) {
        toast.error('Erro ao remover', { description: (e as Error).message });
        window.location.reload();
      }
    });
  };

  const download = async (fileId: string, name: string, ext: string | null) => {
    const url = await getSignedFileUrlAction(fileId, 120);
    if (!url) {
      toast.error('Não foi possível gerar link de download');
      return;
    }
    // Open new tab
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.download = name;
    a.click();
  };

  const openPreview = async (file: CaseFile) => {
    const url = await getSignedFileUrlAction(file.id, 300);
    if (!url) return;
    const kind: 'image' | 'pdf' | 'other' =
      ['jpg', 'jpeg', 'png', 'webp'].includes(file.extension ?? '') ? 'image'
        : file.extension === 'pdf' ? 'pdf'
        : 'other';
    setPreview({ url, name: file.original_name, kind });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-white">Arquivos do caso</h3>
          <p className="mt-1 text-xs text-white/50">
            {files.length} arquivo{files.length !== 1 ? 's' : ''} · buckets privados · URLs assinadas
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={
            'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ' +
            (isDragOver
              ? 'border-gold/60 bg-gold/[0.05]'
              : 'border-gold/20 bg-white/[0.02] hover:border-gold/40')
          }
        >
          <div className="grid h-12 w-12 place-items-center rounded-full border border-gold/25 bg-black/40">
            <Upload className="h-5 w-5 text-gold-100" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm text-white">
            {isDragOver ? 'Solte para enviar' : 'Arraste arquivos aqui'}
          </p>
          <p className="mt-1 text-xs text-white/50">
            ou{' '}
            <button
              onClick={() => inputRef.current?.click()}
              className="text-gold-100 underline underline-offset-2 hover:text-gold-50"
            >
              selecione do dispositivo
            </button>
          </p>
          <p className="mt-3 text-[0.55rem] uppercase tracking-[0.25em] text-white/30">
            jpg, png, webp, heic · pdf · stl, obj · dcm, dicom, zip · máx 50MB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.stl,.obj,.dcm,.dicom,.zip,image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {readOnly && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Caso já enviado — novos uploads bloqueados.
        </p>
      )}

      {/* In-flight uploads */}
      {inFlight.length > 0 && (
        <ul className="space-y-2">
          {inFlight.map((it) => (
            <li
              key={it.id}
              className={
                'flex items-center gap-3 rounded-xl border p-3 text-sm ' +
                (it.status === 'error'
                  ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                  : it.status === 'done'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  : 'border-gold/20 bg-white/[0.03] text-white')
              }
            >
              {it.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-gold-100" strokeWidth={1.5} />}
              {it.status === 'done' && <FileText className="h-4 w-4" strokeWidth={1.5} />}
              {it.status === 'error' && <X className="h-4 w-4" strokeWidth={1.5} />}
              <span className="truncate flex-1">{it.name}</span>
              <span className="text-xs text-white/40">{fmtSize(it.size)}</span>
              {it.error && <span className="text-xs">{it.error}</span>}
            </li>
          ))}
        </ul>
      )}

      {/* Files list */}
      {files.length === 0 ? (
        <p className="rounded-2xl border border-gold/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
          Nenhum arquivo enviado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="rounded-2xl border border-gold/10 bg-white/[0.02] p-4"
            >
              <div className="flex items-start gap-3">
                <FileIcon extension={f.extension ?? ''} />
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => openPreview(f)}
                    className="block text-left text-sm font-medium text-white hover:text-gold-100"
                  >
                    {f.original_name}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6rem] uppercase tracking-[0.25em] text-white/40">
                    <span>{(f.extension ?? '').toUpperCase() || '—'}</span>
                    <span>·</span>
                    <span>{fmtSize(f.file_size)}</span>
                    <span>·</span>
                    <span>{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                    {f.visibility === 'internal' && (
                      <span className="rounded-full border border-white/15 bg-white/[0.03] px-1.5 py-0.5 text-white/50">
                        interno
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openPreview(f)}
                    title="Preview"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-gold/40 hover:text-gold-100"
                  >
                    <Eye className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => download(f.id, f.original_name, f.extension)}
                    title="Download"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-gold/40 hover:text-gold-100"
                  >
                    <Download className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => removeFile(f.id)}
                      title="Remover"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-200"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* Checklist link selector */}
              {checklistItems.length > 0 && !readOnly && (
                <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                  <Link2 className="h-3 w-3 text-white/40" strokeWidth={1.5} />
                  <span className="text-[0.6rem] uppercase tracking-[0.25em] text-white/40 shrink-0">
                    Vinculado a
                  </span>
                  <select
                    value={f.checklist_item_id ?? ''}
                    onChange={(e) => changeLink(f.id, e.target.value)}
                    className="h-8 flex-1 rounded-lg border border-gold/10 bg-black/40 px-2 text-xs text-white focus:border-gold/50 focus:outline-none"
                  >
                    <option value="" className="bg-black">— sem vínculo —</option>
                    {checklistItems.map((it) => (
                      <option key={it.id} value={it.id} className="bg-black">
                        {it.title_snapshot}{it.required_snapshot ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {f.checklist_item_id && readOnly && (
                <div className="mt-2 text-[0.6rem] uppercase tracking-[0.25em] text-gold-100/80">
                  → {checklistItems.find((it) => it.id === f.checklist_item_id)?.title_snapshot ?? 'item removido'}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-gold/25 bg-black"
          >
            <div className="flex items-center justify-between border-b border-gold/10 px-4 py-3">
              <span className="truncate text-sm text-white">{preview.name}</span>
              <button
                onClick={() => setPreview(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 hover:border-gold/40 hover:text-gold-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto p-2">
              {preview.kind === 'image' && (
                // signed URL from Supabase — use <img> because next/image can't rewrite signed URLs
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.name} className="max-h-[80vh] object-contain" />
              )}
              {preview.kind === 'pdf' && (
                <iframe src={preview.url} className="h-[80vh] w-[90vw] max-w-4xl bg-white" />
              )}
              {preview.kind === 'other' && (
                <div className="flex h-64 items-center justify-center p-10 text-center text-white/60">
                  Preview não disponível para este formato. Use o botão download.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileIcon({ extension }: { extension: string }) {
  const cls = 'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold/20 bg-black/40';
  const strokeProps = { strokeWidth: 1.5 } as const;
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(extension))
    return <div className={cls}><ImageIcon className="h-4 w-4 text-gold-100" {...strokeProps} /></div>;
  if (['stl', 'obj'].includes(extension))
    return <div className={cls}><Box className="h-4 w-4 text-gold-100" {...strokeProps} /></div>;
  if (['dcm', 'dicom', 'zip'].includes(extension))
    return <div className={cls}><ScanLine className="h-4 w-4 text-gold-100" {...strokeProps} /></div>;
  return <div className={cls}><FileText className="h-4 w-4 text-gold-100" {...strokeProps} /></div>;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
