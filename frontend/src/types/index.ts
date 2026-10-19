/** AgentIQ Shared Frontend Interfaces */

export interface HealthData {
  status: string;
  version: string;
  environment: string;
  database: string;
  details?: {
    llm_provider: string;
    embedding_provider: string;
    chunk_size: number;
    chunk_overlap: number;
  };
}

export interface DocumentItem {
  id: string;
  filename: string;
  file_hash: string;
  file_size_bytes: number;
  mime_type: string;
  total_pages: number;
  total_chunks: number;
  status: 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  total: number;
  items: DocumentItem[];
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  filename: string;
  page_number: number;
  chunk_index: number;
  similarity_score: number;
  content_snippet: string;
}

export interface ToolActivity {
  step: number;
  tool_name: string;
  input: Record<string, any>;
  status: 'SUCCESS' | 'FAILED';
  result_summary: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_activity?: ToolActivity[];
  citations?: Citation[];
  latency_ms?: number;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface SQLQueryResult {
  columns: string[];
  rows: any[][];
  row_count: number;
  execution_time_ms: number;
  executed_sql: string;
}

export interface PresetQuery {
  id: string;
  name: string;
  description: string;
  allowed_params: string[];
}

export interface AllowedTableSchema {
  table_name: string;
  description: string;
  columns: string[];
}

export interface SchemaMetadata {
  allowed_tables: AllowedTableSchema[];
  security_rules: string[];
}

