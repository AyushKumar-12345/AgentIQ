import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  FileText, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  AlertCircle, 
  Plus, 
  CheckCircle2
} from 'lucide-react';
import { ChatMessage, ChatSession, Citation } from '../../types';
import { queryRAG, queryAgent, listSessions, getSession } from '../../api/chat';

export default function AgenticChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<'agent' | 'rag'>('agent');
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load session list on startup
  useEffect(() => {
    async function loadSessions() {
      try {
        const list = await listSessions();
        setSessions(list);
      } catch (e) {
        console.warn('Failed to load past sessions:', e);
      }
    }
    loadSessions();
  }, [currentSessionId]);

  const handleSelectSession = async (sId: string) => {
    try {
      setLoading(true);
      setError(null);
      const sessionData = await getSession(sId);
      setCurrentSessionId(sessionData.id);
      setMessages(sessionData.messages || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(undefined);
    setMessages([]);
    setError(null);
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);
    setError(null);

    try {
      if (mode === 'agent') {
        const agentRes = await queryAgent(textToSend.trim(), currentSessionId);
        setCurrentSessionId(agentRes.session_id);
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: agentRes.response,
          tool_activity: agentRes.tool_activity,
          citations: agentRes.citations,
          latency_ms: agentRes.latency_ms,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const ragRes = await queryRAG(textToSend.trim(), 4, 0.55, currentSessionId);
        setCurrentSessionId(ragRes.session_id);
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: ragRes.answer,
          citations: ragRes.citations,
          latency_ms: ragRes.latency_ms,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      setError(err.message || 'Error executing request.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTools = (idx: number) => {
    setExpandedTools(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const starterPrompts = [
    {
      title: "Query Document Vault",
      query: "What are the financial metrics and operational targets stated in our uploaded reports?",
      mode: "rag",
    },
    {
      title: "Analyze Sales Database",
      query: "Show me customer sales revenue aggregated by geographical region.",
      mode: "agent",
    },
    {
      title: "Hybrid Agent Comparison",
      query: "Compare our top selling products from the sales database with the strategic targets in our documents.",
      mode: "agent",
    },
  ];

  return (
    <div className="flex h-full max-w-6xl mx-auto gap-6 overflow-hidden">
      {/* Main Chat Stream */}
      <div className="flex-1 flex flex-col border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden shadow-2xl">
        {/* Chat Control Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setMode('agent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  mode === 'agent'
                    ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                LangGraph Agent
              </button>
              <button
                onClick={() => setMode('rag')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  mode === 'rag'
                    ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Direct Grounded RAG
              </button>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {mode === 'agent' ? 'Autonomous bounded tool calling (Docs + SQL)' : 'Strict vector retrieval and grounded synthesis'}
            </span>
          </div>

          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Message History Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Query Execution Error</p>
                <p className="text-rose-400/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">How can AgentIQ assist you today?</h3>
                <p className="text-xs text-slate-400">
                  Ask questions about your uploaded PDFs, query live SQL business data, or instruct the agent to produce a comparative report.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 gap-2.5 w-full text-left">
                {starterPrompts.map((sp, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMode(sp.mode as 'agent' | 'rag');
                      handleSend(sp.query);
                    }}
                    className="p-3.5 rounded-xl border border-slate-800 hover:border-emerald-500/40 bg-slate-900/60 hover:bg-slate-800/60 transition-all text-xs group"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200 group-hover:text-emerald-400">
                      <span>{sp.title}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{sp.mode}</span>
                    </div>
                    <p className="text-slate-400 mt-1 line-clamp-1">{sp.query}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-sm ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-2.5 max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Tool Activity Timeline (if assistant invoked tools) */}
                  {msg.tool_activity && msg.tool_activity.length > 0 && (
                    <div className="border border-slate-800 rounded-xl bg-slate-950/70 p-3 text-xs space-y-2">
                      <button
                        onClick={() => toggleTools(idx)}
                        className="flex items-center justify-between w-full text-slate-400 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                          <Wrench className="w-3.5 h-3.5" />
                          Tool Execution Trail ({msg.tool_activity.length} steps)
                        </span>
                        {expandedTools[idx] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {expandedTools[idx] && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          {msg.tool_activity.map((tool, tIdx) => (
                            <div key={tIdx} className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono text-emerald-400 font-semibold">{tool.tool_name}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                  tool.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                                }`}>
                                  {tool.status}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px]">{tool.result_summary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                    {/* Metadata and Timing */}
                    {msg.latency_ms && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Latency: {msg.latency_ms}ms
                        </span>
                        {msg.citations && msg.citations.length > 0 && (
                          <span className="text-emerald-400 font-medium">
                            {msg.citations.length} verified citation(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Citations Shelf */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.citations.map((cite, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setSelectedCitation(cite)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-emerald-500/50 text-[11px] text-slate-300 hover:text-white transition-all shadow-sm"
                        >
                          <FileText className="w-3 h-3 text-emerald-400" />
                          <span className="truncate max-w-[140px]">{cite.filename}</span>
                          <span className="text-slate-500">p.{cite.page_number}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 text-sm items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                <span>
                  {mode === 'agent' ? 'LangGraph Agent evaluating workflow and calling tools...' : 'Retrieving embeddings and synthesizing grounded answer...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={mode === 'agent' ? "Ask the agent (e.g. 'Compare top software sales with target in Q3 report')..." : "Ask questions strictly answered by uploaded documents..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Drawer: Past Sessions or Selected Citation */}
      <div className="w-72 border border-slate-800 rounded-2xl bg-slate-900/30 p-4 hidden lg:flex flex-col justify-between">
        <div className="space-y-4">
          {selectedCitation ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Citation Inspector
                </span>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-[10px] text-slate-500 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">Document Source</span>
                  <p className="font-semibold text-white break-all">{selectedCitation.filename}</p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <span className="text-slate-500 text-[10px]">Page</span>
                    <p className="font-semibold text-white">{selectedCitation.page_number}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Similarity Score</span>
                    <p className="font-mono text-emerald-400">{(selectedCitation.similarity_score * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Retrieved Text Excerpt</span>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed max-h-60 overflow-y-auto">
                    {selectedCitation.content_snippet}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Conversation History
                </span>
              </div>

              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No previous conversations.</p>
              ) : (
                <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`w-full text-left p-2 rounded-lg text-xs truncate transition-colors ${
                        currentSessionId === s.id
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security / Audit Tag */}
        <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1 text-emerald-400/90 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Grounded Proof Guarantee
          </div>
          <p>AgentIQ prevents ungrounded hallucinations by verifying citations against indexed vector chunks.</p>
        </div>
      </div>
    </div>
  );
}
