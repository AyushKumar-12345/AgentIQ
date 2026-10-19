import { request } from './client';
import { Citation, ToolActivity, ChatSession } from '../types';

export interface RAGResponse {
  question: string;
  answer: string;
  evidence_sufficient: boolean;
  citations: Citation[];
  retrieved_chunks_count: number;
  latency_ms: number;
  session_id?: string;
}

export interface AgentResponse {
  session_id: string;
  response: string;
  steps_taken: number;
  tool_activity: ToolActivity[];
  citations: Citation[];
  latency_ms: number;
}

export async function queryRAG(
  question: string,
  topK: number = 4,
  similarityThreshold: number = 0.55,
  sessionId?: string,
): Promise<RAGResponse> {
  return request('/chat/query', {
    method: 'POST',
    body: JSON.stringify({
      question,
      top_k: topK,
      similarity_threshold: similarityThreshold,
      session_id: sessionId,
    }),
  });
}

export async function queryAgent(
  message: string,
  sessionId?: string,
): Promise<AgentResponse> {
  return request('/chat/agent', {
    method: 'POST',
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });
}

export async function listSessions(): Promise<ChatSession[]> {
  return request('/chat/sessions');
}

export async function getSession(id: string): Promise<ChatSession> {
  return request(`/chat/sessions/${id}`);
}

export async function deleteSession(id: string): Promise<{ message: string; success: boolean }> {
  return request(`/chat/sessions/${id}`, {
    method: 'DELETE',
  });
}
