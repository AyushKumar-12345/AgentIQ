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
    <div className="flex h-screen w-full bg-white text-black overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between p-4 shrink-0 shadow-xs">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-200">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              IQ
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-black">AgentIQ</h1>
              <p className="text-[11px] text-slate-500 font-medium">Enterprise AI Assistant</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-xs'
                  : 'text-slate-600 hover:text-black hover:bg-slate-100/80'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Agentic Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'documents'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-xs'
                  : 'text-slate-600 hover:text-black hover:bg-slate-100/80'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Document Vault</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-xs'
                  : 'text-slate-600 hover:text-black hover:bg-slate-100/80'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>SQL Analytics</span>
            </button>
          </nav>
        </div>

        {/* System Health Status Indicator */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 text-xs space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between font-semibold text-black">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              System Status
            </span>
            {loading ? (
              <span className="text-amber-700 animate-pulse text-[11px] font-medium">Checking...</span>
            ) : error ? (
              <span className="text-rose-700 flex items-center gap-1 text-[11px] font-semibold">
                <AlertCircle className="w-3 h-3" /> Error
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Healthy
              </span>
            )}
          </div>

          {health && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5 text-black text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Database className="w-3 h-3" /> Database
                </span>
                <span className={health.database === 'connected' ? 'text-emerald-700 font-bold font-mono' : 'text-amber-700 font-bold font-mono'}>
                  {health.database}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1 font-medium">
                  <Cpu className="w-3 h-3" /> Provider
                </span>
                <span className="font-mono text-black font-semibold">{health.details?.llm_provider}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span>Version</span>
                <span className="font-mono font-semibold text-slate-700">v{health.version}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-black capitalize tracking-tight">
              {activeTab === 'chat' && 'Agentic Enterprise Chat & Retrieval'}
              {activeTab === 'documents' && 'Document Management & Knowledge Index'}
              {activeTab === 'analytics' && 'Restricted Business Analytics (Safe SQL)'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {activeTab === 'chat' && 'Query enterprise documents and business data with verified citations.'}
              {activeTab === 'documents' && 'Upload and monitor PDF documents indexed with pgvector.'}
              {activeTab === 'analytics' && 'Execute read-only analytical queries under strict security guardrails.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium shadow-xs">
              Environment: <strong className="text-black font-semibold">{health?.environment || 'dev'}</strong>
            </span>
          </div>
        </header>

        {/* Tab Body View */}
        <div className="flex-1 p-6 overflow-y-auto bg-white">
          {error && (
            <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Backend Connection Error</p>
                <p className="text-xs text-rose-700 mt-1 font-medium">{error}</p>
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
