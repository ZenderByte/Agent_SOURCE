/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Trash2, Search, RefreshCw, Cpu, Layers, Terminal, AlertTriangle } from 'lucide-react';
import { ProcessItem } from '../types.ts';

interface ProcessManagerProps {
  processes: ProcessItem[];
  onRefresh: () => void;
  onRequestKillProcess: (proc: ProcessItem) => void;
  onRequestLaunchProcess: (command: string) => void;
}

export const ProcessManager: React.FC<ProcessManagerProps> = ({
  processes,
  onRefresh,
  onRequestKillProcess,
  onRequestLaunchProcess,
}) => {
  const [search, setSearch] = useState('');
  const [newCmd, setNewCmd] = useState('');
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  const filtered = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.pid).includes(search) ||
      p.user.toLowerCase().includes(search.toLowerCase())
  );

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmd.trim()) return;
    onRequestLaunchProcess(newCmd.trim());
    setNewCmd('');
    setShowLaunchModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Host Process & Application Manager
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor running background tasks, inspect resource footprints, and manage processes under user approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLaunchModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Launch Process / App
          </button>
          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title="Refresh process list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by process name, PID, or user..."
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Process Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">PID</th>
              <th className="px-4 py-3">Process Name</th>
              <th className="px-4 py-3 text-right">CPU %</th>
              <th className="px-4 py-3 text-right">Memory (MB)</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-sans">
                  No processes matching "{search}"
                </td>
              </tr>
            ) : (
              filtered.map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-slate-300">{proc.pid}</td>
                  <td className="px-4 py-2.5 font-sans font-medium text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="truncate max-w-xs">{proc.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                    {proc.cpuPercent}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                    {proc.memoryMb} MB
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{proc.user}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {proc.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => onRequestKillProcess(proc)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded transition-colors"
                      title="Kill process (requires security confirmation)"
                    >
                      Kill Process
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Launch Process Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Launch Application or Command
              </h3>
              <button
                onClick={() => setShowLaunchModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Launching this application will submit a structured action proposal to the Security Gate for your review.
            </p>

            <form onSubmit={handleLaunch} className="space-y-3">
              <input
                type="text"
                value={newCmd}
                onChange={(e) => setNewCmd(e.target.value)}
                placeholder="e.g., python3 app.py --port=8080 or npm run build"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCmd.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
                >
                  Propose to Security Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
