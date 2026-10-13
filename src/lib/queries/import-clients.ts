import { supabase } from "@/lib/supabase";
import type { ImportEntityConfig, ImportResult } from "@/components/import/csv-import-dialog";

const CHUNK_SIZE = 200;

export const clientsImportConfig: ImportEntityConfig = {
  entityLabel: "Clients",
  fields: [
    { key: "full_name", label: "Full Name", required: true },
    { key: "organization", label: "Organization" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "id_number", label: "ID / Passport Number" },
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
      full_name: String(r.full_name ?? ""),
      organization: s(r.organization),
      email: s(r.email),
      phone: s(r.phone),
      address: s(r.address),
      id_number: s(r.id_number),
      notes: s(r.notes),
      // No column in the source CSV maps cleanly to client_type
      // (individual/company/organization) without guessing — default to
      // 'individual' and let the firm correct it per-record afterward
      // rather than silently misclassifying a company as a person.
      client_type: "individual" as const,
      kyc_status: "pending" as const,
    }));

    let successCount = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const { error, count } = await supabase.from("clients").insert(chunk, { count: "exact" });
      if (error) {
        errors.push({ row: 0, message: `Batch starting at row ${i + 1}: ${error.message}` });
      } else {
        successCount += count ?? chunk.length;
      }
    }

    if (successCount > 0) {
      await supabase.from("activities").insert({
        firm_id: profile.firm_id,
        user_id: userData.user?.id,
        action: "clients.imported",
        entity_type: "import",
        entity_id: crypto.randomUUID(),
        metadata: { count: successCount, imported_entity: "client" },
      });
    }

    return { successCount, errors };
  },
};
