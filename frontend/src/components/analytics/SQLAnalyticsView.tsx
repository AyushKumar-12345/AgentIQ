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
  Database
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header and Security Banner */}
      <div className="border border-slate-200 rounded-2xl bg-white p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 text-black font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="w-4 h-4" />
            </div>
            <h3>Restricted SQL Business Analytics</h3>
          </div>
          <p className="text-xs text-slate-600 max-w-xl font-normal leading-relaxed">
            Query synthetic enterprise business tables (customers, products, orders, order_items) under strict AST validation, automated LIMIT enforcement, and dedicated read-only database credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-700 font-medium">Role: <strong className="text-black font-bold font-mono">analytics_reader</strong></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'presets'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs'
              : 'text-slate-600 hover:text-black hover:bg-slate-100'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Predefined Analytical Queries</span>
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs'
              : 'text-slate-600 hover:text-black hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-600" />
          <span>Custom SQL Editor</span>
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs'
              : 'text-slate-600 hover:text-black hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Approved Schema Explorer</span>
        </button>
      </div>

      {/* Tab 1: Presets */}
      {activeTab === 'presets' && (
        <div className="border border-slate-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {presets.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === p.id
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-black">{p.name}</h4>
                  {selectedPreset === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5 font-medium leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleRunPreset}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Executing Query...' : 'Run Analytical Query'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Custom SQL */}
      {activeTab === 'custom' && (
        <div className="border border-slate-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Security Enforcement Active</p>
              <p className="text-amber-800 mt-0.5 font-medium leading-relaxed">
                Only single-statement read-only <code>SELECT</code> queries against approved tables (<code>customers</code>, <code>products</code>, <code>orders</code>, <code>order_items</code>) are allowed. Destructive statements (<code>DROP</code>, <code>UPDATE</code>, <code>DELETE</code>, <code>INSERT</code>) and schema traversal are strictly rejected by the AST parser.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-black">SQL Query Editor</label>
            <textarea
              rows={4}
              value={customSQL}
              onChange={e => setCustomSQL(e.target.value)}
              placeholder="SELECT c.name, COUNT(o.id) as total_orders, SUM(o.total_amount) as total_spent FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY total_spent DESC;"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono font-medium text-black focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => setCustomSQL("SELECT * FROM customers; DROP TABLE orders;")}
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
              title="Test the AST rejection of chained destructive queries"
            >
              Test Attack Query
            </button>
            <button
              onClick={handleRunCustom}
              disabled={loading || !customSQL.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Validating & Executing...' : 'Execute SQL'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Schema Inspector */}
      {activeTab === 'schema' && schema && (
        <div className="border border-slate-200 rounded-2xl bg-white p-6 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.allowed_tables.map((tbl, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs shadow-2xs">
                <div className="flex items-center gap-2 text-black font-bold">
                  <TableIcon className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono text-sm">{tbl.table_name}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">{tbl.description}</p>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Columns</span>
                  <ul className="mt-1.5 space-y-0.5 text-black font-mono text-[11px] font-medium">
                    {tbl.columns.map((col, cIdx) => (
                      <li key={cIdx} className="text-slate-700">• {col}</li>
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
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Security Guardrail Violation / Error</p>
            <p className="text-rose-700 mt-0.5 font-mono font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Query Results Table */}
      {result && (
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden space-y-0 shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 bg-slate-50/70">
            <span className="flex items-center gap-1.5 font-bold text-black">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Query Result ({result.row_count} rows)
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Clock className="w-3.5 h-3.5" /> Latency: {result.execution_time_ms}ms
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-b border-slate-200 text-[11px] font-mono text-slate-700 overflow-x-auto">
            <span className="text-slate-500 font-semibold">Executed SQL: </span>
            <span className="text-emerald-800 font-bold">{result.executed_sql}</span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold font-mono">
                  {result.columns.map((col, i) => (
                    <th key={i} className="py-2.5 px-4">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-black">
                {result.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-4 font-mono font-medium">
                        {cell === null ? <span className="text-slate-400">NULL</span> : String(cell)}
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
