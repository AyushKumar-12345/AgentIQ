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
        const ragRes = await queryRAG(textToSend.trim(), 4, 0.45, currentSessionId);
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
      <div className="flex-1 flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
        {/* Chat Control Header */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-xl bg-slate-200/60 text-xs font-semibold">
              <button
                onClick={() => setMode('agent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'agent'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>LangGraph Agent</span>
              </button>
              <button
                onClick={() => setMode('rag')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  mode === 'rag'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Direct Grounded RAG</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              {mode === 'agent' ? 'Autonomous bounded tool calling (Docs + SQL)' : 'Strict vector retrieval and grounded synthesis'}
            </span>
          </div>

          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-black transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Message History Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {error && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Query Execution Error</p>
                <p className="text-rose-700 mt-0.5 font-medium">{error}</p>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-black tracking-tight">How can AgentIQ assist you today?</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
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
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 bg-white hover:bg-slate-50 transition-all text-xs group shadow-2xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-black group-hover:text-emerald-700">
                      <span>{sp.title}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{sp.mode}</span>
                    </div>
                    <p className="text-slate-600 mt-1 line-clamp-1 font-medium">{sp.query}</p>
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
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-2.5 max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Tool Activity Timeline (if assistant invoked tools) */}
                  {msg.tool_activity && msg.tool_activity.length > 0 && (
                    <div className="border border-slate-200 rounded-xl bg-slate-50 p-3 text-xs space-y-2 shadow-2xs">
                      <button
                        onClick={() => toggleTools(idx)}
                        className="flex items-center justify-between w-full text-slate-700 hover:text-black font-semibold transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                          Tool Execution Trail ({msg.tool_activity.length} steps)
                        </span>
                        {expandedTools[idx] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {expandedTools[idx] && (
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          {msg.tool_activity.map((tool, tIdx) => (
                            <div key={tIdx} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono text-emerald-800 font-bold">{tool.tool_name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tool.status === 'SUCCESS' ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : 'text-rose-800 bg-rose-100 border border-rose-200'
                                }`}>
                                  {tool.status}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] font-medium leading-relaxed">{tool.result_summary}</p>
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
                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-xs font-medium'
                        : 'bg-slate-50 text-black border border-slate-200 rounded-tl-none shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                    {/* Metadata and Timing */}
                    {msg.latency_ms && (
                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-medium ${
                        msg.role === 'user' ? 'border-emerald-500/60 text-emerald-100' : 'border-slate-200 text-slate-500'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Latency: {msg.latency_ms}ms
                        </span>
                        {msg.citations && msg.citations.length > 0 && (
                          <span className="text-emerald-700 font-bold">
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
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-600 text-[11px] font-semibold text-black hover:text-emerald-700 transition-all shadow-2xs cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-[140px]">{cite.filename}</span>
                          <span className="text-slate-500">p.{cite.page_number}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 text-sm items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 rounded-tl-none text-xs text-slate-600 flex items-center gap-2.5 shadow-xs font-medium">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
                <span>
                  {mode === 'agent' ? 'LangGraph Agent evaluating workflow and calling tools...' : 'Retrieving embeddings and synthesizing grounded answer...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              placeholder={mode === 'agent' ? "Ask the agent (e.g. 'Compare top software sales with target in Q3 report')..." : "Ask questions strictly answered by uploaded documents..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-black placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all disabled:opacity-50 shadow-2xs font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Drawer: Past Sessions or Selected Citation */}
      <div className="w-72 border border-slate-200 rounded-2xl bg-white p-4 hidden lg:flex flex-col justify-between shrink-0 shadow-xs">
        <div className="space-y-4">
          {selectedCitation ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Citation Inspector
                </span>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-black cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Document Source</span>
                  <p className="font-bold text-black break-all mt-0.5">{selectedCitation.filename}</p>
                </div>
                <div className="flex justify-between border-y border-slate-100 py-2">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Page</span>
                    <p className="font-bold text-black mt-0.5">{selectedCitation.page_number}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Similarity Score</span>
                    <p className="font-mono font-bold text-emerald-700 mt-0.5">{(selectedCitation.similarity_score * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Retrieved Text Excerpt</span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-black leading-relaxed max-h-60 overflow-y-auto mt-1 font-medium">
                    {selectedCitation.content_snippet}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-black flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  Conversation History
                </span>
              </div>

              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center font-medium">No previous conversations.</p>
              ) : (
                <div className="space-y-1 max-h-[450px] overflow-y-auto">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs truncate transition-all cursor-pointer ${
                        currentSessionId === s.id
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
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
        <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1 text-emerald-800 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Grounded Proof Guarantee
          </div>
          <p className="leading-relaxed">AgentIQ prevents hallucinations by verifying citations against indexed vector chunks.</p>
        </div>
      </div>
    </div>
  );
}
