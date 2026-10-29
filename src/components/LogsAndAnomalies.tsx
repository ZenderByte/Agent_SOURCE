/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  Search,
  Download,
  Filter,
  CheckCircle,
  Bell,
  Zap,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { LogEntry, AnomalyAlert, NotificationSettings } from '../types.ts';

interface LogsAndAnomaliesProps {
  logs: LogEntry[];
  anomalies: AnomalyAlert[];
  notificationSettings: NotificationSettings;
  onOpenSettings: () => void;
  onResolveAnomaly: (id: string) => void;
  onAskAiToMitigate: (anomaly: AnomalyAlert) => void;
}

export const LogsAndAnomalies: React.FC<LogsAndAnomaliesProps> = ({
  logs,
  anomalies,
  notificationSettings,
  onOpenSettings,
  onResolveAnomaly,
  onAskAiToMitigate,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'logs' | 'anomalies'>('logs');

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchesSearch =
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.source.toLowerCase().includes(search.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleExport = (format: 'json' | 'txt') => {
    let content = '';
    let filename = `sysadmin-audit-logs-${Date.now()}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else {
      content = filteredLogs
        .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}`)
        .join('\n');
      filename += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'ERROR':
        return <span className="text-rose-400 font-mono font-bold">ERROR</span>;
      case 'WARN':
        return <span className="text-amber-400 font-mono font-bold">WARN</span>;
      case 'AUDIT':
        return <span className="text-cyan-400 font-mono font-bold">AUDIT</span>;
      case 'SECURITY':
        return <span className="text-purple-400 font-mono font-bold">SECURITY</span>;
      case 'INFO':
      default:
        return <span className="text-slate-400 font-mono">INFO</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Audit Logs & System Anomaly Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Granular action audit trails, terminal execution history, and automated anomaly alert settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={() => handleExport('txt')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export TXT
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-cyan-400" />
            Notification Rules
          </button>
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'logs'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Audit Log Stream ({filteredLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            activeTab === 'anomalies'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Anomaly Alerts ({anomalies.filter((a) => !a.resolved).length} active)
        </button>
      </div>

      {activeTab === 'logs' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages, sources..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Severity Level Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg">
              {['ALL', 'INFO', 'WARN', 'ERROR', 'AUDIT', 'SECURITY'].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                    selectedLevel === level
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Granular Logs Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Audit Message & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-sans">
                      No logs matching query.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{getLevelBadge(entry.level)}</td>
                      <td className="px-4 py-2 text-cyan-400 font-semibold whitespace-nowrap">
                        {entry.source}
                      </td>
                      <td className="px-4 py-2 text-slate-200 font-sans">
                        <div>{entry.message}</div>
                        {entry.details && (
                          <div className="mt-1 font-mono text-[10px] text-slate-400 bg-black/40 p-1.5 rounded max-h-24 overflow-y-auto">
                            {typeof entry.details === 'string'
                              ? entry.details
                              : JSON.stringify(entry.details, null, 2)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Anomaly Alerts List & Configuration */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-white">Automated Anomaly Watchdogs</div>
              <div className="text-slate-400">
                Trigger thresholds: CPU &gt; {notificationSettings.thresholdCpu}% · Memory &gt;{' '}
                {notificationSettings.thresholdMemory}% · Auto-pause on critical:{' '}
                {notificationSettings.autoPauseOnAnomaly ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Adjust Thresholds →
            </button>
          </div>

          <div className="grid gap-3">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  anom.resolved
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : 'bg-amber-950/20 border-amber-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`uppercase text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        anom.severity === 'critical'
                          ? 'bg-rose-900/60 text-rose-300'
                          : anom.severity === 'high'
                          ? 'bg-amber-900/60 text-amber-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {anom.severity}
                    </span>
                    <span className="font-semibold text-white">{anom.title}</span>
                    <span className="text-slate-500 font-mono text-[11px]">· {anom.source}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!anom.resolved ? (
                      <>
                        <button
                          onClick={() => onAskAiToMitigate(anom)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Ask AI to Mitigate
                        </button>
                        <button
                          onClick={() => onResolveAnomaly(anom.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                        >
                          Mark Resolved
                        </button>
                      </>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-mono">
                        <CheckCircle className="w-3.5 h-3.5" /> Resolved
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-300">{anom.description}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Reported at {new Date(anom.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
