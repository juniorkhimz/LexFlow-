import { supabase } from "@/lib/supabase";
import type { ImportEntityConfig, ImportResult } from "@/components/import/csv-import-dialog";
const CHUNK_SIZE = 200;

export const leadsImportConfig: ImportEntityConfig = {
  entityLabel: "Leads",
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "company", label: "Company" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "source", label: "Source" },
    { key: "estimated_value", label: "Estimated Value", type: "number" },
    { key: "notes", label: "Notes" },
  ],
  onImport: async (rows): Promise<ImportResult> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
    if (!profile?.firm_id) throw new Error("No firm associated with this account.");

    const firmId = profile.firm_id;
    const s = (v: unknown) => (v == null || v === "" ? null : String(v));
    const toInsert = rows.map((r) => ({
      firm_id: firmId,
      name: String(r.name ?? ""),
      company: s(r.company),
      email: s(r.email),
      phone: s(r.phone),
      source: s(r.source),
      estimated_value: r.estimated_value == null ? null : Number(r.estimated_value),
      notes: s(r.notes),
      status: "new" as const,
      priority: "medium" as const,
      created_by: userData.user?.id,
    }));

    let successCount = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const { error, count } = await supabase.from("leads").insert(chunk, { count: "exact" });
      if (error) {
        // A whole-chunk failure (e.g. an RLS violation, or a genuinely bad
        // row Postgres itself rejects) is reported once rather than
        // per-row, since we don't get per-row detail back from a batch
        // insert error — this is a real limitation of bulk insert versus
        // one-by-one, traded deliberately for import speed on large files.
        errors.push({ row: 0, message: `Batch starting at row ${i + 1}: ${error.message}` });
      } else {
        successCount += count ?? chunk.length;
      }
    }

    if (successCount > 0) {
      await supabase.from("activities").insert({
        firm_id: profile.firm_id,
        user_id: userData.user?.id,
        action: "leads.imported",
        entity_type: "import",
        entity_id: crypto.randomUUID(), // no single entity for a bulk import — this marks a distinct import event, not a real lead
        metadata: { count: successCount, imported_entity: "lead" },
      });
    }

    return { successCount, errors };
  },
};
