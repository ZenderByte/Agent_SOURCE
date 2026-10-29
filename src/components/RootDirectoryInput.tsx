/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Folder, Check, ArrowRight } from 'lucide-react';

interface RootDirectoryInputProps {
  currentCwd?: string;
  onUpdateCwd: (newPath: string) => Promise<boolean>;
  className?: string;
}

export const RootDirectoryInput: React.FC<RootDirectoryInputProps> = ({
  currentCwd = '',
  onUpdateCwd,
  className = '',
}) => {
  const [value, setValue] = useState<string>(currentCwd || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentCwd) {
      setValue(currentCwd);
    }
  }, [currentCwd]);

  const trimmedVal = (value || '').trim();
  const trimmedCurrent = (currentCwd || '').trim();
  const isSameAsCurrent = trimmedVal === trimmedCurrent;
  const isSubmitDisabled = isUpdating || !trimmedVal || isSameAsCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;
    setIsUpdating(true);
    const ok = await onUpdateCwd(trimmedVal);
    setIsUpdating(false);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10131b] border border-slate-700/80 rounded-lg text-xs font-mono focus-within:border-blue-500 transition-colors">
        <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-slate-500 shrink-0 text-[11px] font-sans">Root:</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="/path/to/project or C:/workspace"
          className="bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none w-56 sm:w-72 truncate text-xs"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-1"
        title="Set custom root directory"
      >
        {savedSuccess ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            <span>Set!</span>
          </>
        ) : (
          <>
            <span>Set</span>
            <ArrowRight className="w-3 h-3" />
          </>
        )}
      </button>
    </form>
  );
};
