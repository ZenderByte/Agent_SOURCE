/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings, Activity, Terminal, AlertTriangle, Code, Search, ExternalLink } from 'lucide-react';
import { OllamaSettings, SystemInfo, AnomalyAlert } from '../types.ts';
import { ZenderByteLogo } from './ZenderByteLogo.tsx';

interface TopBarProps {
  currentTab: 'chat' | 'editor' | 'dashboard' | 'processes' | 'logs';
  onSelectTab: (tab: 'chat' | 'editor' | 'dashboard' | 'processes' | 'logs') => void;
  onOpenSettings: () => void;
  ollamaSettings: OllamaSettings;
  ollamaOnline: boolean;
  systemInfo: SystemInfo | null;
  anomalies: AnomalyAlert[];
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  ollamaSettings,
  ollamaOnline,
  systemInfo,
  anomalies,
}) => {
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved);

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 bg-[#000000] border-b border-zinc-800/80 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark with official ZenderByte logo */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('chat');
          }}
          className="text-base font-bold tracking-tight text-white flex items-center gap-2.5 whitespace-nowrap"
        >
          <ZenderByteLogo variant="icon" className="w-5 h-5 text-[#3b82f6]" />
          <span className="font-black italic tracking-tight uppercase">
            <span className="text-white">ZENDER</span>
            <span className="text-[#3b82f6]">BYTE</span>
          </span>
        </a>
        <span className="hidden sm:inline-flex items-center text-xs text-zinc-500 font-mono truncate max-w-[260px]" title={ollamaSettings.host}>
          {ollamaSettings.host.replace(/^https?:\/\//, '')}
        </span>
      </div>

      {/* Zone 2: Navigation views */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
        <button
          onClick={() => onSelectTab('chat')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentTab === 'chat' ? 'text-white border-b-2 border-blue-500 pb-0.5' : ''
          }`}
        >
          <Terminal className="w-4 h-4" />
          Ollama Console
        </button>

        {/* ZenderByte Official Next-Gen Search (opens official website in new tab) */}
        <a
          href="https://zenderbyte.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 text-zinc-300 hover:bg-zinc-900/60 px-2.5 py-1 rounded-md border border-zinc-800/50 hover:border-blue-500/40 group"
          title="Open official ZenderByte Next-Gen Search in a new browser tab"
        >
          <Search className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-zinc-200 group-hover:text-blue-300">Next-Gen Search</span>
          <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-blue-400" />
        </a>

        <button
          onClick={() => onSelectTab('editor')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentTab === 'editor' ? 'text-white border-b-2 border-blue-500 pb-0.5' : ''
          }`}
        >
          <Code className="w-4 h-4" />
          Code Studio
        </button>

        <button
          onClick={() => onSelectTab('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentTab === 'dashboard' ? 'text-white border-b-2 border-blue-500 pb-0.5' : ''
          }`}
        >
          <Activity className="w-4 h-4" />
          Host Telemetry
        </button>

        <button
          onClick={() => onSelectTab('processes')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            currentTab === 'processes' ? 'text-white border-b-2 border-blue-500 pb-0.5' : ''
          }`}
        >
          Processes
        </button>

        <button
          onClick={() => onSelectTab('logs')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentTab === 'logs' ? 'text-white border-b-2 border-blue-500 pb-0.5' : ''
          }`}
        >
          Audit & Anomalies
          {unresolvedAnomalies.length > 0 && (
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
              {unresolvedAnomalies.length}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Primary Action & Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span
            className={`w-2 h-2 rounded-full ${
              ollamaOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'
            }`}
          />
          <span>{ollamaOnline ? 'Ollama Online' : 'Check Ollama'}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-300 truncate max-w-[120px]">{ollamaSettings.selectedModel}</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Settings className="w-3.5 h-3.5 text-blue-400" />
          Settings & Memory
        </button>
      </div>
    </header>
  );
};
