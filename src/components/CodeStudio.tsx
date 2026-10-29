/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Folder,
  Save,
  Play,
  RotateCw,
  Plus,
  X,
  Check,
  Code,
  Terminal,
  Sparkles,
  Eye,
  Edit3,
  FolderPlus,
  Trash2,
  Wrench,
} from 'lucide-react';
import { CodeEditorFile, SystemInfo } from '../types.ts';
import { CodeHighlight } from './CodeHighlight.tsx';
import { RootDirectoryInput } from './RootDirectoryInput.tsx';

interface CodeStudioProps {
  systemInfo: SystemInfo | null;
  openedFiles: CodeEditorFile[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
  onSaveFile: (file: CodeEditorFile) => Promise<boolean>;
  onRunFileInTerminal: (filePath: string) => void;
  onAskAiToRefactor: (filePath: string, code: string) => void;
  onOpenFileFromDisk: (filePath: string) => void;
  onUpdateRootDirectory: (newPath: string) => Promise<boolean>;
}

export const CodeStudio: React.FC<CodeStudioProps> = ({
  systemInfo,
  openedFiles,
  activeFilePath,
  onSelectFile,
  onCloseFile,
  onSaveFile,
  onRunFileInTerminal,
  onAskAiToRefactor,
  onOpenFileFromDisk,
  onUpdateRootDirectory,
}) => {
  const [fileList, setFileList] = useState<
    Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean; size: number }>
  >([]);
  const [loadingExplorer, setLoadingExplorer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'highlighted'>('edit');

  const activeFile = openedFiles.find((f) => f.path === activeFilePath) || openedFiles[0];
  const [editorContent, setEditorContent] = useState(activeFile ? activeFile.content : '');

  useEffect(() => {
    if (activeFile) {
      setEditorContent(activeFile.content);
    }
  }, [activeFile?.path]);

  const refreshExplorer = async () => {
    setLoadingExplorer(true);
    try {
      const res = await fetch('/api/system/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: systemInfo?.currentWorkingDir }),
      });
      if (res.ok) {
        const data = await res.json();
        setFileList(data.items || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingExplorer(false);
    }
  };

  useEffect(() => {
    refreshExplorer();
  }, [systemInfo?.currentWorkingDir]);

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    const updated: CodeEditorFile = {
      ...activeFile,
      content: editorContent,
      isDirty: false,
    };
    const ok = await onSaveFile(updated);
    setIsSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      refreshExplorer();
    }
  };

  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const targetPath = `${systemInfo?.currentWorkingDir || '/workspace'}/${newFileName.trim()}`;
    await onSaveFile({
      path: targetPath,
      name: newFileName.trim(),
      content: '// Created with ZenderByte Code Studio\n\n',
      language: newFileName.endsWith('.py')
        ? 'python'
        : newFileName.endsWith('.ts')
        ? 'typescript'
        : newFileName.endsWith('.json')
        ? 'json'
        : 'javascript',
    });
    setNewFileName('');
    setShowNewFileInput(false);
    onOpenFileFromDisk(targetPath);
    refreshExplorer();
  };

  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const targetPath = `${systemInfo?.currentWorkingDir || '/workspace'}/${newFolderName.trim()}`;
    try {
      const res = await fetch('/api/system/fs/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: targetPath }),
      });
      if (res.ok) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        refreshExplorer();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteItem = async (itemPath: string, itemName: string, isDirectory: boolean) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${isDirectory ? 'folder' : 'file'} "${itemName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/system/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: itemPath }),
      });
      if (res.ok) {
        onCloseFile(itemPath);
        refreshExplorer();
      }
    } catch {
      // ignore
    }
  };

  const handleStartRename = (itemPath: string, currentName: string) => {
    setRenamingPath(itemPath);
    setRenameValue(currentName);
  };

  const handleConfirmRename = async (oldPath: string) => {
    if (!renameValue.trim() || renameValue === oldPath.split('/').pop()) {
      setRenamingPath(null);
      return;
    }
    const lastSlashIdx = oldPath.lastIndexOf('/');
    const parentDir = lastSlashIdx !== -1 ? oldPath.substring(0, lastSlashIdx) : (systemInfo?.currentWorkingDir || '.');
    const newPath = `${parentDir}/${renameValue.trim()}`;

    try {
      const res = await fetch('/api/system/fs/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      if (res.ok) {
        setRenamingPath(null);
        refreshExplorer();
        if (activeFilePath === oldPath) {
          onOpenFileFromDisk(newPath);
          onCloseFile(oldPath);
        }
      }
    } catch {
      // ignore
    }
  };

  const lineNumbers = editorContent.split('\n').map((_, i) => i + 1);

  return (
    <div className="flex-1 flex h-[calc(100vh-65px)] bg-[#181a1f] text-slate-200 overflow-hidden font-mono text-xs">
      {/* VS Code Left Sidebar Explorer */}
      <div className="w-80 bg-[#14161a] border-r border-[#282c34] flex flex-col shrink-0">
        <div className="px-3 py-2.5 bg-[#181a1f] border-b border-[#282c34] flex items-center justify-between">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
            <Folder className="w-3.5 h-3.5 text-blue-400" />
            Explorer
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowNewFileInput(!showNewFileInput);
                setShowNewFolderInput(false);
              }}
              className="p-1 hover:text-white text-slate-400 rounded transition-colors"
              title="New File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(!showNewFolderInput);
                setShowNewFileInput(false);
              }}
              className="p-1 hover:text-white text-slate-400 rounded transition-colors"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button
              onClick={refreshExplorer}
              className="p-1 hover:text-white text-slate-400 rounded transition-colors"
              title="Refresh"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingExplorer ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Editable Root Directory in Explorer Header */}
        <div className="p-2 border-b border-[#282c34]">
          <RootDirectoryInput
            currentCwd={systemInfo?.currentWorkingDir || ''}
            onUpdateCwd={onUpdateRootDirectory}
            className="w-full"
          />
        </div>

        {/* New File Inline Form */}
        {showNewFileInput && (
          <form onSubmit={handleCreateNewFile} className="p-2 border-b border-[#282c34]">
            <div className="text-[10px] text-blue-400 mb-1 font-sans font-medium">New File Name:</div>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.py, app.ts, config.json..."
              className="w-full px-2 py-1 bg-[#14161a] border border-blue-500 rounded text-xs text-white focus:outline-none"
              autoFocus
            />
          </form>
        )}

        {/* New Folder Inline Form */}
        {showNewFolderInput && (
          <form onSubmit={handleCreateNewFolder} className="p-2 border-b border-[#282c34]">
            <div className="text-[10px] text-emerald-400 mb-1 font-sans font-medium">New Folder Name:</div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="components, utils, tests..."
              className="w-full px-2 py-1 bg-[#14161a] border border-emerald-500 rounded text-xs text-white focus:outline-none"
              autoFocus
            />
          </form>
        )}

        {/* File Tree List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {fileList.map((item) => (
            <div
              key={item.path}
              className={`group w-full px-2 py-1.5 rounded flex items-center justify-between gap-1 transition-colors ${
                activeFilePath === item.path
                  ? 'bg-blue-600/20 text-blue-300 font-semibold'
                  : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              {renamingPath === item.path ? (
                <div className="flex items-center gap-1 w-full">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename(item.path);
                      if (e.key === 'Escape') setRenamingPath(null);
                    }}
                    className="flex-1 px-1.5 py-0.5 bg-black border border-blue-400 rounded text-xs text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleConfirmRename(item.path)}
                    className="p-1 hover:text-emerald-400 text-slate-300"
                    title="Confirm rename"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRenamingPath(null)}
                    className="p-1 hover:text-rose-400 text-slate-300"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (item.isFile) {
                        onOpenFileFromDisk(item.path);
                      }
                    }}
                    className="flex items-center gap-2 flex-1 text-left truncate min-w-0"
                    title={item.path}
                  >
                    {item.isDirectory ? (
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleStartRename(item.path, item.name)}
                      className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-700/60"
                      title={`Rename ${item.isDirectory ? 'folder' : 'file'}`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.path, item.name, item.isDirectory)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-700/60"
                      title={`Delete ${item.isDirectory ? 'folder' : 'file'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {fileList.length === 0 && (
            <div className="p-4 text-center text-slate-500 font-sans text-xs">
              No files in current root.
            </div>
          )}
        </div>

        {/* Agent Fast Link */}
        <div className="p-3 bg-[#111317] border-t border-[#282c34] text-[11px] font-sans">
          <div className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            ZenderByte Synced
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Files & folders created or edited by Ollama automatically sync here in real time.
          </p>
        </div>
      </div>

      {/* Main Editor Body */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
        {/* Editor Tabs */}
        <div className="flex items-center bg-[#252526] border-b border-[#181a1f] overflow-x-auto">
          {openedFiles.map((file) => (
            <div
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`flex items-center gap-2 px-3.5 py-2 border-r border-[#181a1f] cursor-pointer text-xs select-none transition-colors ${
                activeFilePath === file.path
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                  : 'text-slate-400 hover:bg-[#2a2d2e] hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate max-w-[140px]">{file.name}</span>
              {file.isDirty && <span className="w-2 h-2 rounded-full bg-blue-400" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(file.path);
                }}
                className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {openedFiles.length === 0 && (
            <div className="px-4 py-2 text-slate-500 italic text-xs font-sans">
              No files opened. Select a file from explorer or ask Ollama to create one.
            </div>
          )}
        </div>

        {/* Editor Action Toolbar */}
        {activeFile && (
          <div className="px-4 py-2 bg-[#1b1d23] border-b border-[#282c34] flex items-center justify-between">
            <div className="text-[11px] text-slate-400 truncate max-w-md">
              {activeFile.path}
            </div>

            <div className="flex items-center gap-2 font-sans">
              {/* Toggle Edit vs Highlight View */}
              <div className="flex items-center bg-[#282c34] rounded-lg p-0.5 mr-1">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                    viewMode === 'edit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Editor Input Mode"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('highlighted')}
                  className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors ${
                    viewMode === 'highlighted' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Syntax Highlighted View"
                >
                  <Eye className="w-3 h-3" />
                  Highlight
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs transition-colors"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save File
                  </>
                )}
              </button>

              <button
                onClick={() => handleStartRename(activeFile.path, activeFile.name)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                title="Rename active file"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                Rename
              </button>

              <button
                onClick={() => handleDeleteItem(activeFile.path, activeFile.name, false)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded text-xs transition-colors"
                title="Delete active file"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Delete
              </button>

              <button
                onClick={() => onRunFileInTerminal(activeFile.path)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                title="Execute file via Security Gate"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Run in Terminal
              </button>

              <button
                onClick={() => onAskAiToRefactor(activeFile.path, editorContent)}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 rounded text-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Ask Ollama to Refactor
              </button>

              <button
                onClick={() =>
                  onAskAiToRefactor(
                    activeFile.path,
                    `Fix the errors in "${activeFile.path}" and monitor execution logs. Physically open and inspect the actual file from disk and review terminal output before proposing fixes.`
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 rounded text-xs transition-colors"
                title="Ask Ollama to physically inspect this file and monitor output logs to fix errors"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Fix Errors &amp; Monitor Logs
              </button>
            </div>
          </div>
        )}

        {/* Code Content & Line Numbers */}
        {activeFile ? (
          <div className="flex-1 flex overflow-hidden">
            {viewMode === 'edit' ? (
              <>
                {/* Gutter */}
                <div className="w-12 py-3 bg-[#1e1e1e] border-r border-[#282c34] select-none text-right pr-3 text-slate-600 font-mono text-xs leading-5">
                  {lineNumbers.map((num) => (
                    <div key={num}>{num}</div>
                  ))}
                </div>

                {/* Code Textarea */}
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  spellCheck={false}
                  className="flex-1 p-3 bg-[#1e1e1e] text-slate-200 font-mono text-xs leading-5 resize-none focus:outline-none overflow-auto whitespace-pre selection:bg-blue-600/40"
                />
              </>
            ) : (
              /* Highlighted Read-only View with Prism.js */
              <div className="flex-1 p-4 overflow-auto bg-[#1e1e1e]">
                <CodeHighlight
                  code={editorContent}
                  language={activeFile.language || 'python'}
                  showLineNumbers
                  className="w-full h-full"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 font-sans">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Code className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-sm">ZenderByte Code Studio</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Open any file from the explorer on the left or have Ollama create scripts on your host machine.
            </p>
          </div>
        )}

        {/* Bottom VS Code Status Bar */}
        <div className="px-3 py-1 bg-blue-600 text-white flex items-center justify-between text-[11px] font-sans">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold">
              <Terminal className="w-3 h-3" />
              main*
            </span>
            <span>0 errors, 0 warnings</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Ln {editorContent.split('\n').length}, Col 1</span>
            <span>UTF-8</span>
            <span className="uppercase">{activeFile?.language || 'Plain Text'}</span>
            <span>ZenderByte IDE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
