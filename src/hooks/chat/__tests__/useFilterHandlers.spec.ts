/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilterHandlers } from '../useFilterHandlers';

// Shape mirrors DEFAULT_FILTER from FiltersContext: "Todas" = status = all.
const DEFAULT_FILTER = {
  attribute_key: 'status',
  filter_operator: 'equal_to',
  values: ['all'],
  query_operator: 'and',
};

const mockConversations = vi.hoisted(() => ({
  setConversations: vi.fn(() => true),
  loadConversations: vi.fn().mockResolvedValue(undefined),
  beginConversationsRequest: vi.fn(() => 7),
}));

const mockFilters = vi.hoisted(() => ({
  setFilters: vi.fn(),
  applyFilters: vi.fn().mockResolvedValue(undefined),
  applySearch: vi.fn(),
  state: { activeFilters: [] as any[], searchTerm: '' },
}));

const mockStorage = vi.hoisted(() => ({
  clearConversationFilters: vi.fn(),
  saveConversationFilters: vi.fn(),
}));

vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => ({ conversations: mockConversations, filters: mockFilters }),
}));

vi.mock('@/contexts/chat/FiltersContext', () => ({
  DEFAULT_FILTER: {
    attribute_key: 'status',
    filter_operator: 'equal_to',
    values: ['all'],
    query_operator: 'and',
  },
}));

vi.mock('@/utils/storage/filtersStorage', () => mockStorage);

vi.mock('@/utils/chat/filterAdapters', () => ({
  convertBaseFiltersToConversationFilters: vi.fn((f: any) => f),
}));

describe('useFilterHandlers — handleClearFilters (EVO-1939)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets the GLOBAL activeFilters to the default "Todas" filter so badge + realtime matcher clear', async () => {
    const { result } = renderHook(() => useFilterHandlers());

    await result.current.handleClearFilters();

    expect(mockFilters.setFilters).toHaveBeenCalledTimes(1);
    expect(mockFilters.setFilters).toHaveBeenCalledWith([DEFAULT_FILTER]);
  });

  it('clears persisted filters and reloads the default view via applyFilters (single pipeline), not a direct loadConversations', async () => {
    const { result } = renderHook(() => useFilterHandlers());

    await result.current.handleClearFilters();

    expect(mockStorage.clearConversationFilters).toHaveBeenCalledTimes(1);
    expect(mockFilters.applyFilters).toHaveBeenCalledWith(
      [DEFAULT_FILTER],
      expect.any(Function),
      expect.any(Function),
    );
    expect(mockConversations.loadConversations).not.toHaveBeenCalled();
  });
});

describe('useFilterHandlers — stale list responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('takes a request token before applying filters and hands it to setConversations', async () => {
    mockFilters.applyFilters.mockImplementationOnce(async (_filters: any, onSuccess: any) => {
      onSuccess([], { page: 1 }, { kind: 'filter', request: {} });
    });
    const { result } = renderHook(() => useFilterHandlers());

    await result.current.handleApplyFilters([{ attributeKey: 'assignee_id' }] as any);

    expect(mockConversations.beginConversationsRequest).toHaveBeenCalledTimes(1);
    expect(mockConversations.setConversations).toHaveBeenCalledWith([], { page: 1 }, { kind: 'filter', request: {} }, 7);
  });

  it('does not persist a filter whose result was superseded by a newer request', async () => {
    mockConversations.setConversations.mockReturnValueOnce(false);
    mockFilters.applyFilters.mockImplementationOnce(async (_filters: any, onSuccess: any) => {
      onSuccess([], { page: 1 }, { kind: 'filter', request: {} });
    });
    const { result } = renderHook(() => useFilterHandlers());

    await result.current.handleApplyFilters([{ attributeKey: 'assignee_id' }] as any);

    expect(mockStorage.saveConversationFilters).not.toHaveBeenCalled();
  });
});
