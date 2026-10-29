/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css';
import { Copy, Check, FileCode } from 'lucide-react';

interface CodeHighlightProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
  onSaveToFile?: (code: string, language: string) => void;
}

export const CodeHighlight: React.FC<CodeHighlightProps> = ({
  code,
  language = 'bash',
  showLineNumbers = false,
  className = '',
  onSaveToFile,
}) => {
  const [copied, setCopied] = useState(false);

  const cleanLang = language.toLowerCase().replace(/^language-/, '');
  const prismLang = Prism.languages[cleanLang] || Prism.languages.javascript || Prism.languages.plain;

  let highlighted = '';
  try {
    highlighted = Prism.highlight(code, prismLang, cleanLang);
  } catch {
    highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className={`relative rounded-lg bg-[#0d1017] border border-slate-800 overflow-hidden font-mono text-xs ${className}`}>
      {/* Header bar with language tag, save to file button, and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#141721] border-b border-slate-800/80 text-[11px] text-slate-400">
        <span className="uppercase font-semibold tracking-wider text-blue-400">{cleanLang}</span>
        <div className="flex items-center gap-1.5">
          {onSaveToFile && (
            <button
              type="button"
              onClick={() => onSaveToFile(code, cleanLang)}
              className="flex items-center gap-1 text-slate-300 hover:text-emerald-300 transition-colors px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-700/40 hover:bg-emerald-900/50"
              title="Write this code into a file on disk"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-sans font-medium text-[10px]">Write to File</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto p-3">
        {showLineNumbers && (
          <div className="select-none pr-3 text-right text-slate-600 border-r border-slate-800/80 mr-3">
            {lines.map((_, idx) => (
              <div key={idx} className="leading-5">
                {idx + 1}
              </div>
            ))}
          </div>
        )}
        <pre className="flex-1 overflow-x-auto m-0 p-0 bg-transparent text-slate-200 leading-5">
          <code
            className={`language-${cleanLang}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
};
