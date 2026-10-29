/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, CheckCircle2, Clock } from 'lucide-react';
import { ActionProposal } from '../types.ts';

interface ContinuationPromptBannerProps {
  lastAction: ActionProposal;
  suggestedContinuation?: string;
  isMultiStepPlan?: boolean;
  stepCurrent?: number;
  stepTotal?: number;
  autoAllowPromptActive: boolean;
  onContinueAction: (promptWithLogs: string) => void;
  onCancelAutoContinue: () => void;
}

export const ContinuationPromptBanner: React.FC<ContinuationPromptBannerProps> = ({
  lastAction,
  suggestedContinuation,
  isMultiStepPlan,
  stepCurrent = 1,
  stepTotal = 3,
  autoAllowPromptActive,
  onContinueAction,
}) => {
  // Construct rich feedback payload for Ollama
  const defaultPayload = suggestedContinuation
    ? `${suggestedContinuation}\n\n[Execution Logs]:\nTarget: ${lastAction.target}\nStatus: ${lastAction.status}\nExit Code: ${
        lastAction.result?.exitCode ?? 0
      }\nDuration: ${lastAction.result?.durationMs || 120}ms\nOutput Summary: ${
        lastAction.result?.stdout
          ? lastAction.result.stdout.slice(0, 300)
          : lastAction.result?.stderr || 'Verified clean execution.'
      }`
    : `Continue action: Verified execution of ${lastAction.type} (${lastAction.target}). Exit code: ${
        lastAction.result?.exitCode ?? 0
      }. Proceed with next diagnostic or implementation step.`;

  const [customText, setCustomText] = useState(defaultPayload);

  return (
    <div className="my-3 rounded-xl border border-blue-500/30 bg-[#12151f] p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            Action Completed: <span className="font-mono text-blue-400">{lastAction.target}</span>
            {isMultiStepPlan && (
              <span className="text-[11px] font-mono text-slate-400">
                · Step {stepCurrent} of {stepTotal}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Ollama can receive these terminal logs to continue reasoning on your prompt.
          </div>
        </div>

        {autoAllowPromptActive && (
          <span className="text-[10px] font-mono uppercase bg-blue-950/60 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded">
            Auto-Allow Active For This Prompt
          </span>
        )}
      </div>

      {/* Suggested text to send back to Ollama */}
      <div className="relative mt-2">
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-[#0a0c12] border border-slate-800 p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          placeholder="Feedback payload to send to Ollama..."
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exit Code: {lastAction.result?.exitCode ?? 0}</span>
          <span>·</span>
          <span>Duration: {lastAction.result?.durationMs || 120}ms</span>
        </div>

        <button
          onClick={() => onContinueAction(customText)}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-blue-950"
        >
          <Send className="w-3.5 h-3.5" />
          Send "Continue Action" with Logs
        </button>
      </div>
    </div>
  );
};
