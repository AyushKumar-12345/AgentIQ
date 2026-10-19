import { useEffect, useState } from 'react';
import { 
  Activity, 
  Database, 
  Cpu, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { HealthData } from './types';
import DocumentVault from './components/documents/DocumentVault';
import AgenticChat from './components/chat/AgenticChat';
import SQLAnalyticsView from './components/analytics/SQLAnalyticsView';

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'analytics'>('chat');

  useEffect(() => {
    async function fetchHealth() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/health');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to reach backend API`);
        }
        const data: HealthData = await res.json();
        setHealth(data);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown connection error');
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30 shadow-lg shadow-emerald-950">
              IQ
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">AgentIQ</h1>
              <p className="text-[11px] text-slate-400">Enterprise AI Assistant</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Agentic Chat
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'documents'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              Document Vault
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              SQL Analytics
            </button>
          </nav>
        </div>

        {/* System Health Status Indicator */}
        <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/80 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              System Status
            </span>
            {loading ? (
              <span className="text-amber-400 animate-pulse text-[11px]">Checking...</span>
            ) : error ? (
              <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3 h-3" /> Error
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Healthy
              </span>
            )}
          </div>

          {health && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-slate-300 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Database className="w-3 h-3" /> DB
                </span>
                <span className={health.database === 'connected' ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                  {health.database}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> Provider
                </span>
                <span className="font-mono text-slate-300">{health.details?.llm_provider}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span>Version</span>
                <span className="font-mono">v{health.version}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/30 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white capitalize">
              {activeTab === 'chat' && 'Agentic Enterprise Chat & Retrieval'}
              {activeTab === 'documents' && 'Document Management & Knowledge Index'}
              {activeTab === 'analytics' && 'Restricted Business Analytics (Safe SQL)'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeTab === 'chat' && 'Query enterprise documents and business data with verified citations.'}
              {activeTab === 'documents' && 'Upload and monitor PDF documents indexed with pgvector.'}
              {activeTab === 'analytics' && 'Execute read-only analytical queries under strict security guardrails.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
              Environment: <strong className="text-emerald-400">{health?.environment || 'dev'}</strong>
            </span>
          </div>
        </header>

        {/* Tab Body View */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Backend Connection Error</p>
                <p className="text-xs text-rose-400/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {activeTab === 'chat' && <AgenticChat />}
          {activeTab === 'documents' && <DocumentVault />}
          {activeTab === 'analytics' && <SQLAnalyticsView />}
        </div>
      </main>
    </div>
  );
}
