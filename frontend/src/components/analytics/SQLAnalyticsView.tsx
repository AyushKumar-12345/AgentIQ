import { useState, useEffect } from 'react';
import { 
  Play, 
  ShieldCheck, 
  AlertTriangle, 
  Table as TableIcon, 
  Clock, 
  Terminal, 
  CheckCircle2, 
  HelpCircle,
  Database,
  Download
} from 'lucide-react';
import { SQLQueryResult, PresetQuery, SchemaMetadata } from '../../types';
import { executeSQL, listPresets, getSchema } from '../../api/analytics';

export default function SQLAnalyticsView() {
  const [presets, setPresets] = useState<PresetQuery[]>([]);
  const [schema, setSchema] = useState<SchemaMetadata | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('revenue_by_region');
  const [customSQL, setCustomSQL] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'schema'>('presets');
  const [result, setResult] = useState<SQLQueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [presetList, schemaData] = await Promise.all([
          listPresets(),
          getSchema(),
        ]);
        setPresets(presetList);
        setSchema(schemaData);
      } catch (err: any) {
        console.error('Failed to load analytics metadata:', err);
      }
    }
    loadData();
  }, []);

  const handleRunPreset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await executeSQL(undefined, selectedPreset);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Execution failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCustom = async () => {
    if (!customSQL.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await executeSQL(customSQL.trim());
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Query rejected by security guardrails.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result || !result.rows.length) return;
    const header = result.columns.join(',');
    const rows = result.rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agentiq_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 bg-white">
      {/* Header and Security Banner */}
      <div className="border border-neutral-200 rounded-xl bg-white p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-black font-bold text-base tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
            <h3>Business Data Analytics</h3>
          </div>
          <p className="text-xs text-neutral-600 max-w-xl font-normal leading-relaxed">
            Explore sample company sales data (customers, products, orders). All queries are strictly read-only and safe.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-neutral-600 font-normal">Mode: <strong className="text-black font-bold font-mono">Safe Read-Only</strong></span>
        </div>
      </div>

      {/* Segmented Sub-Tabs */}
      <div className="flex gap-1.5 border-b border-neutral-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'presets'
              ? 'bg-black text-white shadow-xs font-bold'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Preset Reports</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-black text-white shadow-xs font-bold'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Custom SQL</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'bg-black text-white shadow-xs font-bold'
              : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Table Schema</span>
        </button>
      </div>

      {/* Tab 1: Presets */}
      {activeTab === 'presets' && (
        <div className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === p.id
                    ? 'border-black bg-neutral-50/90 shadow-2xs'
                    : 'border-neutral-200 bg-white hover:border-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-black">{p.name}</h4>
                  {selectedPreset === p.id && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
                <p className="text-[11px] text-neutral-600 mt-1 font-normal leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            {/* Solid Black Button */}
            <button
              type="button"
              onClick={handleRunPreset}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{loading ? 'Executing Query...' : 'Run Analytical Query'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Custom SQL */}
      {activeTab === 'custom' && (
        <div className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4 shadow-xs">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-neutral-800 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-black">Security Enforcement Active</p>
              <p className="text-neutral-600 mt-0.5 font-normal leading-relaxed">
                Only single-statement read-only <code className="text-black font-semibold">SELECT</code> queries against approved tables (<code className="text-black font-semibold">customers</code>, <code className="text-black font-semibold">products</code>, <code className="text-black font-semibold">orders</code>, <code className="text-black font-semibold">order_items</code>) are allowed. Destructive statements (<code className="text-black font-semibold">DROP</code>, <code className="text-black font-semibold">UPDATE</code>, <code className="text-black font-semibold">DELETE</code>, <code className="text-black font-semibold">INSERT</code>) and schema traversal are strictly rejected by the AST parser.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-black">SQL Query Editor</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomSQL("SELECT region, COUNT(id) as customer_count FROM customers GROUP BY region;")}
                  className="text-[11px] text-neutral-500 hover:text-black underline cursor-pointer"
                >
                  Template: Region Count
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSQL("SELECT name, unit_price, stock_quantity FROM products ORDER BY unit_price DESC LIMIT 5;")}
                  className="text-[11px] text-neutral-500 hover:text-black underline cursor-pointer"
                >
                  Template: Top Products
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={customSQL}
              onChange={e => setCustomSQL(e.target.value)}
              placeholder="SELECT c.name, COUNT(o.id) as total_orders, SUM(o.total_amount) as total_spent FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY total_spent DESC;"
              className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-xs font-mono text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setCustomSQL("SELECT * FROM customers; DROP TABLE orders;")}
              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
              title="Test the AST rejection of chained destructive queries"
            >
              Test Attack Query
            </button>
            
            {/* Solid Black Button */}
            <button
              type="button"
              onClick={handleRunCustom}
              disabled={loading || !customSQL.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{loading ? 'Validating & Executing...' : 'Execute SQL'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Schema Inspector */}
      {activeTab === 'schema' && schema && (
        <div className="border border-neutral-200 rounded-xl bg-white p-5 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schema.allowed_tables.map((tbl, i) => (
              <div key={i} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2 text-xs shadow-2xs">
                <div className="flex items-center gap-2 text-black font-bold">
                  <TableIcon className="w-4 h-4 text-black" />
                  <span className="font-mono text-xs">{tbl.table_name}</span>
                </div>
                <p className="text-[11px] text-neutral-600 font-normal">{tbl.description}</p>
                <div className="pt-2 border-t border-neutral-200">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Columns</span>
                  <ul className="mt-1 space-y-0.5 text-black font-mono text-[11px]">
                    {tbl.columns.map((col, cIdx) => (
                      <li key={cIdx} className="text-neutral-700">&bull; {col}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Output */}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-950">Security Guardrail Violation / Error</p>
            <p className="text-rose-800 mt-0.5 font-mono text-[11px] font-normal">{error}</p>
          </div>
        </div>
      )}

      {/* Query Results Table */}
      {result && (
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden space-y-0 shadow-xs">
          <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between text-xs text-neutral-700 bg-white">
            <span className="flex items-center gap-1.5 font-bold text-black">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Query Result ({result.row_count} rows)
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-neutral-500 font-normal">
                <Clock className="w-3.5 h-3.5" /> Latency: {result.execution_time_ms}ms
              </span>
              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-1 text-xs text-neutral-700 hover:text-black font-semibold border border-neutral-200 px-2.5 py-1 rounded-md hover:bg-neutral-50 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-neutral-50 border-b border-neutral-200 text-[11px] font-mono text-neutral-800 overflow-x-auto">
            <span className="text-neutral-500">Executed SQL: </span>
            <span className="text-black font-bold">{result.executed_sql}</span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-700 font-semibold font-mono">
                  {result.columns.map((col, i) => (
                    <th key={i} className="py-2.5 px-4">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-black">
                {result.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-neutral-50/70 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-4 font-mono font-normal">
                        {cell === null ? <span className="text-neutral-400">NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
