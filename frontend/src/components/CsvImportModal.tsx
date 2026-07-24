import { useRef, useState } from 'react';
import { bulkImportDrugs } from '../api/drugs';

// Expected CSV column headers (case-insensitive)
const CSV_COLUMNS = [
  'name', 'genericname', 'dosageform', 'strength', 'unit',
  'category', 'reorderthreshold', 'unitcost', 'sellingprice', 'iscontrolledsubstance',
];

const CSV_TEMPLATE = [
  'Name,GenericName,DosageForm,Strength,Unit,Category,ReorderThreshold,UnitCost,SellingPrice,IsControlledSubstance',
  'Amoxicillin,Amoxicillin Trihydrate,Capsule,500mg,Capsules,Antibiotics,20,1.50,3.00,false',
  'Metformin,Metformin HCl,Tablet,500mg,Tablets,Antidiabetics,15,0.80,2.00,false',
  'Codeine Phosphate,Codeine,Tablet,30mg,Tablets,Controlled Substance,10,2.00,5.50,true',
].join('\n');

interface ParsedRow {
  name: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  unit: string;
  category?: string;
  reorderThreshold: number;
  unitCost: number;
  sellingPrice: number;
  isControlledSubstance: boolean;
}

interface CsvImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function parseCsvRow(headers: string[], values: string[]): ParsedRow | null {
  const get = (key: string) => values[headers.indexOf(key)]?.trim() ?? '';
  const name = get('name');
  if (!name) return null;

  return {
    name,
    genericName:           get('genericname') || undefined,
    dosageForm:            get('dosageform') || undefined,
    strength:              get('strength') || undefined,
    unit:                  get('unit') || 'Tablets',
    category:              get('category') || undefined,
    reorderThreshold:      parseInt(get('reorderthreshold')) || 10,
    unitCost:              parseFloat(get('unitcost')) || 0,
    sellingPrice:          parseFloat(get('sellingprice')) || 0,
    isControlledSubstance: get('iscontrolledsubstance').toLowerCase() === 'true',
  };
}

export default function CsvImportModal({ onClose, onSuccess }: CsvImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ Added: number; Skipped: number } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { setParseError('CSV must have a header row and at least one data row.'); return; }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const missing = CSV_COLUMNS.filter(c => !['genericname','dosageform','strength','unit','category'].includes(c) && !headers.includes(c));
        if (missing.length > 0) { setParseError(`Missing required columns: ${missing.join(', ')}`); return; }

        const parsed: ParsedRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row = parseCsvRow(headers, values);
          if (row) parsed.push(row);
        }

        if (parsed.length === 0) { setParseError('No valid rows found in the file.'); return; }
        setRows(parsed);
      } catch {
        setParseError('Failed to parse file. Ensure it is a valid CSV format.');
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await bulkImportDrugs(rows);
      setResult(res);
      onSuccess();
    } catch {
      setParseError('Import failed. Please check the data and try again.');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kaycare_drug_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-modal w-full max-w-3xl rounded-2xl border border-slate-700/80 p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Bulk CSV Drug Catalog Import
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Upload a CSV file to add multiple medications at once. Duplicates are skipped automatically.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">Close</button>
        </div>

        {/* Template Download */}
        <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
          <div className="flex-1 text-xs text-slate-300">
            Download the template CSV to see the correct column format before uploading your catalog.
          </div>
          <button onClick={downloadTemplate} className="btn-glass text-xs px-3 py-1.5 whitespace-nowrap">
            Download Template
          </button>
        </div>

        {/* File Upload */}
        {!result && (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            <p className="text-sm font-semibold text-slate-300 group-hover:text-emerald-300 transition-colors">
              Click to select CSV file
            </p>
            <p className="text-xs text-slate-500 mt-1">Supports standard comma-separated values (.csv) format</p>
          </div>
        )}

        {parseError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {parseError}
          </div>
        )}

        {/* Import Result */}
        {result && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
            <p className="text-sm font-bold">Import Complete</p>
            <p className="text-xs">
              <strong>{result.Added}</strong> medication(s) added · <strong>{result.Skipped}</strong> duplicate(s) skipped
            </p>
          </div>
        )}

        {/* Preview Table */}
        {rows.length > 0 && !result && (
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800/80">
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Preview — {rows.length} row(s) detected</span>
              <span className="text-[10px] text-slate-500">(Showing first 20)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                    {['Name', 'Form', 'Strength', 'Category', 'Cost', 'Price', 'CS?'].map(h => (
                      <th key={h} className="px-3 py-2 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="px-3 py-2 font-bold text-slate-200">{r.name}</td>
                      <td className="px-3 py-2 text-slate-400">{r.dosageForm || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{r.strength || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{r.category || '—'}</td>
                      <td className="px-3 py-2 text-slate-300">${r.unitCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-emerald-400 font-bold">${r.sellingPrice.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {r.isControlledSubstance
                          ? <span className="badge-schedule-2 text-[9px] px-1.5 py-0.5 rounded">Yes</span>
                          : <span className="text-slate-600">No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
          {result ? (
            <button onClick={onClose} className="btn-emerald text-xs">Close</button>
          ) : (
            <>
              <button onClick={onClose} className="btn-glass text-xs">Cancel</button>
              <button
                onClick={handleImport}
                disabled={rows.length === 0 || importing}
                className="btn-emerald text-xs"
              >
                {importing ? 'Importing...' : `Import ${rows.length} Medication(s)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
