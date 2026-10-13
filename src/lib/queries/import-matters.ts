import { supabase } from "@/lib/supabase";
import type { ImportEntityConfig, ImportResult } from "@/components/import/csv-import-dialog";

export const mattersImportConfig: ImportEntityConfig = {
  entityLabel: "Matters",
  fields: [
    { key: "matter_number", label: "Matter Number", required: true },
    { key: "matter_name", label: "Matter Name", required: true },
    { key: "client_name", label: "Client Name", required: true },
    { key: "description", label: "Description" },
    { key: "start_date", label: "Start Date", type: "date" },
    { key: "notes", label: "Notes" },
  ],
  onImport: async (rows): Promise<ImportResult> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
    if (!profile?.firm_id) throw new Error("No firm associated with this account.");

    // Matters reference a client by client_id (a UUID nobody importing
    // from a spreadsheet will have) — resolve by exact, case-insensitive
    // full_name match against the firm's existing clients instead. This is
    // why matters import should happen AFTER clients import, not before.
    const { data: clients } = await supabase.from("clients").select("id, full_name").eq("firm_id", profile.firm_id);
    const clientByName = new Map((clients ?? []).map((c) => [c.full_name.trim().toLowerCase(), c.id]));

    // Inserted one row at a time, not chunked like leads/clients: matters
    // have a unique (firm_id, matter_number) constraint, and a single
    // duplicate in a batch insert would abort the WHOLE batch — one at a
    // time means one bad matter_number only fails that one row, which
    // matters more here than raw import speed does.
    let successCount = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue; // unreachable given the loop bound, but required under tsconfig's noUncheckedIndexedAccess
      const clientName = String(r.client_name ?? "").trim().toLowerCase();
      const clientId = clientByName.get(clientName);
      if (!clientId) {
        errors.push({ row: i + 2, message: `No client found matching "${r.client_name}" — import clients first, or check spelling` });
        continue;
      }

      const { error } = await supabase.from("matters").insert({
        firm_id: profile.firm_id,
        matter_number: String(r.matter_number),
        matter_name: String(r.matter_name),
        client_id: clientId,
        description: (r.description as string) || null,
        start_date: (r.start_date as string) || new Date().toISOString().slice(0, 10),
        notes: (r.notes as string) || null,
        status: "intake",
      });

      if (error) {
        errors.push({ row: i + 2, message: error.message });
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      await supabase.from("activities").insert({
        firm_id: profile.firm_id,
        user_id: userData.user?.id,
        action: "matters.imported",
        entity_type: "import",
        entity_id: crypto.randomUUID(),
        metadata: { count: successCount, imported_entity: "matter" },
      });
    }

    return { successCount, errors };
  },
};
