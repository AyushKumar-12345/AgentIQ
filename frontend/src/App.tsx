import { useEffect, useState } from 'react';
import { 
  Database, 
  Cpu, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  AlertCircle,
  Menu,
  X,
  Plus,
  Clock
} from 'lucide-react';
import { HealthData, ChatSession } from './types';
import DocumentVault from './components/documents/DocumentVault';
import AgenticChat from './components/chat/AgenticChat';
import SQLAnalyticsView from './components/analytics/SQLAnalyticsView';
import { listSessions } from './api/chat';

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'analytics'>('chat');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Conversation Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  const fetchHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await fetch('/api/v1/health');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to reach backend API`);
      }
      const data: HealthData = await res.json();
      setHealth(data);
      setHealthError(null);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : 'Unknown connection error');
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadSessions = async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch (e) {
      console.warn('Failed to load sessions:', e);
    }
  };

  useEffect(() => {
    fetchHealth();
    loadSessions();
  }, []);

  const handleSelectSession = async (id: string) => {
    setCurrentSessionId(id);
    setActiveTab('chat');
    setIsMobileNavOpen(false);
  };

  const handleStartNewChat = () => {
    setCurrentSessionId(undefined);
    setActiveTab('chat');
    setIsMobileNavOpen(false);
  };

  const handleSessionCreated = (newId: string) => {
    setCurrentSessionId(newId);
    loadSessions();
  };

  // Provider display format
  const getProviderDisplay = () => {
    if (!health?.details) return 'Mock';
    const { llm_provider, active_model, is_mock } = health.details;
    if (is_mock) return 'Mock (Zero Cost / Offline)';
    if (active_model) return `${llm_provider.toUpperCase()} (${active_model})`;
    return llm_provider.toUpperCase();
  };

  return (
    <div className="flex h-screen w-full bg-white text-black overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {isMobileNavOpen && (
        <div 
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
        />
      )}

      {/* 1. Left Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out md:static md:translate-x-0
        ${isMobileNavOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full md:shadow-none'}
      `}>
        <div className="space-y-5 flex-1 overflow-y-auto">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
                IQ
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-black flex items-center gap-1.5">
                  AgentIQ
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 font-mono font-medium">v0.1</span>
                </h1>
                <p className="text-[10px] text-neutral-500 font-medium">Enterprise AI Assistant</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="p-1 rounded-md text-neutral-500 hover:text-black md:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => { setActiveTab('chat'); setIsMobileNavOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-black text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with AI</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('documents'); setIsMobileNavOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-black text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Document Vault</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('analytics'); setIsMobileNavOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-black text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>SQL Analytics</span>
            </button>
          </nav>

          {/* Conversation History Section */}
          <div className="pt-3 border-t border-neutral-200 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Past Chats
              </span>
              <button
                type="button"
                onClick={handleStartNewChat}
                className="flex items-center gap-1 text-[11px] font-semibold text-black hover:text-neutral-600 cursor-pointer"
                title="Start a new chat"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-[11px] text-neutral-400 py-3 text-center">No past conversations.</p>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSession(s.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs truncate transition-all cursor-pointer block ${
                      currentSessionId === s.id && activeTab === 'chat'
                        ? 'bg-neutral-100 text-black font-bold border border-neutral-300'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-black font-normal'
                    }`}
                    title={s.title}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Health Status Indicator */}
        <div className="pt-3 border-t border-neutral-200 text-xs space-y-2 shrink-0">
          <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between font-bold text-black text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  loadingHealth ? 'bg-amber-400 animate-pulse' :
                  healthError ? 'bg-rose-500' : 'bg-emerald-500'
                }`}></span>
                System Status
              </span>
              {loadingHealth ? (
                <span className="text-amber-700 text-[10px] font-medium">Checking...</span>
              ) : healthError ? (
                <span className="text-rose-700 text-[10px] font-bold">Offline</span>
              ) : (
                <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[9px] font-bold">
                  HEALTHY
                </span>
              )}
            </div>

            {health && (
              <div className="space-y-1 text-[11px] pt-1 border-t border-neutral-200/80">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 flex items-center gap-1 font-normal">
                    <Database className="w-3 h-3 text-neutral-400" /> Database
                  </span>
                  <span className="font-mono text-black font-bold text-[10px]">{health.database}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 flex items-center gap-1 font-normal">
                    <Cpu className="w-3 h-3 text-neutral-400" /> Provider
                  </span>
                  <span className="font-mono text-black font-bold text-[10px] truncate max-w-[110px]" title={health.details?.llm_provider}>
                    {health.details?.llm_provider}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-black md:hidden cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-sm font-bold text-black tracking-tight flex items-center gap-2">
                {activeTab === 'chat' && 'Chat with AI'}
                {activeTab === 'documents' && 'Document Vault'}
                {activeTab === 'analytics' && 'SQL Business Analytics'}
              </h2>
              <p className="text-[11px] text-neutral-500 font-normal hidden sm:block">
                {activeTab === 'chat' && 'Ask questions about your PDF files and business data with verified source proof.'}
                {activeTab === 'documents' && 'Upload and manage PDF documents for accurate AI answers.'}
                {activeTab === 'analytics' && 'Run safe, read-only reports on your business database.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono font-medium hidden sm:inline">
              Env: <strong className="text-black font-semibold">{health?.environment || 'dev'}</strong>
            </span>

            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono font-medium">
              Provider: <strong className="text-black font-semibold">{health?.details?.llm_provider || 'mock'}</strong>
            </span>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 p-3 sm:p-5 overflow-hidden bg-white flex flex-col">
          {healthError && (
            <div className="mb-4 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-950">Backend Connectivity Error</p>
                <p className="text-rose-800 mt-0.5 font-normal">{healthError}</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <AgenticChat 
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleStartNewChat}
                onSessionCreated={handleSessionCreated}
                isRightPanelOpen={isRightPanelOpen}
                onToggleRightPanel={() => setIsRightPanelOpen(prev => !prev)}
                llmProviderName={getProviderDisplay()}
              />
            )}
            {activeTab === 'documents' && (
              <div className="h-full overflow-y-auto">
                <DocumentVault />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="h-full overflow-y-auto">
                <SQLAnalyticsView />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
