/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  FileCode,
  Trash2,
  Play,
  RotateCw,
  Copy,
  Check,
  ChevronRight,
  FolderSync,
  FolderPlus,
  FolderMinus,
  Edit3,
  Download,
  ExternalLink,
  Search,
} from 'lucide-react';
import { ActionProposal, ActionType } from '../types.ts';
import { CodeHighlight } from './CodeHighlight.tsx';

interface ActionApprovalCardProps {
  action: ActionProposal;
  onAllow: (actionId: string, autoAllowPrompt?: boolean) => void;
  onDeny: (actionId: string) => void;
  autoAllowPromptActive?: boolean;
}

export const ActionApprovalCard: React.FC<ActionApprovalCardProps> = ({
  action,
  onAllow,
  onDeny,
  autoAllowPromptActive = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'EXEC_COMMAND':
        return <Terminal className="w-4 h-4 text-cyan-400" />;
      case 'WRITE_FILE':
      case 'READ_FILE':
        return <FileCode className="w-4 h-4 text-emerald-400" />;
      case 'CREATE_FOLDER':
        return <FolderPlus className="w-4 h-4 text-emerald-400" />;
      case 'DELETE_FOLDER':
        return <FolderMinus className="w-4 h-4 text-rose-400" />;
      case 'RENAME_PATH':
        return <Edit3 className="w-4 h-4 text-amber-400" />;
      case 'DELETE_FILE':
      case 'KILL_PROCESS':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'LAUNCH_APP':
        return <Play className="w-4 h-4 text-indigo-400" />;
      case 'CHANGE_ROOT_DIRECTORY':
        return <FolderSync className="w-4 h-4 text-blue-400" />;
      case 'DOWNLOAD':
        return <Download className="w-4 h-4 text-blue-400" />;
      case 'SEARCH':
        return <Search className="w-4 h-4 text-blue-400" />;
      case 'LAUNCH_LINK':
        return <ExternalLink className="w-4 h-4 text-sky-400" />;
      case 'STOP_LOOP':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    }
  };

  const getActionPrefix = (type: ActionType): string => {
    switch (type) {
      case 'STOP_LOOP':
        return 'STOP AUTO-DEBUG LOOP:';
      case 'READ_FILE':
        return 'OPEN FILE:';
      case 'WRITE_FILE':
        return 'EDIT/WRITE FILE:';
      case 'CREATE_FOLDER':
        return 'CREATE FOLDER:';
      case 'DELETE_FOLDER':
        return 'DELETE FOLDER:';
      case 'RENAME_PATH':
        return 'RENAME PATH:';
      case 'EXEC_COMMAND':
        return 'EXECUTE TERMINAL COMMAND:';
      case 'DELETE_FILE':
        return 'DELETE PATH:';
      case 'KILL_PROCESS':
        return 'KILL PROCESS:';
      case 'LAUNCH_APP':
        return 'LAUNCH APP:';
      case 'ENV_SETUP':
        return 'AUTO-CONFIGURE ENVIRONMENT:';
      case 'CHANGE_ROOT_DIRECTORY':
        return 'CHANGE ROOT DIRECTORY:';
      case 'DOWNLOAD':
        return 'DOWNLOAD ASSET:';
      case 'SEARCH':
        return 'INCOGNITO WEB SEARCH:';
      case 'LAUNCH_LINK':
        return 'LAUNCH LINK IN BROWSER:';
      default:
        return 'SYSTEM ACTION:';
    }
  };

  const getRiskBadge = (risk: ActionProposal['risk']) => {
    switch (risk) {
      case 'critical':
        return <span className="text-[11px] font-mono text-rose-400">CRITICAL RISK</span>;
      case 'dangerous':
        return <span className="text-[11px] font-mono text-amber-400">CAUTION REQUIRED</span>;
      case 'routine':
        return <span className="text-[11px] font-mono text-slate-400">ROUTINE OPERATION</span>;
      case 'safe':
      default:
        return <span className="text-[11px] font-mono text-blue-400">OPERATOR GATED</span>;
    }
  };

  const getPayloadLanguage = (type: ActionType, target: string) => {
    if (target.endsWith('.py')) return 'python';
    if (target.endsWith('.json')) return 'json';
    if (target.endsWith('.ts') || target.endsWith('.tsx')) return 'typescript';
    if (target.endsWith('.js')) return 'javascript';
    if (type === 'EXEC_COMMAND' || type === 'ENV_SETUP') return 'bash';
    return 'plain';
  };

  return (
    <div className="mt-3 mb-2 rounded-xl border border-slate-700/80 bg-[#12141c] shadow-lg overflow-hidden transition-all w-full">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-[#0b0d13] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono min-w-0 max-w-full">
          {getActionIcon(action.type)}
          <span className="font-semibold text-blue-300 break-all">
            //{getActionPrefix(action.type)} {action.target}
            {action.startLine && action.endLine && (
              <span className="ml-2 text-amber-300 font-normal">
                (Lines {action.startLine}–{action.endLine})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action.needsContinuationLogs && (
            <span className="text-[10px] font-mono uppercase bg-blue-950/70 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded">
              Logs Needed
            </span>
          )}
          {getRiskBadge(action.risk)}
          {action.status === 'pending' && (
            <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
              Awaiting Approval
            </span>
          )}
          {action.status === 'executing' && (
            <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded flex items-center gap-1">
              <RotateCw className="w-3 h-3 animate-spin" />
              Executing...
            </span>
          )}
          {action.status === 'completed' && (
            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          )}
          {action.status === 'auto_allowed' && (
            <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
              Auto-Allowed
            </span>
          )}
          {action.status === 'denied' && (
            <span className="text-[10px] font-mono uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Denied
            </span>
          )}
        </div>
      </div>

      {/* Body / Reason */}
      <div className="p-4 space-y-3 text-xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium text-slate-400 mb-0.5">Admin Justification:</div>
            <p className="text-slate-200 text-sm leading-relaxed">{action.reason}</p>
          </div>
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="text-slate-400 hover:text-white transition-colors shrink-0 flex items-center gap-1 text-[11px]"
          >
            {detailsExpanded ? 'Hide Payload' : 'View Payload'}
            <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${detailsExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Syntax-Highlighted Code / Command Details */}
        {detailsExpanded && (
          <CodeHighlight
            code={action.details || action.target}
            language={getPayloadLanguage(action.type, action.target)}
            showLineNumbers={(action.details || action.target).split('\n').length > 3}
          />
        )}

        {/* Execution Output (if completed) */}
        {action.result && (
          <div className="rounded-lg bg-black/60 border border-slate-800/80 p-3 font-mono text-[11px] space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span>TERMINAL OUTPUT / RESULT</span>
              <div className="flex items-center gap-3">
                {action.result.durationMs !== undefined && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {action.result.durationMs}ms
                  </span>
                )}
                {action.result.exitCode !== undefined && (
                  <span
                    className={
                      action.result.exitCode === 0
                        ? 'text-emerald-400 font-semibold'
                        : 'text-rose-400 font-semibold'
                    }
                  >
                    Exit Code: {action.result.exitCode}
                  </span>
                )}
              </div>
            </div>

            {action.result.stdout && (
              <CodeHighlight code={action.result.stdout} language="bash" />
            )}
            {action.result.stderr && (
              <div className="p-2.5 rounded bg-rose-950/30 border border-rose-900/40 text-rose-300 font-mono text-xs whitespace-pre-wrap">
                {action.result.stderr}
              </div>
            )}
            {action.result.content && (
              <CodeHighlight
                code={action.result.content.slice(0, 800)}
                language={getPayloadLanguage(action.type, action.target)}
                showLineNumbers
              />
            )}
            {action.result.bytesWritten !== undefined && (
              <div className="text-emerald-300 font-semibold">
                {action.result.startLine && action.result.endLine ? (
                  <>Replaced lines {action.result.startLine}–{action.result.endLine} ({action.result.bytesWritten} bytes, total {action.result.totalLines} lines)</>
                ) : (
                  <>Wrote {action.result.bytesWritten} bytes to disk ({action.result.totalLines || 1} lines)</>
                )}
              </div>
            )}
            {action.result.startLine && action.result.endLine && !action.result.bytesWritten && (
              <div className="text-blue-300 font-semibold">
                Inspected lines {action.result.startLine}–{action.result.endLine} (total {action.result.totalLines} lines in file)
              </div>
            )}
            {action.result.newCwd && (
              <div className="text-blue-300 font-semibold">
                Root directory updated to: <code className="text-white">{action.result.newCwd}</code>
              </div>
            )}
            {action.result.createdFolder && (
              <div className="text-emerald-300 font-semibold">
                Directory created: <code className="text-white">{action.result.createdFolder}</code>
              </div>
            )}
            {action.result.deletedPath && (
              <div className="text-rose-300 font-semibold">
                Deleted path: <code className="text-white">{action.result.deletedPath}</code>
              </div>
            )}
            {action.result.renamedFrom && action.result.renamedTo && (
              <div className="text-amber-300 font-semibold">
                Renamed: <code className="text-slate-300">{action.result.renamedFrom}</code> ➔ <code className="text-white">{action.result.renamedTo}</code>
              </div>
            )}
            {action.result.downloadedPath && (
              <div className="text-emerald-300">File downloaded to: {action.result.downloadedPath}</div>
            )}
            {action.result.openedUrl && (
              <div className="text-sky-300 flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Opened in user browser: {action.result.openedUrl}
              </div>
            )}

            {/* Incognito Search Results Display */}
            {action.result.searchResults && action.result.searchResults.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">
                  Incognito Web Findings ({action.result.searchResults.length} references):
                </div>
                {action.result.searchResults.map((item, idx) => (
                  <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded space-y-0.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      {item.title}
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                    <p className="text-slate-300 text-[10px] leading-relaxed font-sans">{item.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer Bar with ALLOW ^ and DENY */}
      {action.status === 'pending' && (
        <div className="px-4 py-3 bg-[#0b0d13] border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 font-mono">
            {autoAllowPromptActive ? (
              <span className="text-blue-400">⚡ Auto-allow engaged for this prompt sequence</span>
            ) : (
              <span>Operator authorization required before execution</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* DENY BUTTON */}
            <button
              onClick={() => onDeny(action.id)}
              className="px-4 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/50 rounded-lg transition-colors whitespace-nowrap"
            >
              DENY
            </button>

            {/* SPLIT ALLOW BUTTON WITH DROPDOWN */}
            <div className="relative inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => onAllow(action.id, false)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-l-lg transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                ALLOW
              </button>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-2 py-1.5 text-xs text-white bg-blue-700 hover:bg-blue-600 border-l border-blue-800 rounded-r-lg transition-colors"
                title="More approval options"
              >
                <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-80 bg-[#161922] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-30 font-sans">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onAllow(action.id, true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-800 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-blue-400">AUTOMATICALLY ALLOW FOR THE REST OF THE PROMPT</span>
                    <span className="text-[11px] text-slate-400">
                      Authorizes pending steps of this prompt without re-prompting, then pauses.
                    </span>
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onAllow(action.id, false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Allow this single action only
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
