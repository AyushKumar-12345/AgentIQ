import { request } from './client';
import { SQLQueryResult, PresetQuery, SchemaMetadata } from '../types';

export async function executeSQL(
  sqlQuery?: string,
  presetQuery?: string,
  params?: Record<string, any>,
): Promise<SQLQueryResult> {
  return request('/analytics/query', {
    method: 'POST',
    body: JSON.stringify({
      sql_query: sqlQuery,
      preset_query: presetQuery,
      params: params || {},
    }),
  });
}

export async function listPresets(): Promise<PresetQuery[]> {
  return request('/analytics/presets');
}

export async function getSchema(): Promise<SchemaMetadata> {
  return request('/analytics/schema');
}

