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
  CheckCircle2,
  Copy,
  Check,
  PanelRightClose,
  PanelRightOpen,
  Shield,
  Layers,
  Database
} from 'lucide-react';
import { ChatMessage, Citation, ToolActivity } from '../../types';
import { queryRAG, queryAgent, getSession } from '../../api/chat';

interface AgenticChatProps {
  currentSessionId?: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onSessionCreated: (id: string) => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  llmProviderName?: string;
}

export default function AgenticChat({
  currentSessionId,
  onNewChat,
  onSessionCreated,
  isRightPanelOpen,
  onToggleRightPanel,
  llmProviderName = 'Mock'
}: AgenticChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<'agent' | 'rag'>('agent');
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'citation' | 'tools' | 'sources' | 'safety'>('citation');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load session messages when currentSessionId changes
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      setSelectedCitation(null);
      return;
    }

    async function loadActiveSession() {
      try {
        setLoading(true);
        setError(null);
        const sessionData = await getSession(currentSessionId!);
        setMessages(sessionData.messages || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load conversation history.');
      } finally {
        setLoading(false);
      }
    }
    loadActiveSession();
  }, [currentSessionId]);

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
        if (!currentSessionId && agentRes.session_id) {
          onSessionCreated(agentRes.session_id);
        }
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: agentRes.response,
          tool_activity: agentRes.tool_activity,
          citations: agentRes.citations,
          latency_ms: agentRes.latency_ms,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        
        // Auto-select first citation or tool trace if present
        if (agentRes.citations && agentRes.citations.length > 0) {
          setSelectedCitation(agentRes.citations[0]);
          setActiveRightTab('citation');
        } else if (agentRes.tool_activity && agentRes.tool_activity.length > 0) {
          setActiveRightTab('tools');
        }
      } else {
        const ragRes = await queryRAG(textToSend.trim(), 4, 0.45, currentSessionId);
        if (!currentSessionId && ragRes.session_id) {
          onSessionCreated(ragRes.session_id);
        }
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: ragRes.answer,
          citations: ragRes.citations,
          latency_ms: ragRes.latency_ms,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);

        if (ragRes.citations && ragRes.citations.length > 0) {
          setSelectedCitation(ragRes.citations[0]);
          setActiveRightTab('citation');
        }
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Find latest tool activity across messages for the right panel
  const latestToolActivity: ToolActivity[] = messages
    .slice()
    .reverse()
    .find(m => m.tool_activity && m.tool_activity.length > 0)?.tool_activity || [];

  // Find all citations from the latest assistant message
  const latestCitations: Citation[] = messages
    .slice()
    .reverse()
    .find(m => m.citations && m.citations.length > 0)?.citations || [];

  const starterPrompts = [
    {
      title: "Search PDF Documents",
      query: "What are the financial metrics, revenue targets, and company rules in our uploaded reports?",
      mode: "rag",
      badge: "Document Search"
    },
    {
      title: "Query Sales Database",
      query: "Show customer sales revenue breakdown aggregated by geographical region.",
      mode: "agent",
      badge: "Sales Data"
    },
    {
      title: "Compare Reports & Sales",
      query: "Compare our top selling products from the sales database with the targets in our documents.",
      mode: "agent",
      badge: "AI Agent"
    },
  ];

  return (
    <div className="flex h-full w-full gap-4 overflow-hidden bg-white">
      {/* Center Main Chat Column */}
      <div className="flex-1 flex flex-col border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-xs">
        {/* Mode Selector and Controls Bar */}
        <div className="p-3 border-b border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Segmented switch */}
            <div className="inline-flex p-1 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('agent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  mode === 'agent'
                    ? 'bg-black text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-200/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Agent (Docs + SQL)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('rag')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  mode === 'rag'
                    ? 'bg-black text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-200/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Document Search (RAG)</span>
              </button>
            </div>

            <span className="text-xs text-neutral-500 font-normal hidden md:inline">
              {mode === 'agent' 
                ? 'AI searches documents and runs safe SQL queries to answer' 
                : 'Searches only your uploaded PDF documents for exact answers'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:border-black text-xs font-semibold text-black transition-all cursor-pointer"
              title="Start a new conversation"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-700" />
              <span>New Chat</span>
            </button>

            <button
              type="button"
              onClick={onToggleRightPanel}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isRightPanelOpen
                  ? 'border-neutral-300 bg-neutral-100 text-black'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:text-black hover:border-black'
              }`}
              title={isRightPanelOpen ? "Collapse Inspector Panel" : "Expand Inspector Panel"}
            >
              {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              <span className="hidden sm:inline">{isRightPanelOpen ? "Hide Inspector" : "Show Inspector"}</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white">
          {error && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-950">Query Execution Error</p>
                <p className="text-rose-800 mt-0.5 font-medium">{error}</p>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-xl mx-auto my-auto">
              <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-black tracking-tight">
                  How can AgentIQ help you today?
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Ask questions about your uploaded PDF files, look up business data, or ask the AI agent to search both.
                </p>
              </div>

              {/* Starter Prompts */}
              <div className="grid grid-cols-1 gap-2.5 w-full text-left pt-2">
                {starterPrompts.map((sp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setMode(sp.mode as 'agent' | 'rag');
                      handleSend(sp.query);
                    }}
                    className="p-3.5 rounded-xl border border-neutral-200 hover:border-black bg-white hover:bg-neutral-50/80 transition-all text-xs group shadow-2xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-black group-hover:text-black">
                      <span>{sp.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-mono font-medium">
                        {sp.badge}
                      </span>
                    </div>
                    <p className="text-neutral-600 mt-1 line-clamp-2 font-normal leading-relaxed">
                      {sp.query}
                    </p>
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
                  <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`space-y-2 max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Tool Activity Timeline (LangGraph execution trace) */}
                  {msg.tool_activity && msg.tool_activity.length > 0 && (
                    <div className="border border-neutral-200 rounded-xl bg-neutral-50/70 p-3 text-xs space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleTools(idx)}
                          className="flex items-center gap-1.5 font-bold text-black hover:text-neutral-700 transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5 text-neutral-800" />
                          <span>LangGraph Agent Trace ({msg.tool_activity.length} steps)</span>
                          {expandedTools[idx] ? <ChevronUp className="w-3.5 h-3.5 text-neutral-500" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveRightTab('tools');
                            if (!isRightPanelOpen) onToggleRightPanel();
                          }}
                          className="text-[10px] text-neutral-500 hover:text-black underline cursor-pointer"
                        >
                          Inspect in panel
                        </button>
                      </div>

                      {expandedTools[idx] && (
                        <div className="space-y-2 pt-2 border-t border-neutral-200">
                          {msg.tool_activity.map((tool, tIdx) => (
                            <div key={tIdx} className="p-2.5 rounded-lg bg-white border border-neutral-200 space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono font-bold text-black">{tool.tool_name}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tool.status === 'SUCCESS' 
                                    ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' 
                                    : 'text-rose-800 bg-rose-50 border border-rose-200'
                                }`}>
                                  {tool.status}
                                </span>
                              </div>
                              <p className="text-neutral-600 text-[11px] font-normal leading-relaxed">{tool.result_summary}</p>
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
                        ? 'bg-black text-white rounded-tr-sm shadow-xs font-normal'
                        : 'bg-white text-black border border-neutral-200 rounded-tl-sm shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>

                    {/* Metadata and Timing */}
                    {msg.latency_ms && (
                      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-normal ${
                        msg.role === 'user' ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200 text-neutral-500'
                      }`}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Latency: {msg.latency_ms}ms
                        </span>
                        {msg.citations && msg.citations.length > 0 && (
                          <span className="font-semibold text-black flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
                          type="button"
                          onClick={() => {
                            setSelectedCitation(cite);
                            setActiveRightTab('citation');
                            if (!isRightPanelOpen) onToggleRightPanel();
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shadow-2xs cursor-pointer border ${
                            selectedCitation?.chunk_id === cite.chunk_id
                              ? 'border-black bg-neutral-100 text-black font-bold'
                              : 'border-neutral-200 bg-white hover:border-black text-neutral-700 hover:text-black'
                          }`}
                        >
                          <FileText className="w-3 h-3 text-neutral-700" />
                          <span className="truncate max-w-[130px]">{cite.filename}</span>
                          <span className="text-neutral-500 font-mono">p.{cite.page_number}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 text-black border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 text-sm items-start">
              <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 rounded-tl-sm text-xs text-neutral-700 flex items-center gap-2.5 shadow-xs font-normal">
                <Sparkles className="w-4 h-4 animate-spin text-black" />
                <span>
                  {mode === 'agent' 
                    ? 'LangGraph agent evaluating bounded workflow and calling tools...' 
                    : 'Retrieving pgvector chunks and generating grounded answer...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 bg-white">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                mode === 'agent' 
                  ? "Ask the LangGraph agent (e.g. 'Compare top products in sales database with Q3 goals')..." 
                  : "Ask questions strictly answered by uploaded document evidence..."
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-white border border-neutral-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all disabled:opacity-50 shadow-2xs font-normal"
            />
            
            {/* Solid Black Send Button with White Text */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
          
          <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2 px-1">
            <span>Press <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-50 text-[10px] font-mono text-neutral-700">Enter</kbd> to submit</span>
            <span className="font-mono">Provider: <strong className="text-black font-semibold">{llmProviderName}</strong></span>
          </div>
        </div>
      </div>

      {/* Right Information Panel (Collapsible Inspector) */}
      {isRightPanelOpen && (
        <aside className="w-80 sm:w-96 border border-neutral-200 rounded-xl bg-white p-4 flex flex-col justify-between shrink-0 shadow-xs overflow-hidden transition-all">
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Panel Header & Tabs */}
            <div className="pb-3 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs font-bold text-black">
                <Layers className="w-4 h-4 text-black" />
                <span>Information Inspector</span>
              </div>
              <button
                type="button"
                onClick={onToggleRightPanel}
                className="p-1 rounded-md text-neutral-500 hover:text-black hover:bg-neutral-100 cursor-pointer"
                title="Close Inspector"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Inspector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-neutral-100 text-[11px] font-semibold border border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveRightTab('citation')}
                className={`py-1 rounded text-center transition-all cursor-pointer ${
                  activeRightTab === 'citation' ? 'bg-white text-black font-bold shadow-2xs' : 'text-neutral-600 hover:text-black'
                }`}
              >
                Source
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('tools')}
                className={`py-1 rounded text-center transition-all cursor-pointer ${
                  activeRightTab === 'tools' ? 'bg-white text-black font-bold shadow-2xs' : 'text-neutral-600 hover:text-black'
                }`}
              >
                AI Steps
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('sources')}
                className={`py-1 rounded text-center transition-all cursor-pointer ${
                  activeRightTab === 'sources' ? 'bg-white text-black font-bold shadow-2xs' : 'text-neutral-600 hover:text-black'
                }`}
              >
                All Sources
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('safety')}
                className={`py-1 rounded text-center transition-all cursor-pointer ${
                  activeRightTab === 'safety' ? 'bg-white text-black font-bold shadow-2xs' : 'text-neutral-600 hover:text-black'
                }`}
              >
                Safety
              </button>
            </div>

            {/* Tab 1: Citation Inspector */}
            {activeRightTab === 'citation' && (
              <div className="space-y-3">
                {selectedCitation ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Document Source</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCitation(null)}
                        className="text-[11px] text-neutral-500 hover:text-black underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70">
                      <p className="font-bold text-black break-all">{selectedCitation.filename}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200 text-[11px]">
                        <span className="text-neutral-600">Page: <strong className="text-black font-bold">{selectedCitation.page_number}</strong></span>
                        <span className="text-neutral-600">Similarity: <strong className="text-black font-mono font-bold">{(selectedCitation.similarity_score * 100).toFixed(1)}%</strong></span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Verified Text Excerpt</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedCitation.content_snippet)}
                          className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-black cursor-pointer font-medium"
                        >
                          {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] text-black leading-relaxed max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">
                        {selectedCitation.content_snippet}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-2">
                    <FileText className="w-8 h-8 text-neutral-400 mx-auto" />
                    <p className="text-xs font-semibold text-black">No Citation Selected</p>
                    <p className="text-[11px] text-neutral-500 max-w-[220px] mx-auto leading-relaxed">
                      Click any citation pill in the chat messages to inspect the source document, page, and verified text chunk.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Tool Execution Trace */}
            {activeRightTab === 'tools' && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                  LangGraph Agent Execution Steps
                </span>

                {latestToolActivity.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Wrench className="w-8 h-8 text-neutral-400 mx-auto" />
                    <p className="text-xs font-semibold text-black">No Active Tool Trail</p>
                    <p className="text-[11px] text-neutral-500 max-w-[220px] mx-auto leading-relaxed">
                      When the LangGraph agent executes tools (such as document search or SQL analytics), step-by-step traces appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {latestToolActivity.map((tool, i) => (
                      <div key={i} className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-black flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center font-bold">
                              {tool.step}
                            </span>
                            {tool.tool_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            tool.status === 'SUCCESS' ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-rose-800 bg-rose-50 border border-rose-200'
                          }`}>
                            {tool.status}
                          </span>
                        </div>
                        <p className="text-neutral-600 text-[11px] font-normal leading-relaxed">{tool.result_summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Retrieved Knowledge Sources */}
            {activeRightTab === 'sources' && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                  Retrieved Chunks in Current Turn ({latestCitations.length})
                </span>

                {latestCitations.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Layers className="w-8 h-8 text-neutral-400 mx-auto" />
                    <p className="text-xs font-semibold text-black">No Retrieved Sources</p>
                    <p className="text-[11px] text-neutral-500 max-w-[220px] mx-auto leading-relaxed">
                      Ask a question against your uploaded documents to view all retrieved chunks here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {latestCitations.map((cite, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedCitation(cite);
                          setActiveRightTab('citation');
                        }}
                        className="p-3 rounded-lg border border-neutral-200 hover:border-black bg-white cursor-pointer transition-all space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-black">
                          <span className="truncate max-w-[170px]">{cite.filename}</span>
                          <span className="text-neutral-500 font-mono text-[10px]">p.{cite.page_number}</span>
                        </div>
                        <p className="text-neutral-500 text-[10px] line-clamp-2">{cite.content_snippet}</p>
                        <div className="pt-1 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>Similarity: {(cite.similarity_score * 100).toFixed(1)}%</span>
                          <span className="text-black font-semibold">Inspect &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Security Policy & Guarantees */}
            {activeRightTab === 'safety' && (
              <div className="space-y-3 text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                  Built-in Safety Rules
                </span>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-black">
                      <Shield className="w-3.5 h-3.5 text-black" />
                      <span>No Guessing (Only Verified Facts)</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed font-normal">
                      If the documents do not have the answer, AgentIQ clearly tells you instead of making things up.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-black">
                      <Database className="w-3.5 h-3.5 text-black" />
                      <span>Read-Only Database</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed font-normal">
                      The AI can only view approved data tables. It is completely blocked from changing or deleting any information.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/70 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-black">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Source Proof for Every Claim</span>
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed font-normal">
                      Every single answer links directly back to exact page numbers and quotes from your files.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Status */}
          <div className="pt-3 border-t border-neutral-200 text-[11px] text-neutral-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Grounded Proof Active
            </span>
            <span className="font-mono text-[10px] text-neutral-400">AgentIQ Core</span>
          </div>
        </aside>
      )}
    </div>
  );
}
