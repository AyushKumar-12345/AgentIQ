import { request } from './client';
import { DocumentItem, DocumentListResponse } from '../types';

export async function uploadDocument(file: File): Promise<{ id: string; filename: string; status: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return request('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function listDocuments(skip: number = 0, limit: number = 50): Promise<DocumentListResponse> {
  return request(`/documents?skip=${skip}&limit=${limit}`);
}

export async function getDocument(id: string): Promise<DocumentItem> {
  return request(`/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<{ message: string; success: boolean }> {
  return request(`/documents/${id}`, {
    method: 'DELETE',
  });
}

export async function reindexDocument(id: string): Promise<{ id: string; status: string; message: string }> {
  return request(`/documents/${id}/reindex`, {
    method: 'POST',
  });
}

