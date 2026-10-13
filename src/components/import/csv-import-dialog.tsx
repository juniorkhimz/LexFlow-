import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Papa from "papaparse";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/states";

export interface ImportFieldConfig {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "number" | "date";
}

export interface ImportResult {
  successCount: number;
  errors: { row: number; message: string }[];
}

export interface ImportEntityConfig {
  entityLabel: string; // e.g. "Leads"
  fields: ImportFieldConfig[];
  /** Called once with the full set of validly-mapped, type-coerced rows. Implementation chunks its own inserts. */
  onImport: (rows: Record<string, string | number | null>[]) => Promise<ImportResult>;
}

const NONE_VALUE = "__skip__";

function guessMapping(csvHeaders: string[], fields: ImportFieldConfig[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of csvHeaders) {
    const normalized = header.trim().toLowerCase().replace(/[\s_-]+/g, "");
    const match = fields.find((f) => {
      const fieldNorm = f.key.toLowerCase().replace(/[\s_-]+/g, "");
      const labelNorm = f.label.toLowerCase().replace(/[\s_-]+/g, "");
      return normalized === fieldNorm || normalized === labelNorm;
    });
    if (match) mapping[header] = match.key;
  }
  return mapping;
}

function validateAndCoerceRow(
  raw: Record<string, string>,
  mapping: Record<string, string>,
  fields: ImportFieldConfig[],
): { row: Record<string, string | number | null>; error: string | null } {
  const row: Record<string, string | number | null> = {};
  for (const [csvHeader, targetKey] of Object.entries(mapping)) {
    if (targetKey === NONE_VALUE) continue;
    const field = fields.find((f) => f.key === targetKey);
    const rawValue = raw[csvHeader]?.trim() ?? "";
    if (!rawValue) {
      row[targetKey] = null;
      continue;
    }
    if (field?.type === "number") {
      const n = Number(rawValue.replace(/,/g, ""));
      if (Number.isNaN(n)) return { row, error: `"${csvHeader}" value "${rawValue}" is not a valid number` };
      row[targetKey] = n;
    } else if (field?.type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
        return { row, error: `"${csvHeader}" value "${rawValue}" is not a valid email` };
      }
      row[targetKey] = rawValue;
    } else if (field?.type === "date") {
      const d = new Date(rawValue);
      if (Number.isNaN(d.getTime())) return { row, error: `"${csvHeader}" value "${rawValue}" is not a valid date` };
      row[targetKey] = d.toISOString().slice(0, 10);
    } else {
      row[targetKey] = rawValue;
    }
  }
  for (const field of fields) {
    if (field.required && (row[field.key] === null || row[field.key] === undefined)) {
      return { row, error: `Missing required field "${field.label}"` };
    }
  }
  return { row, error: null };
}

export function CsvImportDialog({
  open, onOpenChange, config,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: ImportEntityConfig;
}) {
  const [step, setStep] = React.useState<"upload" | "map" | "importing" | "done">("upload");
  const [csvRows, setCsvRows] = React.useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const reset = () => {
    setStep("upload");
    setCsvRows([]);
    setCsvHeaders([]);
    setMapping({});
    setParseError(null);
    setResult(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const downloadTemplate = () => {
    const headers = config.fields.map((f) => f.label).join(",");
    const blob = new Blob([headers + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.entityLabel.toLowerCase()}-import-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File) => {
    setParseError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(results.errors[0]?.message ?? "Failed to parse CSV file.");
          return;
        }
        const headers = results.meta.fields ?? [];
        if (headers.length === 0 || results.data.length === 0) {
          setParseError("This file appears to be empty.");
          return;
        }
        setCsvHeaders(headers);
        setCsvRows(results.data);
        setMapping(guessMapping(headers, config.fields));
        setStep("map");
      },
      error: (err) => setParseError(err.message),
    });
  };

  const runImport = async () => {
    setStep("importing");
    const validated: Record<string, string | number | null>[] = [];
    const errors: { row: number; message: string }[] = [];
    csvRows.forEach((raw, i) => {
      const { row, error } = validateAndCoerceRow(raw, mapping, config.fields);
      if (error) {
        errors.push({ row: i + 2, message: error }); // +2: 1-indexed + header row
      } else {
        validated.push(row);
      }
    });

    if (validated.length === 0) {
      setResult({ successCount: 0, errors });
      setStep("done");
      return;
    }

    try {
      const importResult = await config.onImport(validated);
      setResult({
        successCount: importResult.successCount,
        errors: [...errors, ...importResult.errors],
      });
    } catch (err) {
      setResult({
        successCount: 0,
        errors: [...errors, { row: 0, message: err instanceof Error ? err.message : "Import failed." }],
      });
    }
    setStep("done");
  };

  const requiredFieldsMapped = config.fields
    .filter((f) => f.required)
    .every((f) => Object.values(mapping).includes(f.key));

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink-950/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface-raised p-5 shadow-xl">
          <Dialog.Title className="font-display text-lg font-semibold text-ink-900">Import {config.entityLabel} from CSV</Dialog.Title>

          {step === "upload" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ink-500">
                Upload a CSV exported from your current system (Excel, Google Sheets, another practice management
                tool). You'll map its columns to {config.entityLabel.toLowerCase()} fields on the next step — column
                names don't need to match exactly.
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-sm text-brass-600 hover:underline"
              >
                <Download className="h-4 w-4" /> Download a template CSV
              </button>
              <div>
                <Label htmlFor="csv-file">CSV file</Label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-nav-bg file:px-3 file:py-1.5 file:text-sm file:text-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
              {parseError && <p className="text-sm text-danger">{parseError}</p>}
            </div>
          )}

          {step === "map" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ink-500">
                {csvRows.length} rows found. Map each column to a {config.entityLabel.toLowerCase()} field, or leave as "Skip".
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-2">
                    <span className="w-40 shrink-0 truncate text-sm text-ink-700" title={header}>{header}</span>
                    <select
                      className="h-9 flex-1 rounded-md border border-ink-200 bg-surface-raised px-2 text-sm"
                      value={mapping[header] ?? NONE_VALUE}
                      onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                    >
                      <option value={NONE_VALUE}>Skip this column</option>
                      {config.fields.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!requiredFieldsMapped && (
                <p className="text-sm text-warning">
                  Map all required fields (*) before importing: {config.fields.filter((f) => f.required).map((f) => f.label).join(", ")}
                </p>
              )}
              <div className="rounded-md border border-ink-100 bg-ink-50 p-2 text-xs text-ink-600">
                Preview (first row): {JSON.stringify(csvRows[0])}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                <Button onClick={runImport} disabled={!requiredFieldsMapped}>
                  Import {csvRows.length} rows
                </Button>
              </div>
            </div>
          )}

          {step === "importing" && <LoadingState label="Importing…" />}

          {step === "done" && result && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">{result.successCount} of {csvRows.length} rows imported successfully.</span>
              </div>
              {result.errors.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{result.errors.length} rows skipped:</span>
                  </div>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-ink-100 bg-ink-50 p-2 text-xs text-ink-700">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e.row > 0 ? `Row ${e.row}: ` : ""}{e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { reset(); }}>Import another file</Button>
                <Button onClick={() => handleClose(false)}>Done</Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
