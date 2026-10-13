import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DocumentCategory, DocumentRow } from "@/types/database";

const documentKeys = {
  all: ["documents"] as const,
  list: (f: { search?: string; from?: number; to?: number }) => [...documentKeys.all, "list", f] as const,
};

export function useDocuments(filters: { search?: string; from?: number; to?: number }) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*, clients(full_name), matters(matter_name)", { count: "exact" })
        .order("created_at", { ascending: false });
      if (filters.search) query = query.ilike("name", `%${filters.search}%`);
      if (filters.from != null && filters.to != null) query = query.range(filters.from, filters.to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data as (DocumentRow & { clients: { full_name: string } | null; matters: { matter_name: string } | null })[], count };
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; category: DocumentCategory; clientId?: string | null; matterId?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      // Path convention {firm_id}/... matches the storage RLS policies in
      // supabase/migrations/0004_storage.sql, which check the first path
      // segment against the caller's own firm.
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${profile.firm_id}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("documents").upload(path, input.file, {
        contentType: input.file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("documents")
        .insert({
          firm_id: profile.firm_id,
          client_id: input.clientId ?? null,
          matter_id: input.matterId ?? null,
          uploaded_by: userData.user?.id,
          name: input.file.name,
          storage_path: path,
          category: input.category,
          mime_type: input.file.type || null,
          size_bytes: input.file.size,
        })
        .select()
        .single();
      if (error) {
        // Row insert failed after upload succeeded — clean up the orphaned
        // object rather than leaving storage and the documents table out of sync.
        await supabase.storage.from("documents").remove([path]);
        throw error;
      }

      await supabase.from("activities").insert({
        firm_id: profile.firm_id, user_id: userData.user?.id, action: "document.uploaded",
        entity_type: "document", entity_id: data.id, metadata: { name: data.name },
      });

      return data as DocumentRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

// Documents are private — always fetch via a short-lived signed URL, never
// supabase.storage.from(...).getPublicUrl(), which the bucket doesn't
// support anyway since it's created with public: false.
export async function getSignedDocumentUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export function useRenameDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.from("documents").update({ name }).eq("id", id).select().single();
      if (error) throw error;
      return data as DocumentRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      const { error: storageError } = await supabase.storage.from("documents").remove([doc.storage_path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "contracts", "court_documents", "correspondence", "identification", "evidence", "agreements", "other",
];
