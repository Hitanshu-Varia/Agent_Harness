"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Types ---
interface MemoryItem {
  id: string;
  content: string;
  source: string;
  metadata: any;
  timestamp: number;
  similarity?: number;
}

interface EpisodesResponse {
  items: MemoryItem[];
  total: number;
  page: number;
  pages: number;
}

interface KnowledgeResponse {
  items: MemoryItem[];
}

interface KnowledgeBaseProps {
  projectId: string;
}

export function KnowledgeBase({ projectId }: KnowledgeBaseProps) {
  const [activeTab, setActiveTab] = useState<'episodes' | 'knowledge'>('episodes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKnowledgeContent, setNewKnowledgeContent] = useState('');

  const queryClient = useQueryClient();

  // --- API Calls ---
  const fetchEpisodes = async (): Promise<EpisodesResponse> => {
    // Relative URL to use appropriate routing proxy/base
    const res = await fetch(`/api/projects/${projectId}/memory/episodes?page=1&limit=50`);
    if (!res.ok) throw new Error('Failed to fetch episodes');
    return res.json();
  };

  const fetchKnowledge = async (): Promise<KnowledgeResponse> => {
    const res = await fetch(`/api/projects/${projectId}/memory/knowledge`);
    if (!res.ok) throw new Error('Failed to fetch knowledge');
    return res.json();
  };

  const searchMemory = async (query: string) => {
    const res = await fetch(`/api/projects/${projectId}/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, n_results: 10, memory_type: activeTab })
    });
    if (!res.ok) throw new Error('Failed to search memory');
    return res.json();
  };

  // --- Queries ---
  const { data: episodesData, isLoading: isLoadingEpisodes } = useQuery({
    queryKey: ['episodes', projectId],
    queryFn: fetchEpisodes,
    enabled: activeTab === 'episodes' && !searchQuery
  });

  const { data: knowledgeData, isLoading: isLoadingKnowledge } = useQuery({
    queryKey: ['knowledge', projectId],
    queryFn: fetchKnowledge,
    enabled: activeTab === 'knowledge' && !searchQuery
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', projectId, searchQuery, activeTab],
    queryFn: () => searchMemory(searchQuery),
    enabled: !!searchQuery
  });

  // --- Mutations ---
  const addKnowledgeMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/projects/${projectId}/memory/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source: 'manual', tags: [] })
      });
      if (!res.ok) throw new Error('Failed to add knowledge');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
      setIsAddModalOpen(false);
      setNewKnowledgeContent('');
    }
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${projectId}/memory/knowledge/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete knowledge');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
    }
  });

  // --- Render Helpers ---
  const renderItems = () => {
    let items: MemoryItem[] = [];
    if (searchQuery) {
      items = searchResults?.items || [];
    } else if (activeTab === 'episodes') {
      items = episodesData?.items || [];
    } else {
      items = knowledgeData?.items || [];
    }

    if (isLoadingEpisodes || isLoadingKnowledge || isSearching) {
      return <div className="text-sm text-zinc-400">Loading...</div>;
    }

    if (items.length === 0) {
      return <div className="text-sm text-zinc-500">No memory items found.</div>;
    }

    if (activeTab === 'episodes') {
      return (
        <div className="relative border-l border-zinc-800 ml-3 space-y-6">
          {items.map(item => (
            <div key={item.id} className="relative pl-6">
              <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-zinc-950" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-blue-400">
                  {item.metadata?.agent_type || item.source}
                </span>
                <span className="text-xs text-zinc-500 mb-1">
                  {new Date(item.timestamp * 1000).toLocaleString()}
                </span>
                <div className="text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded-md border border-zinc-800 whitespace-pre-wrap">
                  {item.content.length > 200 && !searchQuery ? item.content.substring(0, 200) + '...' : item.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded">
                  {item.source}
                </span>
                <button
                  onClick={() => deleteKnowledgeMutation.mutate(item.id)}
                  className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
              </div>
              <div className="text-sm text-zinc-300 flex-grow whitespace-pre-wrap mb-3">
                {item.content}
              </div>
              <div className="text-xs text-zinc-600 mt-auto">
                {new Date(item.timestamp * 1000).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
          Memory System
        </h2>
      </div>

      <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between border-b border-zinc-800/50">
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 w-fit">
          <button
            onClick={() => { setActiveTab('episodes'); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'episodes' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Episodes
          </button>
          <button
            onClick={() => { setActiveTab('knowledge'); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'knowledge' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Knowledge Base
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <input
              type="text"
              placeholder="Semantic search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>
          {activeTab === 'knowledge' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {renderItems()}
      </div>

      <div className="p-3 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between items-center bg-zinc-900/30">
        <div>
          {episodesData?.total || 0} episodes &middot; {knowledgeData?.items.length || 0} knowledge items
        </div>
      </div>

      {/* Add Knowledge Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-medium text-white mb-4">Add Knowledge</h3>
            <textarea
              className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 resize-none mb-4"
              placeholder="Enter permanent knowledge, project facts, or guidelines..."
              value={newKnowledgeContent}
              onChange={(e) => setNewKnowledgeContent(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                disabled={addKnowledgeMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => addKnowledgeMutation.mutate(newKnowledgeContent)}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                disabled={!newKnowledgeContent.trim() || addKnowledgeMutation.isPending}
              >
                {addKnowledgeMutation.isPending ? 'Saving...' : 'Save Knowledge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
