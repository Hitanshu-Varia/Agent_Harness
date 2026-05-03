"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'openrouter', name: 'OpenRouter' },
  { id: 'moonshot', name: 'Moonshot' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'nvidia_nim', name: 'NVIDIA NIM' },
  { id: 'ollama', name: 'Ollama' }
];

interface ApiKey {
  id: string;
  alias: string;
  provider: string;
  is_active: number;
  calls_today: number;
  tokens_today: number;
  key_masked: string;
}

interface UsageStats {
  calls: number;
  tokens_in: number;
  tokens_out: number;
  total_tokens: number;
}

export function ApiKeyManager() {
  const [activeTab, setActiveTab] = useState(PROVIDERS[0].id);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usageStats, setUsageStats] = useState<Record<string, UsageStats>>({});

  const [newAlias, setNewAlias] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [ollamaUrl] = useState('http://localhost:11434');
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  const [ollamaModels, setOllamaModels] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchKeys();
    fetchUsageStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const fetchKeys = async () => {
    try {
      const res = await axios.get(`${baseUrl}/providers/keys`);
      setKeys(res.data);
    } catch (err) {
      console.error('Failed to fetch keys', err);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const res = await axios.get(`${baseUrl}/providers/usage`);
      setUsageStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyValue || !newAlias) return;
    try {
      await axios.post(`${baseUrl}/providers/keys`, {
        provider: activeTab,
        key_value: newKeyValue,
        alias: newAlias
      });
      setNewAlias('');
      setNewKeyValue('');
      setTestResult('idle');
      fetchKeys();
    } catch (err) {
      console.error('Failed to add key', err);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await axios.delete(`${baseUrl}/providers/keys/${id}`);
      fetchKeys();
    } catch (err) {
      console.error('Failed to delete key', err);
    }
  };

  const handleTestKey = async () => {
    if (!newKeyValue) return;
    try {
      setTestResult('idle');
      await axios.post(`${baseUrl}/providers/keys/test`, {
        provider: activeTab,
        key_value: newKeyValue
      });
      setTestResult('success');
    } catch (err: unknown) {
      setTestResult('error');
      if (axios.isAxiosError(err)) {
        setTestError(err.response?.data?.detail || err.message);
      } else if (err instanceof Error) {
        setTestError(err.message);
      } else {
        setTestError(String(err));
      }
    }
  };

  const handleDetectOllama = async () => {
    try {
      const res = await axios.get(`${baseUrl}/providers/ollama/models`);
      setOllamaModels(res.data);
    } catch (err) {
      console.error('Failed to detect models', err);
    }
  };

  const handleAddOpenRouterAccounts = async () => {
    // A specific functionality for OpenRouter as requested "Add Account adds multiple keys, shows total accounts count"
    // To keep it simple here, we would just trigger a prompt or handle multiple keys
    const accountsInput = prompt("Enter comma-separated OpenRouter API keys with aliases (format: alias1:key1, alias2:key2)");
    if (!accountsInput) return;

    const pairs = accountsInput.split(',').map(s => s.trim()).filter(s => s);
    let addedCount = 0;
    for (const pair of pairs) {
      const parts = pair.split(':');
      if (parts.length === 2) {
        try {
          await axios.post(`${baseUrl}/providers/keys`, {
            provider: 'openrouter',
            alias: parts[0],
            key_value: parts[1]
          });
          addedCount++;
        } catch (e) {
          console.error("Failed to add OpenRouter account", e);
        }
      }
    }
    alert(`Successfully added ${addedCount} OpenRouter accounts.`);
    fetchKeys();
  };

  const providerKeys = keys.filter(k => k.provider === activeTab);
  const currentStats = usageStats[activeTab];

  // Dummy chart data from currentStats
  const chartData = [
    { name: 'Calls', value: currentStats?.calls || 0 },
    { name: 'Tokens', value: currentStats?.total_tokens || 0 }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold">API Key Management</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b pb-2">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => {
              setActiveTab(p.id);
              setTestResult('idle');
              setNewAlias('');
              setNewKeyValue('');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === p.id
                ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">

          {activeTab !== 'ollama' ? (
            <>
              <div className="p-4 border rounded-md space-y-4 bg-card">
                <h3 className="font-semibold text-lg">Add New {PROVIDERS.find(p=>p.id===activeTab)?.name} Key</h3>

                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Alias (e.g. My Personal Key)"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={newKeyValue}
                    onChange={(e) => {
                      setNewKeyValue(e.target.value);
                      setTestResult('idle');
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button onClick={handleAddKey} disabled={!newAlias || !newKeyValue}>Save Key</Button>
                  <Button variant="outline" onClick={handleTestKey} disabled={!newKeyValue}>
                    Test Key
                  </Button>

                  {testResult === 'success' && <span className="text-green-600 font-medium">✅ Key is valid</span>}
                  {testResult === 'error' && <span className="text-red-600 font-medium">❌ Test failed: {testError}</span>}
                </div>

                {activeTab === 'openrouter' && (
                  <div className="mt-4 border-t pt-4">
                    <Button variant="secondary" onClick={handleAddOpenRouterAccounts}>
                      Add Multiple Accounts
                    </Button>
                    <span className="ml-4 text-sm text-muted-foreground">
                      Total OpenRouter Keys: {providerKeys.length}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Existing Keys</h3>
                {providerKeys.length === 0 ? (
                  <p className="text-muted-foreground">No keys added yet.</p>
                ) : (
                  <div className="border rounded-md divide-y">
                    {providerKeys.map(key => (
                      <div key={key.id} className="flex justify-between items-center p-3 hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{key.alias}</p>
                          <p className="text-sm text-muted-foreground font-mono">{key.key_masked}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600">Calls today: {key.calls_today}</span>
                          <span className="text-blue-600">Tokens today: {key.tokens_today}</span>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteKey(key.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 border rounded-md space-y-4 bg-card">
              <h3 className="font-semibold text-lg">Ollama Configuration</h3>
              <p className="text-sm text-muted-foreground">Ollama models run locally and do not require API keys.</p>

              <div>
                <label className="text-sm font-medium mb-1 block">Ollama Base URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  readOnly
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Configured via environment variable.</p>
              </div>

              <div className="pt-2">
                <Button onClick={handleDetectOllama}>Detect Models</Button>
              </div>

              {ollamaModels.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Installed Models</h4>
                  <ul className="list-disc list-inside text-sm">
                    {ollamaModels.map(m => (
                      <li key={m.id}>{m.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Stats Column */}
        <div className="p-4 border rounded-md h-fit space-y-4 bg-card">
          <h3 className="font-semibold text-lg">Usage Stats</h3>
          {currentStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-sm text-muted-foreground">Calls</p>
                  <p className="text-2xl font-bold">{currentStats.calls}</p>
                </div>
                <div className="p-3 bg-muted rounded text-center">
                  <p className="text-sm text-muted-foreground">Tokens</p>
                  <p className="text-2xl font-bold">{currentStats.total_tokens}</p>
                </div>
              </div>

              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No usage data available for this provider.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiKeyManager;