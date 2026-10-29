/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Globe, ShieldCheck } from 'lucide-react';
import { ZenderByteLogo } from './ZenderByteLogo.tsx';

interface ZenderByteSearchPageProps {
  onOpenLink?: (url: string) => void;
}

export const ZenderByteSearchPage: React.FC<ZenderByteSearchPageProps> = () => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const targetUrl = 'https://zenderbyte.github.io/';

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] bg-[#000000] text-white overflow-hidden">
      {/* Top Header Bar for Official Search Portal */}
      <div className="px-5 py-2.5 bg-[#0a0c10] border-b border-zinc-800/80 flex items-center justify-between gap-4 text-xs shrink-0 select-none">
        <div className="flex items-center gap-3">
          <ZenderByteLogo variant="icon" className="w-4 h-4 text-[#3b82f6]" />
          <span className="font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
            Official ZenderByte Search Portal
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-0.5 rounded border border-zinc-800">
            <Globe className="w-3 h-3 text-blue-400" />
            https://zenderbyte.github.io/
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono mr-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Official Embed
          </span>

          <button
            onClick={handleRefresh}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
            title="Reload Portal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
            title="Open in new browser tab"
          >
            <span>Open Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="flex-1 relative w-full h-full bg-[#000000]">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#000000] z-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ZenderByteLogo variant="icon" className="w-8 h-8 text-[#3b82f6] animate-pulse" />
            </div>
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Loading official ZenderByte search interface...</span>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={targetUrl}
          title="ZenderByte Official Next Gen Search"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0"
          allow="fullscreen; clipboard-read; clipboard-write; microphone; camera"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        />
      </div>
    </div>
  );
};
