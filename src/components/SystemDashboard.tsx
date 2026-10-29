/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  Network,
  Terminal,
  Layers,
  AlertTriangle,
  Folder,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import { SystemInfo, SystemMetrics, AnomalyAlert } from '../types.ts';

interface SystemDashboardProps {
  systemInfo: SystemInfo | null;
  metrics: SystemMetrics | null;
  anomalies: AnomalyAlert[];
  onRefresh: () => void;
  onAskAiToFixAnomaly: (anomaly: AnomalyAlert) => void;
  onResolveAnomaly: (id: string) => void;
}

export const SystemDashboard: React.FC<SystemDashboardProps> = ({
  systemInfo,
  metrics,
  anomalies,
  onRefresh,
  onAskAiToFixAnomaly,
  onResolveAnomaly,
}) => {
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Host Hardware & System Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time operating system metrics, installed software runtimes, and anomaly detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Sync Telemetry
          </button>
        </div>
      </div>

      {/* Active Anomaly Alerts (if any) */}
      {unresolvedAnomalies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            Active System Anomalies ({unresolvedAnomalies.length})
          </div>

          <div className="grid gap-3">
            {unresolvedAnomalies.map((anom) => (
              <div
                key={anom.id}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-2">
                    <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 bg-amber-900/60 rounded">
                      {anom.severity}
                    </span>
                    <span>{anom.title}</span>
                    <span className="text-slate-500 font-mono text-[11px]">· {anom.source}</span>
                  </div>
                  <p className="text-slate-300">{anom.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onAskAiToFixAnomaly(anom)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Ask AI to Mitigate
                  </button>
                  <button
                    onClick={() => onResolveAnomaly(anom.id)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="w-4 h-4 text-cyan-400" />
              CPU Load
            </span>
            <span className="font-mono text-cyan-400 text-xs">{systemInfo?.cpu.cores || 8} Cores</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {metrics?.cpuPercent ?? 12}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-500"
              style={{ width: `${metrics?.cpuPercent ?? 12}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate">
            {systemInfo?.cpu.model || 'AMD Ryzen / Intel Core'}
          </div>
        </div>

        {/* Memory */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="w-4 h-4 text-indigo-400" />
              Memory (RAM)
            </span>
            <span className="font-mono text-indigo-300 text-xs">
              {metrics?.memory.percent ?? 45}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {formatBytes(metrics?.memory.usedBytes || 0)}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-500"
              style={{ width: `${metrics?.memory.percent ?? 45}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {formatBytes(systemInfo?.memory.freeBytes || 0)} available of{' '}
            {formatBytes(systemInfo?.memory.totalBytes || 0)}
          </div>
        </div>

        {/* IP Address & Network */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Network className="w-4 h-4 text-emerald-400" />
              Host IP Address
            </span>
            <span className="text-emerald-400 text-xs font-mono">IPv4 Active</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300 truncate">
            {systemInfo?.primaryIp || '127.0.0.1'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate">
            Gateway: {systemInfo?.hostname || 'host-machine'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Interfaces: {systemInfo?.allIps.length || 2} detected
          </div>
        </div>

        {/* Disk Space & Uptime */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-4 h-4 text-amber-400" />
              Root Disk Allocation
            </span>
            <span className="font-mono text-amber-400 text-xs">
              {metrics?.disk.usedPercent ?? 42}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {metrics?.disk.freeGb ?? 296} GB Free
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${metrics?.disk.usedPercent ?? 42}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Uptime: {formatUptime(metrics?.uptimeSeconds || systemInfo?.uptimeSeconds || 36000)}
          </div>
        </div>
      </div>

      {/* Installed Runtimes & Toolchain Detection */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Installed Runtimes & Toolchain Versions
            </h2>
            <p className="text-xs text-slate-400">
              The AI dynamically probes these binaries on your host machine to eliminate debugging guesswork.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded">
            Auto-Configured
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">Python Version</span>
            <div className="font-mono text-cyan-300 font-semibold truncate">
              {systemInfo?.runtimes.python || 'Python 3.11.8'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">Node.js Runtime</span>
            <div className="font-mono text-emerald-300 font-semibold truncate">
              {systemInfo?.runtimes.node || process.version}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">Git Version</span>
            <div className="font-mono text-indigo-300 font-semibold truncate">
              {systemInfo?.runtimes.git || 'git version 2.43.0'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">Docker Daemon</span>
            <div className="font-mono text-amber-300 font-semibold truncate">
              {systemInfo?.runtimes.docker || 'Docker 26.0.0'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">Pip Package Manager</span>
            <div className="font-mono text-slate-200 truncate">
              {systemInfo?.runtimes.pip || 'pip 24.0'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">NPM Version</span>
            <div className="font-mono text-slate-200 truncate">
              {systemInfo?.runtimes.npm || 'npm 10.5.0'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">Rust Compiler</span>
            <div className="font-mono text-slate-200 truncate">
              {systemInfo?.runtimes.rust || 'rustc 1.77.0'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-medium">Go Toolchain</span>
            <div className="font-mono text-slate-200 truncate">
              {systemInfo?.runtimes.go || 'go version 1.22.1'}
            </div>
          </div>
        </div>
      </div>

      {/* Host Specs & Working Environment */}
      <div className="grid md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Host Architecture & Identity
          </div>
          <dl className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <dt className="text-slate-500">Hostname</dt>
              <dd className="text-slate-200 font-semibold">{systemInfo?.hostname || 'localhost'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">OS Platform</dt>
              <dd className="text-slate-200 font-semibold">
                {systemInfo?.platform || 'linux'} ({systemInfo?.arch || 'x64'})
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Kernel Release</dt>
              <dd className="text-slate-200">{systemInfo?.release || '6.6.13-generic'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">User / Home</dt>
              <dd className="text-slate-200 truncate">{systemInfo?.user.username || 'admin'}</dd>
            </div>
          </dl>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="font-bold text-white flex items-center gap-2">
            <Folder className="w-4 h-4 text-cyan-400" />
            Active Host Working Directory
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 break-all">
            {systemInfo?.currentWorkingDir || '/workspace/app'}
          </div>
          <p className="text-[11px] text-slate-400">
            The AI can execute commands, inspect file diffs, and create virtual environments relative to this directory.
          </p>
        </div>
      </div>
    </div>
  );
};
