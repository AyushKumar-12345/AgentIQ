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
      <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3>Restricted SQL Business Analytics</h3>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Query synthetic enterprise business tables (customers, products, orders, order_items) under strict AST validation, automated LIMIT enforcement, and dedicated read-only database credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">Role: <strong className="text-emerald-400 font-mono">analytics_reader</strong></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'presets'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          Predefined Analytical Queries
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'custom'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Custom SQL Editor
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'schema'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Approved Schema Explorer
        </button>
      </div>

      {/* Tab 1: Presets */}
      {activeTab === 'presets' && (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/30 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {presets.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPreset === p.id
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-white">{p.name}</h4>
                  {selectedPreset === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{p.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleRunPreset}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Executing Query...' : 'Run Analytical Query'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Custom SQL */}
      {activeTab === 'custom' && (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/30 p-6 space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Security Enforcement Active</p>
              <p className="text-amber-400/80 mt-0.5">
                Only single-statement read-only <code>SELECT</code> queries against approved tables (<code>customers</code>, <code>products</code>, <code>orders</code>, <code>order_items</code>) are allowed. Destructive statements (<code>DROP</code>, <code>UPDATE</code>, <code>DELETE</code>, <code>INSERT</code>) and schema traversal are strictly rejected by the AST parser.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">SQL Query</label>
            <textarea
              rows={4}
              value={customSQL}
              onChange={e => setCustomSQL(e.target.value)}
              placeholder="SELECT c.name, COUNT(o.id) as total_orders, SUM(o.total_amount) as total_spent FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY total_spent DESC;"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setCustomSQL("SELECT * FROM customers; DROP TABLE orders;")}
              className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
              title="Test the AST rejection of chained destructive queries"
            >
              Test Attack Query
            </button>
            <button
              onClick={handleRunCustom}
              disabled={loading || !customSQL.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Validating & Executing...' : 'Execute SQL'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Schema Inspector */}
      {activeTab === 'schema' && schema && (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/30 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.allowed_tables.map((tbl, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <TableIcon className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono">{tbl.table_name}</span>
                </div>
                <p className="text-[11px] text-slate-400">{tbl.description}</p>
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Columns</span>
                  <ul className="mt-1 space-y-0.5 text-slate-300 font-mono text-[11px]">
                    {tbl.columns.map((col, cIdx) => (
                      <li key={cIdx} className="text-slate-400">• {col}</li>
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
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Security Guardrail Violation / Error</p>
            <p className="text-rose-400/90 mt-0.5 font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Query Results Table */}
      {result && (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Query Result ({result.row_count} rows)
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" /> Latency: {result.execution_time_ms}ms
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto">
            <span className="text-slate-600">Executed SQL: </span>
            <span className="text-emerald-400">{result.executed_sql}</span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold font-mono">
                  {result.columns.map((col, i) => (
                    <th key={i} className="py-2.5 px-4">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {result.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-4 font-mono">
                        {cell === null ? <span className="text-slate-600">NULL</span> : String(cell)}
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
