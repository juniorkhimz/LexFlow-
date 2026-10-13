import { useDocumentTitle } from "@/hooks/use-document-title";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Upload, Download, Trash2, Pencil, FileText, Sparkles, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DateDisplay } from "@/components/ui/display";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useClientOptions } from "@/lib/queries/clients";
import { usePlanLimits } from "@/lib/queries/plan-limits";
import { useDocumentAiSummary } from "@/lib/queries/ai-gateway";
import {
  useDocuments, useUploadDocument, useRenameDocument, useDeleteDocument, getSignedDocumentUrl, DOCUMENT_CATEGORIES,
} from "@/lib/queries/documents";
import type { DocumentCategory } from "@/types/database";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(1)} ${units[i]}`;
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const upload = useUploadDocument();
  const { data: clients } = useClientOptions();
  const { data: limits } = usePlanLimits();
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] = React.useState<DocumentCategory>("other");
  const [clientId, setClientId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const overDocCount = Boolean(limits?.maxDocuments != null && limits.currentDocumentCount >= limits.maxDocuments);
  const wouldExceedStorage = Boolean(
    file && limits?.maxStorageMb != null &&
    limits.currentStorageBytes + file.size > limits.maxStorageMb * 1024 * 1024,
  );
  const quotaBlocked = overDocCount || wouldExceedStorage;

  const submit = async () => {
    setError(null);
    if (!file) { setError("Choose a file to upload."); return; }
    if (quotaBlocked) {
      setError(
        overDocCount
          ? "Your firm's plan document limit has been reached — upgrade in Settings → Billing to upload more."
          : "This file would exceed your firm's plan storage limit — upgrade in Settings → Billing, or free up space.",
      );
      return;
    }
    try {
      await upload.mutateAsync({ file, category, clientId: clientId || null });
      setFile(null);
      onOpenChange(false);
    } catch {
      setError("Upload failed. Please try again.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">Upload document</Dialog.Title>
          {limits && (limits.maxDocuments != null || limits.maxStorageMb != null) && (
            <p className="mt-1 text-xs text-ink-400">
              {limits.maxDocuments != null && `${limits.currentDocumentCount} of ${limits.maxDocuments} documents`}
              {limits.maxDocuments != null && limits.maxStorageMb != null && " · "}
              {limits.maxStorageMb != null && `${(limits.currentStorageBytes / (1024 * 1024)).toFixed(0)} of ${limits.maxStorageMb} MB used`}
              {" "}({limits.plan} plan)
            </p>
          )}
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="file">File</Label>
              <input
                id="file"
                type="file"
                className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-nav-bg file:px-3 file:py-1.5 file:text-sm file:text-white"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">Category</Label>
                <select id="category" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
                  {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="client_id">Client (optional)</Label>
                <select id="client_id" className="h-9 w-full rounded-md border border-ink-200 bg-surface-raised px-3 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">None</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={submit} disabled={upload.isPending || quotaBlocked}>{upload.isPending ? "Uploading…" : "Upload"}</Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function DocumentsPage() {
  useDocumentTitle("Documents");
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { page, setPage, from, to } = usePagination();
  const { data, isLoading, isError, refetch } = useDocuments({ search: search || undefined, from, to });

  React.useEffect(() => setPage(0), [search]);
  const renameDoc = useRenameDocument();
  const deleteDoc = useDeleteDocument();
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const aiSummary = useDocumentAiSummary();
  const [expandedAiId, setExpandedAiId] = React.useState<string | null>(null);
  const [aiResults, setAiResults] = React.useState<Record<string, { text?: string; disclaimer?: string; enabled?: boolean; message?: string; error?: string }>>({});

  const handleSummarize = async (docId: string) => {
    if (expandedAiId === docId) {
      setExpandedAiId(null);
      return;
    }
    setExpandedAiId(docId);
    if (aiResults[docId]) return; // already have a result cached for this document
    try {
      const result = await aiSummary.mutateAsync(docId);
      setAiResults((prev) => ({ ...prev, [docId]: result }));
    } catch (err) {
      setAiResults((prev) => ({ ...prev, [docId]: { error: err instanceof Error ? err.message : "Something went wrong." } }));
    }
  };

  const handleDownload = async (id: string, storagePath: string) => {
    setDownloadingId(id);
    setDownloadError(null);
    try {
      const url = await getSignedDocumentUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setDownloadError("Could not generate a download link. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Private, firm-scoped document storage with signed-URL downloads."
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Upload className="h-4 w-4" /> Upload</Button>}
      />

      <div className="mb-4">
        <SearchInput className="max-w-xs" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {downloadError && <p className="mb-3 text-sm text-danger">{downloadError}</p>}

      {isLoading ? (
        <LoadingState label="Loading documents…" />
      ) : isError ? (
        <ErrorState message="Unable to load documents." onRetry={() => refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Upload contracts, correspondence, and evidence — stored privately per firm."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Upload className="h-4 w-4" /> Upload</Button>}
        />
      ) : (
        <>
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface-raised">
            {data.rows.map((doc) => (
            <React.Fragment key={doc.id}>
            <li className="flex flex-wrap items-center gap-3 px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-ink-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{doc.name}</p>
                <p className="text-xs text-ink-400">
                  {doc.clients?.full_name ?? doc.matters?.matter_name ?? "Unlinked"} · {formatBytes(doc.size_bytes)} · <DateDisplay value={doc.created_at} />
                </p>
              </div>
              <StatusBadge status={doc.category} />
              <button
                onClick={() => handleSummarize(doc.id)}
                disabled={aiSummary.isPending && expandedAiId === doc.id}
                className="text-ink-400 hover:text-brass-600 disabled:opacity-50"
                aria-label="Summarize with AI"
                title="Summarize with AI"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDownload(doc.id, doc.storage_path)}
                disabled={downloadingId === doc.id}
                className="text-ink-400 hover:text-ink-800 disabled:opacity-50"
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const next = window.prompt("Rename document", doc.name);
                  if (next && next.trim() && next !== doc.name) renameDoc.mutate({ id: doc.id, name: next.trim() });
                }}
                className="text-ink-400 hover:text-ink-800"
                aria-label="Rename"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteDoc.mutate({ id: doc.id, storage_path: doc.storage_path })}
                className="text-ink-400 hover:text-danger"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
            {expandedAiId === doc.id && (() => {
              const result = aiResults[doc.id];
              return (
                <li className="border-t border-ink-50 bg-ink-50/50 px-4 py-3">
                  {aiSummary.isPending && !result ? (
                    <LoadingState label="Analyzing document…" />
                  ) : result?.error ? (
                    <p className="text-sm text-danger">{result.error}</p>
                  ) : result && !result.enabled ? (
                    <EmptyState title="AI document insights aren't enabled yet" description={result.message} />
                  ) : result?.enabled ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>{result.disclaimer}</p>
                      </div>
                      <div className="whitespace-pre-wrap rounded-md border border-ink-100 bg-surface-raised p-3 text-sm text-ink-800">
                        {result.text}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })()}
            </React.Fragment>
          ))}
          </ul>
          <Pagination page={page} onPageChange={setPage} count={data.count} rowCount={data.rows.length} />
        </>
      )}

      <UploadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
