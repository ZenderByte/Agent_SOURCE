/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileCode, X, Check, Folder, ArrowRight } from 'lucide-react';

interface SaveFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (filePath: string) => void;
  defaultFilename: string;
  language: string;
  codeSnippet: string;
}

export const SaveFileDialog: React.FC<SaveFileDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultFilename,
  language,
  codeSnippet,
}) => {
  const [filePath, setFilePath] = useState(defaultFilename);

  useEffect(() => {
    if (isOpen) {
      setFilePath(defaultFilename);
    }
  }, [isOpen, defaultFilename]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim()) return;
    onConfirm(filePath.trim());
  };

  const previewLines = codeSnippet.split('\n').slice(0, 6).join('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#10131c] border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden font-sans text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0a0c12] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Save Code into File</h3>
              <p className="text-[11px] text-slate-400">Write source code to disk and load into Code Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Target File Path / Name:</span>
              <span className="text-[10px] text-blue-400 font-mono uppercase">{language}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="e.g. src/main.py or main.py"
                className="w-full px-3.5 py-2.5 bg-[#0a0c12] border border-slate-700 focus:border-blue-500 rounded-xl text-xs font-mono text-white placeholder-slate-500 outline-none transition-all shadow-inner"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Specify relative to project root. Subfolders will be created automatically.
            </p>
          </div>

          {/* Quick path presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400">Suggestions:</span>
            {['src/' + defaultFilename, defaultFilename, 'scripts/' + defaultFilename].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFilePath(preset)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-blue-300 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Code Preview */}
          <div>
            <div className="text-[11px] text-slate-400 mb-1">Payload Preview:</div>
            <pre className="p-2.5 rounded-lg bg-[#080a0f] border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-24">
              {previewLines}
              {codeSnippet.split('\n').length > 6 && '\n...'}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/50"
            >
              <Check className="w-3.5 h-3.5" />
              Save to File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
