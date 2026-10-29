/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Terminal,
  Cpu,
  User,
  Sparkles,
  RotateCw,
  Search,
  Download,
  FolderSync,
  ExternalLink,
  Code,
  Layers,
  FileCode,
  AlertTriangle,
  Wrench,
  Play,
} from 'lucide-react';
import { ChatMessage, OllamaSettings, SystemInfo } from '../types.ts';
import { ActionApprovalCard } from './ActionApprovalCard.tsx';
import { ContinuationPromptBanner } from './ContinuationPromptBanner.tsx';
import { ZenderByteLogo } from './ZenderByteLogo.tsx';
import { CodeHighlight } from './CodeHighlight.tsx';
import { RootDirectoryInput } from './RootDirectoryInput.tsx';

interface AgentChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onAllowAction: (actionId: string, autoAllowPrompt?: boolean) => void;
  onDenyAction: (actionId: string) => void;
  autoAllowPromptActive: boolean;
  onContinueAction: (promptWithLogs: string) => void;
  onCancelAutoContinue: () => void;
  ollamaSettings: OllamaSettings;
  systemInfo: SystemInfo | null;
  onOpenCodeStudio: () => void;
  onUpdateRootDirectory: (newPath: string) => Promise<boolean>;
  onNavigateToSearch: () => void;
  onSaveCodeToFile?: (code: string, language: string, suggestedFilename?: string) => void;
  activeFilePath?: string | null;
  openedFiles?: Array<{ path: string; name: string }>;
  recentLogs?: Array<{ id: string; timestamp: string; level: string; source: string; message: string }>;
  onStartFixErrorsAndMonitor?: (filePath?: string) => void;
  autoDebugLoop?: { active: boolean; targetFile: string | null; iteration: number };
  onStopAutoLoop?: () => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onAllowAction,
  onDenyAction,
  autoAllowPromptActive,
  onContinueAction,
  onCancelAutoContinue,
  ollamaSettings,
  systemInfo,
  onOpenCodeStudio,
  onUpdateRootDirectory,
  onNavigateToSearch,
  onSaveCodeToFile,
  activeFilePath,
  openedFiles,
  recentLogs,
  onStartFixErrorsAndMonitor,
  autoDebugLoop,
  onStopAutoLoop,
}) => {
  const [input, setInput] = useState('');
  const [writeToFileMode, setWriteToFileMode] = useState(false);
  const [targetFileName, setTargetFileName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let finalPrompt = input.trim();
    if (writeToFileMode) {
      const fileTarget = targetFileName.trim() || 'appropriate file name';
      finalPrompt += `\n\n[ADMIN DIRECTIVE: Write this code into a file using the // ACTION: WRITE_FILE block. Target filename: "${fileTarget}". Put the complete source code inside // DETAILS: so it can be approved and saved to disk.]`;
    }

    // Detect if prompt is asking to fix errors / debug / troubleshoot
    const isFixErrorsPrompt = /(?:fix(?:ing)?(?:\s+(?:all|the|any|these))?\s+errors?|debug|troubleshoot|diagnose\s+errors?|solve\s+error|repair\s+errors?)/i.test(input);
    if (isFixErrorsPrompt) {
      const activeFileHint = activeFilePath ? ` (Active file in Code Studio: "${activeFilePath}")` : '';
      finalPrompt += `\n\n[ADMIN DIRECTIVE: CRITICAL FOR FIXING ERRORS — DO NOT simulate the file or guess its contents in text. You MUST physically open and inspect the target file${activeFileHint} using // ACTION: READ_FILE with // NEEDS_LOGS: true so execution output and terminal logs are actively monitored before proposing fixes.]`;
    }

    onSendMessage(finalPrompt);
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt);
  };

  const lastMsg = messages[messages.length - 1];
  // Banner only appears when the AI explicitly flags that it needs execution logs to continue
  const hasCompletedActionAwaitingContinue =
    Boolean(
      lastMsg &&
      lastMsg.role === 'assistant' &&
      lastMsg.action &&
      lastMsg.action.status === 'completed' &&
      lastMsg.action.needsContinuationLogs === true
    );

  // Helper to render message content with syntax-highlighted code blocks
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        let lang = 'bash';
        let code = '';
        if (firstLineEnd !== -1) {
          lang = part.slice(3, firstLineEnd).trim() || 'bash';
          code = part.slice(firstLineEnd + 1, -3);
        } else {
          code = part.slice(3, -3);
        }
        return (
          <div key={idx} className="my-2">
            <CodeHighlight
              code={code}
              language={lang}
              showLineNumbers={code.split('\n').length > 3}
              onSaveToFile={onSaveCodeToFile}
            />
          </div>
        );
      }
      return (
        <span key={idx} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[#000000] text-slate-100 overflow-hidden">
      {/* Top Context Subheader with EDITABLE Root Directory Input */}
      <div className="w-full px-6 py-2.5 bg-[#0c0e14] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
            <ZenderByteLogo variant="icon" className="w-4 h-4 text-blue-500" />
            Ollama Agent
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            Model: <strong className="text-slate-200">{ollamaSettings.selectedModel}</strong>
          </span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">
            Memory: <strong className="text-blue-300">{ollamaSettings.promptMemoryLimit} prompts</strong>
          </span>
        </div>

        {/* Editable Custom Root Directory Input */}
        <div className="flex items-center gap-3">
          <RootDirectoryInput
            currentCwd={systemInfo?.currentWorkingDir || ''}
            onUpdateCwd={onUpdateRootDirectory}
          />

          <button
            onClick={onOpenCodeStudio}
            className="flex items-center gap-1 text-[11px] font-sans font-medium text-slate-300 hover:text-white px-2.5 py-1 bg-[#141721] border border-slate-700 rounded-lg transition-colors"
          >
            <Code className="w-3.5 h-3.5 text-blue-400" />
            Code Studio
          </button>
        </div>
      </div>

      {/* Auto-Monitoring Loop Active Banner */}
      {autoDebugLoop?.active && (
        <div className="w-full px-6 py-2.5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-[#0e111a] border-b border-blue-500/40 flex items-center justify-between gap-4 text-xs shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-blue-200">
            <RotateCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>
              <strong className="text-white">Auto-Monitoring Loop Active (Cycle {autoDebugLoop.iteration})</strong> · Target:{' '}
              <code className="text-blue-300 font-mono bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                {autoDebugLoop.targetFile || 'Target Process'}
              </code>
              <span className="text-slate-400 hidden sm:inline ml-1.5">
                Terminal logs auto-feed to Ollama when closed until a code action (<code>WRITE_FILE</code>) is received.
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={onStopAutoLoop}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 rounded text-xs font-semibold transition-colors shrink-0"
            title="Terminate automated debug loop"
          >
            <span>Stop Loop</span>
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto py-10 text-center space-y-6">
            {/* Exact Squircle with Blue Circle Logo from Reference Image */}
            <div className="flex justify-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2.2rem] bg-[#121212] border border-[#222222] shadow-[0_0_40px_rgba(37,99,235,0.25)] flex items-center justify-center">
                <svg
                  className="w-14 h-14 sm:w-16 sm:h-16 text-[#3b82f6]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black italic tracking-tight uppercase flex items-center justify-center">
                <span className="text-white">ZENDER</span>
                <span className="text-[#3b82f6]">BYTE</span>
              </h1>
              <p className="text-[11px] font-mono tracking-[0.35em] text-[#71717a] uppercase">
                NEXT GEN AUTONOMOUS MACHINE INTELLIGENCE
              </p>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed pt-1">
                Connected directly to your local Ollama daemon. No external or mock bots.
                Execute terminal commands, change root directories, download code, and inspect scripts under strict operator authorization.
              </p>
            </div>

            {/* Quick Starter Tasks */}
            <div className="pt-4 grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
              <button
                onClick={() =>
                  handleQuickPrompt('Search online incognito for Python async queue patterns and best practices.')
                }
                className="p-3.5 bg-[#11131a] hover:bg-[#161a24] border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-blue-300 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  Incognito Web Search
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Query technical documentation without saving to user browser history.
                </div>
              </button>

              <button
                onClick={() =>
                  handleQuickPrompt('Download python code from https://raw.githubusercontent.com/python/cpython/main/Lib/os.py into workspace.')
                }
                className="p-3.5 bg-[#11131a] hover:bg-[#161a24] border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-blue-300 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download File or Git Clone
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Download raw scripts or clone git repositories directly to host disk.
                </div>
              </button>

              <button
                onClick={() =>
                  handleQuickPrompt('Inspect root directory structure and active processes.')
                }
                className="p-3.5 bg-[#11131a] hover:bg-[#161a24] border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-blue-300 flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-indigo-400" />
                  Inspect Root Directory
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Analyze folders in active root and query host hardware telemetry.
                </div>
              </button>

              <button
                onClick={() => window.open('https://zenderbyte.github.io/', '_blank')}
                className="p-3.5 bg-[#11131a] hover:bg-[#161a24] border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all group"
              >
                <div className="text-xs font-semibold text-white group-hover:text-blue-300 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  ZenderByte Search Page
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Launch the official ZenderByte Next Gen Search in a new tab.
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-6 px-2 sm:px-4">
            {messages.map((msg) => {
              if (msg.role === 'system' || msg.isError) {
                return (
                  <div key={msg.id} className="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto my-1">
                    <div className="rounded-xl p-4 bg-amber-950/20 border border-amber-600/40 text-slate-200 shadow-sm flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-300 font-mono text-[11px] uppercase tracking-wider">
                            Ollama Daemon Status Notice
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-slate-300 whitespace-pre-wrap leading-relaxed font-sans text-xs">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                      <ZenderByteLogo variant="icon" className="w-4 h-4 text-blue-500" />
                    </div>
                  )}

                  <div
                    className={`text-xs ${
                      msg.role === 'user'
                        ? 'max-w-2xl rounded-2xl p-4 bg-blue-600 text-white shadow-md'
                        : 'w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl rounded-2xl p-4 sm:p-5 bg-[#10121a] border border-slate-800/80 text-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Step counter if multi-step */}
                    {msg.isMultiStepPlan && msg.stepCurrent && (
                      <div className="mb-2 text-[10px] font-mono uppercase text-blue-400 flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        Plan Execution: Step {msg.stepCurrent} of {msg.stepTotal || 3}
                      </div>
                    )}

                    <div className="space-y-2">{renderMessageContent(msg.content)}</div>

                    {/* Embedded Action Approval Gate */}
                    {msg.action && (
                      <ActionApprovalCard
                        action={msg.action}
                        onAllow={onAllowAction}
                        onDeny={onDenyAction}
                        autoAllowPromptActive={autoAllowPromptActive}
                      />
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Continuation Banner for Multi-Run debug loops */}
            {hasCompletedActionAwaitingContinue && lastMsg && lastMsg.action && (
              <div className="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl ml-11">
                <ContinuationPromptBanner
                  lastAction={lastMsg.action}
                  suggestedContinuation={lastMsg.suggestedContinuation}
                  isMultiStepPlan={lastMsg.isMultiStepPlan}
                  stepCurrent={(lastMsg.stepCurrent || 1) + 1}
                  stepTotal={lastMsg.stepTotal || 3}
                  autoAllowPromptActive={autoAllowPromptActive}
                  recentLogs={recentLogs}
                  onContinueAction={onContinueAction}
                  onCancelAutoContinue={onCancelAutoContinue}
                />
              </div>
            )}

            {isLoading && (
              <div className="flex gap-3.5 items-center ml-11 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span className="font-mono">
                  {ollamaSettings.selectedModel} is thinking...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Bar with Write to File Button */}
      <div className="p-4 bg-[#0a0c12] border-t border-slate-800 w-full shrink-0">
        <form onSubmit={handleSubmit} className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-2 px-2 sm:px-4">
          {/* Quick Action Toolbar with Write into File button & Fix Errors button */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWriteToFileMode(!writeToFileMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  writeToFileMode
                    ? 'bg-emerald-600/20 border border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-[#141721] hover:bg-[#1a1f2c] border border-slate-700/80 text-slate-300'
                }`}
                title="When ON, automatically instructs Ollama to format all generated code as a WRITE_FILE action block"
              >
                <FileCode className={`w-3.5 h-3.5 ${writeToFileMode ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Write into File</span>
                <span
                  className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${
                    writeToFileMode ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {writeToFileMode ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onStartFixErrorsAndMonitor) {
                    onStartFixErrorsAndMonitor(activeFilePath || undefined);
                  } else {
                    const targetHint = activeFilePath ? ` in ${activeFilePath.split('/').pop()}` : '';
                    setInput(`Fix the errors${targetHint} and monitor output logs`);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                title="Execute file in terminal, monitor output logs, and auto-loop until Ollama sends a code action fix"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fix Errors &amp; Monitor Logs</span>
              </button>

              {writeToFileMode && (
                <div className="flex items-center gap-1.5 bg-[#0e111a] border border-emerald-800/60 rounded-lg px-2.5 py-1 animate-fadeIn">
                  <span className="text-[10px] text-emerald-400 font-mono">File:</span>
                  <input
                    type="text"
                    value={targetFileName}
                    onChange={(e) => setTargetFileName(e.target.value)}
                    placeholder="e.g. hello.py (auto if empty)"
                    className="bg-transparent text-[11px] text-emerald-200 font-mono placeholder-slate-600 focus:outline-none w-44"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="hidden sm:inline">Quick append:</span>
              <button
                type="button"
                onClick={() => {
                  setInput((prev) => (prev ? `${prev.trim()} and write it into a file` : 'Write into a file'));
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-[#141721] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              >
                + &quot;and write to file&quot;
              </button>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 relative rounded-xl bg-[#10121a] border border-slate-800 focus-within:border-blue-500/70 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                rows={2}
                placeholder={
                  writeToFileMode
                    ? `Give code prompt (e.g. 'write a python hello world'). Code will be auto-formatted as a file write proposal!`
                    : "Give instructions to Ollama (e.g. 'Read main.py and refactor functions', 'Run python test suite', 'Search online for fast express proxies')..."
                }
                className="w-full bg-transparent px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 resize-none focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
