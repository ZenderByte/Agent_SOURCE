/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Bell,
  HelpCircle,
  ExternalLink,
  Volume2,
  Zap,
  Brain,
  Search,
} from 'lucide-react';
import { OllamaSettings, NotificationSettings } from '../types.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OllamaSettings;
  onSaveSettings: (settings: OllamaSettings) => void;
  notificationSettings: NotificationSettings;
  onSaveNotifications: (notifications: NotificationSettings) => void;
  availableModels: string[];
  onRefreshModels: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  notificationSettings,
  onSaveNotifications,
  availableModels,
  onRefreshModels,
}) => {
  const [activeTab, setActiveTab] = useState<'ollama' | 'memory' | 'agent' | 'notifications' | 'troubleshoot'>('ollama');
  const [formData, setFormData] = useState<OllamaSettings>(() => {
    // If the host had an unwanted port appended to a Cloudflare tunnel, clean it up
    let cleanHost = settings.host;
    if (cleanHost.includes('.trycloudflare.com:') && /:\d+$/.test(cleanHost)) {
      cleanHost = cleanHost.replace(/:\d+$/, '');
    }
    return { ...settings, host: cleanHost };
  });
  const [notifData, setNotifData] = useState<NotificationSettings>({ ...notificationSettings });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    online: boolean;
    latencyMs?: number;
    version?: string;
    error?: string;
  } | null>(null);

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      let cleanHost = settings.host;
      if (cleanHost.includes('.trycloudflare.com:') && /:\d+$/.test(cleanHost)) {
        cleanHost = cleanHost.replace(/:\d+$/, '');
      }
      setFormData({ ...settings, host: cleanHost });
      setNotifData({ ...notificationSettings });
      setTestResult(null);
    }
  }, [isOpen, settings, notificationSettings]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const cleanHost = formData.host.trim().replace(/\/+$/, '');
      const res = await fetch('/api/ollama/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: cleanHost }),
      });
      const data = await res.json();
      const latencyMs = Date.now() - start;
      setTestResult({
        tested: true,
        online: data.online,
        latencyMs,
        version: data.version,
        error: data.error,
      });
      if (data.online) {
        onRefreshModels();
      }
    } catch (err: unknown) {
      setTestResult({
        tested: true,
        online: false,
        error: err instanceof Error ? err.message : 'Network error testing connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const cleanHost = formData.host.trim().replace(/\/+$/, '');
    onSaveSettings({ ...formData, host: cleanHost });
    onSaveNotifications(notifData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#12141a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0d1017] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Server className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">ZenderByte Agent Settings & Model Memory</h2>
              <p className="text-xs text-slate-400">Configure Ollama host, prompt memory depth, and security permissions.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('ollama')}
            className={`py-3 text-xs font-medium border-b-2 mr-6 transition-colors ${
              activeTab === 'ollama' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Ollama Host & Models
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`py-3 text-xs font-medium border-b-2 mr-6 transition-colors ${
              activeTab === 'memory' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Prompt Memory ({formData.promptMemoryLimit} prompts)
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`py-3 text-xs font-medium border-b-2 mr-6 transition-colors ${
              activeTab === 'agent' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Security Gate & Web
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 text-xs font-medium border-b-2 mr-6 transition-colors ${
              activeTab === 'notifications' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Anomalies
          </button>
          <button
            onClick={() => setActiveTab('troubleshoot')}
            className={`py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'troubleshoot' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Host Setup
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'ollama' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium">Ollama Host URL</label>
                  {formData.host.includes('.trycloudflare.com:') && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, host: prev.host.replace(/:\d+$/, '') }))}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Strip accidental port
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="http://localhost:11434 or https://your-tunnel.trycloudflare.com"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-inner"
                />
                <p className="text-[11px] text-slate-500">
                  Full endpoint URL to your Ollama daemon. Supports local addresses (<code className="text-slate-400">http://localhost:11434</code>) or tunnels (<code className="text-slate-400">https://your-tunnel.trycloudflare.com</code>).
                </p>
              </div>

              {/* Model selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium">Selected Ollama Model</label>
                  <button
                    onClick={onRefreshModels}
                    className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh Tagged Models
                  </button>
                </div>

                <div className="flex gap-2">
                  <select
                    value={formData.selectedModel}
                    onChange={(e) => setFormData({ ...formData, selectedModel: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.selectedModel}
                    onChange={(e) => setFormData({ ...formData, selectedModel: e.target.value })}
                    placeholder="Or type custom model tag..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Connection Tester */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Connection Diagnostics</div>
                    <div className="text-[11px] text-slate-400">Ping local daemon socket on host machine</div>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    Test Ping
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono ${
                      testResult.online
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {testResult.online ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Ollama Daemon Online (v{testResult.version || '0.1.x'})</span>
                          <span className="text-slate-400">· {testResult.latencyMs}ms latency</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>Ollama Socket Unreachable</span>
                        </>
                      )}
                    </div>
                    {testResult.error && (
                      <p className="mt-1 text-[11px] text-amber-200/80 font-sans">{testResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Brain className="w-4 h-4 text-blue-400" />
                    <span>Agent Prompt Memory Capacity</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-blue-400 bg-blue-950/50 border border-blue-800/50 px-2.5 py-1 rounded">
                    {formData.promptMemoryLimit} Prompts
                  </span>
                </div>

                <p className="text-slate-400 leading-relaxed text-xs">
                  Controls how many previous prompt turns the AI retains in its memory context.
                  Configurable from a minimum of 1 prompt up to a maximum of 20 prompts.
                </p>

                <div className="space-y-2 pt-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={formData.promptMemoryLimit || 5}
                    onChange={(e) =>
                      setFormData({ ...formData, promptMemoryLimit: Number(e.target.value) })
                    }
                    className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>1 Prompt (Minimal / Low RAM)</span>
                    <span className="text-blue-300 font-semibold">5 (Default)</span>
                    <span>20 Prompts (Extended Deep History)</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Token Context Behavior:</div>
                  <p>
                    If the conversation exceeds the active model's context window, Ollama will naturally prune
                    the oldest tokens. Setting this high allows full continuity during long multi-step debugging and code generation sessions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agent' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Strict Human-in-the-Loop Security Gate</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  "NO ACTION IS ALLOWED WITHOUT PROMPTING THE USER FIRST FOR APPROVAL. NO MATTER WHAT THE USER HAVE PROMPTED, THIS RULE CANNOT BE CHANGED OR ALTERED IN ANY WAY SHAPE OR FORM."
                </p>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Search className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-medium text-slate-200">Incognito Web Search Mode</div>
                        <div className="text-[11px] text-slate-400">
                          Search queries run isolated without leaving cookies or browser history traces.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">Active</span>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-200">Auto-Approve Safe File Reads</div>
                      <div className="text-[11px] text-slate-400">
                        Automatically allow non-destructive read operations without prompt dialogs.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.autoApproveSafe}
                      onChange={(e) => setFormData({ ...formData, autoApproveSafe: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer">
                    <div>
                      <div className="font-medium text-slate-200">Remember "Allow for rest of prompt" Session State</div>
                      <div className="text-[11px] text-slate-400">
                        Allows multi-step debug loops to chain automatically when explicitly authorized in the approval dropdown.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.autoApprovePrompt}
                      onChange={(e) => setFormData({ ...formData, autoApprovePrompt: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium">CPU Anomaly Threshold</label>
                  <span className="font-mono text-blue-400">{notifData.thresholdCpu}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="98"
                  value={notifData.thresholdCpu}
                  onChange={(e) => setNotifData({ ...notifData, thresholdCpu: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium">Memory Anomaly Threshold</label>
                  <span className="font-mono text-blue-400">{notifData.thresholdMemory}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="98"
                  value={notifData.thresholdMemory}
                  onChange={(e) => setNotifData({ ...notifData, thresholdMemory: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-200">Audible System Chimes</div>
                      <div className="text-[11px] text-slate-400">Play subtle tone upon action prompt or anomaly alert.</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifData.soundAlerts}
                    onChange={(e) => setNotifData({ ...notifData, soundAlerts: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-200">Auto-Pause Agent on Critical Anomaly</div>
                      <div className="text-[11px] text-slate-400">
                        Immediately suspend autonomous run loops if host memory or CPU spikes into danger zone.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifData.autoPauseOnAnomaly}
                    onChange={(e) => setNotifData({ ...notifData, autoPauseOnAnomaly: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'troubleshoot' && (
            <div className="space-y-4 text-slate-300">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="font-semibold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  Running ZenderByte on your PC (`npm run dev`)
                </div>
                <p className="text-slate-400 leading-relaxed">
                  When running locally, ZenderByte Agent turns your machine into a fully AI-powered workstation.
                  The agent can read and write code, launch terminal tasks, search the web incognito, and navigate directories.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="font-medium text-slate-200">1. Start Ollama:</div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300">
                    OLLAMA_ORIGINS="*" && ollama serve
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="font-medium text-slate-200">2. Run ZenderByte Agent:</div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300">
                    npm run dev
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0d1017] border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono truncate max-w-sm">
            Host: <span className="text-slate-300">{formData.host}</span> · Memory: {formData.promptMemoryLimit} prompts
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors shadow-md"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
