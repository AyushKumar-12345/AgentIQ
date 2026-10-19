import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('AgentIQ App Root Component', () => {
  beforeEach(() => {
    // Mock global fetch
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/v1/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'healthy',
            version: '0.1.0',
            environment: 'development',
            database: 'connected',
            details: {
              llm_provider: 'mock',
              embedding_provider: 'mock',
              active_model: 'mock-deterministic',
              is_mock: true,
              chunk_size: 500,
              chunk_overlap: 100,
            },
          }),
        });
      }
      if (url.includes('/api/v1/chat/sessions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    }));
  });

  it('renders AgentIQ brand and primary navigation items', async () => {
    render(<App />);
    expect(screen.getByText('AgentIQ')).toBeTruthy();
    expect(screen.getByText('Enterprise AI Assistant')).toBeTruthy();
    expect(screen.getAllByText('Chat with AI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Document Vault').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SQL Analytics')).toBeTruthy();
    
    await waitFor(() => {
      expect(screen.getByText('System Status')).toBeTruthy();
    });
  });

  it('renders system status card and database connectivity', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('System Status')).toBeTruthy();
      expect(screen.getByText('HEALTHY')).toBeTruthy();
    });
  });
});
