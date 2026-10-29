/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar.tsx';
import { AgentChat } from './components/AgentChat.tsx';
import { SystemDashboard } from './components/SystemDashboard.tsx';
import { ProcessManager } from './components/ProcessManager.tsx';
import { LogsAndAnomalies } from './components/LogsAndAnomalies.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { CodeStudio } from './components/CodeStudio.tsx';
import {
  ChatMessage,
  ActionProposal,
  OllamaSettings,
  NotificationSettings,
  SystemInfo,
  SystemMetrics,
  ProcessItem,
  LogEntry,
  AnomalyAlert,
  CodeEditorFile,
  SearchResultItem,
} from './types.ts';

// Reusable singleton AudioContext to prevent browser audio context exhaustion
let sharedAudioCtx: AudioContext | null = null;
function getSharedAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<'chat' | 'editor' | 'dashboard' | 'processes' | 'logs'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings State with Prompt Memory Limit (1 to 20 prompts)
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>(() => {
    const saved = localStorage.getItem('zenderbyte_ollama_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.host) {
          // If a prior bug appended a port to a cloudflare tunnel, auto-clean it
          if (parsed.host.includes('.trycloudflare.com:') && /:\d+$/.test(parsed.host)) {
            parsed.host = parsed.host.replace(/:\d+$/, '');
          }
        }
        return parsed;
      } catch {
        // fallback
      }
    }
    return {
      host: 'http://localhost:11434',
      selectedModel: 'llama3.2:latest',
      temperature: 0.7,
      contextLength: 4096,
      systemPrompt: 'You are ZenderByte Agent — an autonomous machine intelligence turning any machine into a fully AI-powered workstation.',
      autoConnect: true,
      autoApproveSafe: false,
      autoApprovePrompt: false,
      promptMemoryLimit: 5,
    };
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('zenderbyte_notif_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      thresholdCpu: 85,
      thresholdMemory: 88,
      soundAlerts: true,
      desktopNotifications: false,
      autoPauseOnAnomaly: true,
      sensitivity: 'strict',
    };
  });

  // Host Telemetry State
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(false);

  // Code Studio State
  const [openedFiles, setOpenedFiles] = useState<CodeEditorFile[]>([
    {
      path: '/workspace/main.py',
      name: 'main.py',
      content: `# ZenderByte Agent Workspace\nimport os\nimport sys\n\ndef main():\n    print("ZenderByte Agent online on host:", os.uname().nodename)\n    print("Python runtime:", sys.version)\n\nif __name__ == "__main__":\n    main()\n`,
      language: 'python',
    },
    {
      path: '/workspace/config.json',
      name: 'config.json',
      content: `{\n  "agent": "ZenderByte",\n  "version": "2.0.0",\n  "incognito_search": true,\n  "memory_prompts": 5\n}\n`,
      language: 'json',
    },
  ]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>('/workspace/main.py');

  // Agent Chat State — Strictly Ollama only!
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Welcome to ZenderByte Agent — turning any machine into a fully AI-powered workstation.
This application communicates directly with your host's local Ollama instance (no third-party or built-in mock AI).

Features:
- Incognito Web Search (ZenderByte Next-Gen Search Interface)
- Custom Root Directory Input (type any project path on your PC)
- Syntax-Highlighted Code, Terminal Outputs, and Code Studio Editor
- Strict Security Gate (all executions require explicit operator approval)

Ensure 'ollama serve' is active on your machine. What task would you like Ollama to perform?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoAllowPromptActive, setAutoAllowPromptActive] = useState(false);

  // Sound chime helper
  const playChime = useCallback(
    (type: 'action' | 'alert') => {
      if (!notificationSettings.soundAlerts) return;
      try {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === 'action') {
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        } else {
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.2);
        }
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch {
        // Audio might be blocked prior to user interaction
      }
    },
    [notificationSettings.soundAlerts]
  );

  // 1. Fetch System Info
  const fetchSystemInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // 2. Fetch Metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/system/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);

        if (data.cpuPercent > notificationSettings.thresholdCpu) {
          playChime('alert');
        }
      }
    } catch {
      // ignore
    }
  }, [notificationSettings.thresholdCpu, playChime]);

  // 3. Fetch Processes
  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch('/api/system/processes');
      if (res.ok) {
        const data = await res.json();
        setProcesses(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // 4. Fetch Logs and Anomalies
  const fetchLogs = useCallback(async () => {
    try {
      const [logsRes, anomRes] = await Promise.all([
        fetch('/api/system/logs'),
        fetch('/api/system/anomalies'),
      ]);
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData.logs || []);
      }
      if (anomRes.ok) {
        const aData = await anomRes.json();
        setAnomalies(aData.anomalies || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // 5. Check Ollama Status & Tags
  const checkOllama = useCallback(async () => {
    try {
      const res = await fetch('/api/ollama/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: ollamaSettings.host }),
      });
      if (res.ok) {
        const data = await res.json();
        setOllamaOnline(Boolean(data.online));
      } else {
        setOllamaOnline(false);
      }

      const tagsRes = await fetch('/api/ollama/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: ollamaSettings.host }),
      });
      if (tagsRes.ok) {
        const tData = await tagsRes.json();
        if (tData.models && Array.isArray(tData.models)) {
          const names = tData.models.map((m: { name: string }) => m.name);
          setAvailableModels(names);
        }
      }
    } catch {
      setOllamaOnline(false);
    }
  }, [ollamaSettings.host]);

  // Initial load & Polling Interval
  useEffect(() => {
    fetchSystemInfo();
    fetchMetrics();
    fetchProcesses();
    fetchLogs();
    checkOllama();

    let isPolling = false;
    const interval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        await Promise.allSettled([fetchMetrics(), fetchLogs()]);
      } finally {
        isPolling = false;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSystemInfo, fetchMetrics, fetchProcesses, fetchLogs, checkOllama]);

  // Save settings helpers
  const handleSaveSettings = (newSettings: OllamaSettings) => {
    setOllamaSettings(newSettings);
    localStorage.setItem('zenderbyte_ollama_settings', JSON.stringify(newSettings));
    checkOllama();
  };

  const handleSaveNotifications = (newNotifs: NotificationSettings) => {
    setNotificationSettings(newNotifs);
    localStorage.setItem('zenderbyte_notif_settings', JSON.stringify(newNotifs));
  };

  // Custom Root Directory Updater
  const handleUpdateRootDirectory = async (newPath: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/system/cwd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setSystemInfo((prev) => (prev ? { ...prev, currentWorkingDir: data.currentWorkingDir } : null));
        fetchLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Send message directly to Ollama
  const handleSendMessage = async (text: string) => {
    setAutoAllowPromptActive(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Filter out past error alerts and warning banners from conversation memory so Ollama never copies or parrots them
      const sanitizedHistory = [...messages, userMsg]
        .filter(
          (m) =>
            !m.isError &&
            m.role !== 'system' &&
            !m.content.includes('Ollama Offline') &&
            !m.content.includes('Could not reach Ollama daemon')
        )
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: ollamaSettings.host,
          model: ollamaSettings.selectedModel,
          promptMemoryLimit: ollamaSettings.promptMemoryLimit,
          messages: sanitizedHistory,
          systemInfo,
          activeFilePath,
          openedFiles: openedFiles.map((f) => ({ path: f.path, name: f.name })),
        }),
      });

      let data: { error?: string; message?: { content?: string; action?: ActionProposal }; source?: string; model?: string } = {};
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        if (rawText.trim().startsWith('<') || rawText.includes('<!doctype')) {
          data = {
            error: `Ollama is not currently active at ${ollamaSettings.host}.\n\nTo use ZenderByte Agent with your local models:\n1. Run on your PC: OLLAMA_ORIGINS="*" && ollama serve\n2. Pull your model: ollama pull ${ollamaSettings.selectedModel}\n3. Start this app with: npm run dev`,
          };
        } else {
          try {
            data = JSON.parse(rawText);
          } catch {
            data = { error: rawText };
          }
        }
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const reply = data.message;
      let actionProposal: ActionProposal | undefined;

      if (reply?.action) {
        actionProposal = {
          id: `action-${Date.now()}`,
          type: reply.action.type,
          target: reply.action.target,
          reason: reply.action.reason,
          details: reply.action.details,
          risk: reply.action.risk || 'safe',
          status: 'pending',
          timestamp: new Date().toISOString(),
        };
        playChime('action');
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: reply?.content || '',
        timestamp: new Date().toISOString(),
        action: actionProposal,
        source: data.source,
        model: data.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      let errorText = err instanceof Error ? err.message : 'Could not contact Ollama daemon';
      if (errorText.includes('<!doctype') || errorText.includes('Unexpected token') || errorText.includes('JSON')) {
        errorText = `Ollama is not currently active at ${ollamaSettings.host}.\n\nWhen testing in the sandbox or on your PC:\n1. Start Ollama: OLLAMA_ORIGINS="*" && ollama serve\n2. Verify model: ollama pull ${ollamaSettings.selectedModel}\n3. Run locally: npm run dev`;
      }

      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        isError: true,
        content: errorText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      fetchLogs();
    }
  };

  // Execute Approved Action
  const handleAllowAction = async (actionId: string, autoAllowPrompt?: boolean) => {
    if (autoAllowPrompt) {
      setAutoAllowPromptActive(true);
    }

    setMessages((prev) =>
      prev.map((m) => {
        if (m.action && m.action.id === actionId) {
          return {
            ...m,
            action: {
              ...m.action,
              status: 'executing',
            },
          };
        }
        return m;
      })
    );

    const targetMsg = messages.find((m) => m.action?.id === actionId);
    if (!targetMsg || !targetMsg.action) return;

    const action = targetMsg.action;

    try {
      let resultPayload: Record<string, unknown> = {};

      if (action.type === 'EXEC_COMMAND' || action.type === 'ENV_SETUP') {
        const cmd = action.details || action.target;
        const res = await fetch('/api/system/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        resultPayload = await res.json();
      } else if (action.type === 'WRITE_FILE') {
        const res = await fetch('/api/system/fs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: action.target, content: action.details }),
        });
        resultPayload = await res.json();

        // Also sync into Code Studio opened files
        const fileName = action.target.split('/').pop() || 'edited_file';
        setOpenedFiles((prev) => {
          const exists = prev.find((f) => f.path === action.target);
          if (exists) {
            return prev.map((f) => (f.path === action.target ? { ...f, content: action.details } : f));
          }
          return [
            ...prev,
            {
              path: action.target,
              name: fileName,
              content: action.details,
              language: fileName.endsWith('.py') ? 'python' : 'typescript',
            },
          ];
        });
        setActiveFilePath(action.target);
      } else if (action.type === 'READ_FILE') {
        const res = await fetch('/api/system/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: action.target }),
        });
        resultPayload = await res.json();
        resultPayload.exitCode = res.ok ? 0 : 1;

        if (typeof resultPayload.content === 'string') {
          const fileName = action.target.split('/').pop() || 'file';
          resultPayload.size = resultPayload.content.length;
          setOpenedFiles((prev) => {
            const exists = prev.find((f) => f.path === action.target);
            if (exists) {
              return prev.map((f) =>
                f.path === action.target ? { ...f, content: resultPayload.content as string, isDirty: false } : f
              );
            }
            return [
              ...prev,
              {
                path: action.target,
                name: fileName,
                content: resultPayload.content as string,
                language: fileName.endsWith('.py') ? 'python' : fileName.endsWith('.js') || fileName.endsWith('.ts') ? 'typescript' : 'bash',
                isDirty: false,
              },
            ];
          });
          setActiveFilePath(action.target);
        }
      } else if (action.type === 'CREATE_FOLDER') {
        const res = await fetch('/api/system/fs/mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dirPath: action.target }),
        });
        const mkData = await res.json();
        resultPayload = { ...mkData, createdFolder: action.target, exitCode: 0 };
      } else if (action.type === 'DELETE_FILE' || action.type === 'DELETE_FOLDER') {
        const res = await fetch('/api/system/fs/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPath: action.target }),
        });
        const delData = await res.json();
        resultPayload = { ...delData, deletedPath: action.target, exitCode: 0 };
        // Clean up from openedFiles if file or folder was deleted
        setOpenedFiles((prev) => prev.filter((f) => f.path !== action.target && !f.path.startsWith(action.target + '/')));
      } else if (action.type === 'RENAME_PATH') {
        const oldPath = action.target;
        const newPath = action.details || '';
        const res = await fetch('/api/system/fs/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath, newPath }),
        });
        const renData = await res.json();
        resultPayload = { ...renData, renamedFrom: oldPath, renamedTo: newPath, exitCode: 0 };
        // Sync any opened files with the renamed path
        setOpenedFiles((prev) =>
          prev.map((f) => {
            if (f.path === oldPath) {
              const newName = newPath.split('/').pop() || f.name;
              return { ...f, path: newPath, name: newName };
            }
            if (f.path.startsWith(oldPath + '/')) {
              const suffix = f.path.substring(oldPath.length);
              return { ...f, path: newPath + suffix };
            }
            return f;
          })
        );
        if (activeFilePath === oldPath) {
          setActiveFilePath(newPath);
        }
      } else if (action.type === 'KILL_PROCESS') {
        const pid = parseInt(action.target, 10);
        const res = await fetch('/api/system/process/kill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid }),
        });
        resultPayload = await res.json();
        fetchProcesses();
      } else if (action.type === 'CHANGE_ROOT_DIRECTORY') {
        const res = await fetch('/api/system/cwd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPath: action.target }),
        });
        const cwdData = await res.json();
        resultPayload = { newCwd: cwdData.currentWorkingDir, exitCode: 0 };
        fetchSystemInfo();
      } else if (action.type === 'DOWNLOAD') {
        const res = await fetch('/api/system/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: action.target }),
        });
        resultPayload = await res.json();

        if (resultPayload.downloadedPath) {
          const dPath = resultPayload.downloadedPath as string;
          const dName = dPath.split('/').pop() || 'downloaded';
          try {
            const rRes = await fetch('/api/system/fs/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: dPath }),
            });
            if (rRes.ok) {
              const rData = await rRes.json();
              setOpenedFiles((prev) => [
                ...prev.filter((f) => f.path !== dPath),
                {
                  path: dPath,
                  name: dName,
                  content: rData.content || '',
                  language: dName.endsWith('.py') ? 'python' : 'typescript',
                },
              ]);
              setActiveFilePath(dPath);
            }
          } catch {
            // ignore
          }
        }
      } else if (action.type === 'SEARCH') {
        const res = await fetch('/api/system/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: action.target }),
        });
        const searchData = await res.json();
        resultPayload = {
          searchResults: searchData.results,
          exitCode: 0,
          durationMs: 350,
        };
      } else if (action.type === 'LAUNCH_LINK') {
        await fetch('/api/system/launch-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: action.target }),
        });
        window.open(action.target, '_blank');
        resultPayload = { openedUrl: action.target, exitCode: 0 };
      } else {
        resultPayload = { exitCode: 0, stdout: 'Operation completed successfully.' };
      }

      // Update message with completed result
      setMessages((prev) =>
        prev.map((m) => {
          if (m.action && m.action.id === actionId) {
            return {
              ...m,
              action: {
                ...m.action,
                status: 'completed',
                result: resultPayload,
              },
            };
          }
          return m;
        })
      );
    } catch (err: unknown) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.action && m.action.id === actionId) {
            return {
              ...m,
              action: {
                ...m.action,
                status: 'failed',
                result: { exitCode: 1, stderr: err instanceof Error ? err.message : 'Execution error' },
              },
            };
          }
          return m;
        })
      );
    } finally {
      fetchLogs();
      fetchMetrics();
    }
  };

  // Deny Action
  const handleDenyAction = (actionId: string) => {
    setAutoAllowPromptActive(false);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.action && m.action.id === actionId) {
          return {
            ...m,
            action: {
              ...m.action,
              status: 'denied',
            },
          };
        }
        return m;
      })
    );

    const denyMsg: ChatMessage = {
      id: `deny-${Date.now()}`,
      role: 'user',
      content: `Action denied by operator. Please formulate an alternative plan.`,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, denyMsg]);
  };

  // Multi-step continue action
  const handleContinueAction = (promptWithLogs: string) => {
    handleSendMessage(promptWithLogs);
  };

  // Resolve Anomaly
  const handleResolveAnomaly = async (id: string) => {
    try {
      const res = await fetch('/api/system/anomalies/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data.anomalies || []);
      }
    } catch {
      // ignore
    }
  };

  // Ask AI to mitigate anomaly
  const handleAskAiToFixAnomaly = (anom: AnomalyAlert) => {
    setCurrentTab('chat');
    handleSendMessage(
      `Mitigate and investigate system anomaly alert: "${anom.title}" (${anom.description}). Source: ${anom.source}. Execute diagnostics and propose fix.`
    );
  };

  // Request kill process from Process Manager
  const handleRequestKillProcess = (proc: ProcessItem) => {
    setCurrentTab('chat');
    handleSendMessage(`Kill process ${proc.name} with PID ${proc.pid}. It is consuming ${proc.memoryMb}MB RAM.`);
  };

  // Request launch process from Process Manager
  const handleRequestLaunchProcess = (command: string) => {
    setCurrentTab('chat');
    handleSendMessage(`Launch app or command: "${command}". Monitor execution output and report back.`);
  };

  // Code Studio File Operations
  const handleSaveFileInStudio = async (file: CodeEditorFile): Promise<boolean> => {
    try {
      const res = await fetch('/api/system/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: file.path, content: file.content }),
      });
      if (res.ok) {
        setOpenedFiles((prev) =>
          prev.map((f) => (f.path === file.path ? { ...f, content: file.content, isDirty: false } : f))
        );
        fetchLogs();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleOpenFileFromDisk = async (filePath: string) => {
    try {
      const res = await fetch('/api/system/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      if (res.ok) {
        const data = await res.json();
        const fileName = filePath.split('/').pop() || 'file';
        setOpenedFiles((prev) => {
          const exists = prev.find((f) => f.path === filePath);
          if (exists) {
            return prev.map((f) => (f.path === filePath ? { ...f, content: data.content } : f));
          }
          return [
            ...prev,
            {
              path: filePath,
              name: fileName,
              content: data.content,
              language: fileName.endsWith('.py')
                ? 'python'
                : fileName.endsWith('.ts')
                ? 'typescript'
                : fileName.endsWith('.json')
                ? 'json'
                : 'javascript',
            },
          ];
        });
        setActiveFilePath(filePath);
      }
    } catch {
      // ignore
    }
  };

  const handleRunFileInTerminal = (filePath: string) => {
    setCurrentTab('chat');
    const isPy = filePath.endsWith('.py');
    const cmd = isPy ? `python3 "${filePath}"` : `node "${filePath}"`;
    handleSendMessage(`Execute file "${filePath}" in terminal: \`${cmd}\`. Review output logs.`);
  };

  const handleAskAiToRefactor = (filePath: string, code: string) => {
    setCurrentTab('chat');
    handleSendMessage(
      `Refactor and optimize "${filePath}". Review for potential bugs, syntax issues, or performance bottlenecks:\n\`\`\`\n${code.slice(
        0,
        1500
      )}\n\`\`\``
    );
  };

  const handleAskAgentAboutSearch = (query: string, results: SearchResultItem[]) => {
    setCurrentTab('chat');
    const summary = results
      .slice(0, 3)
      .map((r, i) => `${i + 1}. [${r.title}](${r.url}): ${r.snippet}`)
      .join('\n');
    handleSendMessage(
      `I ran an incognito search for "${query}". Here are the top references:\n${summary}\n\nPlease analyze these findings and summarize recommendations.`
    );
  };

  // 1-Click Code-to-File Handler: Proposes WRITE_FILE action for operator approval
  const handleSaveCodeToFile = (code: string, language: string, suggestedFilename?: string) => {
    let defaultName = suggestedFilename;
    if (!defaultName) {
      const cleanLang = language.toLowerCase();
      if (cleanLang.includes('python') || cleanLang === 'py') defaultName = 'main.py';
      else if (cleanLang.includes('typescript') || cleanLang === 'ts') defaultName = 'index.ts';
      else if (cleanLang.includes('javascript') || cleanLang === 'js') defaultName = 'app.js';
      else if (cleanLang.includes('html')) defaultName = 'index.html';
      else if (cleanLang.includes('json')) defaultName = 'config.json';
      else if (cleanLang.includes('bash') || cleanLang.includes('sh')) defaultName = 'script.sh';
      else defaultName = 'output.txt';
    }

    const customPath = window.prompt(`Enter filename/path to save this code to:`, defaultName);
    if (!customPath || !customPath.trim()) return;

    const targetPath = customPath.trim();
    const actionProposal: ActionProposal = {
      id: `action-${Date.now()}`,
      type: 'WRITE_FILE',
      target: targetPath,
      reason: `Operator requested to write ${language} code block into file: ${targetPath}`,
      details: code,
      risk: 'safe',
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    const newMsg: ChatMessage = {
      id: `asst-${Date.now()}`,
      role: 'assistant',
      content: `I've prepared a file write proposal for \`${targetPath}\`. Review the payload and click **ALLOW** to write it to your disk and load it in Code Studio:`,
      timestamp: new Date().toISOString(),
      action: actionProposal,
    };

    setMessages((prev) => [...prev, newMsg]);
    playChime('action');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-slate-100 antialiased font-sans">
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        ollamaSettings={ollamaSettings}
        ollamaOnline={ollamaOnline}
        systemInfo={systemInfo}
        anomalies={anomalies}
      />

      <main className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">
        {currentTab === 'chat' && (
          <AgentChat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onAllowAction={handleAllowAction}
            onDenyAction={handleDenyAction}
            autoAllowPromptActive={autoAllowPromptActive}
            onContinueAction={handleContinueAction}
            onCancelAutoContinue={() => setAutoAllowPromptActive(false)}
            ollamaSettings={ollamaSettings}
            systemInfo={systemInfo}
            onOpenCodeStudio={() => setCurrentTab('editor')}
            onUpdateRootDirectory={handleUpdateRootDirectory}
            onNavigateToSearch={() => window.open('https://zenderbyte.github.io/', '_blank')}
            onSaveCodeToFile={handleSaveCodeToFile}
            activeFilePath={activeFilePath}
            openedFiles={openedFiles}
            recentLogs={logs.slice(0, 8)}
          />
        )}

        {currentTab === 'editor' && (
          <CodeStudio
            systemInfo={systemInfo}
            openedFiles={openedFiles}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
            onCloseFile={(path) => {
              setOpenedFiles((prev) => prev.filter((f) => f.path !== path));
              if (activeFilePath === path) {
                setActiveFilePath(openedFiles.find((f) => f.path !== path)?.path || null);
              }
            }}
            onSaveFile={handleSaveFileInStudio}
            onRunFileInTerminal={handleRunFileInTerminal}
            onAskAiToRefactor={handleAskAiToRefactor}
            onOpenFileFromDisk={handleOpenFileFromDisk}
            onUpdateRootDirectory={handleUpdateRootDirectory}
          />
        )}

        {currentTab === 'dashboard' && (
          <SystemDashboard
            systemInfo={systemInfo}
            metrics={metrics}
            anomalies={anomalies}
            onRefresh={() => {
              fetchSystemInfo();
              fetchMetrics();
              fetchLogs();
            }}
            onAskAiToFixAnomaly={handleAskAiToFixAnomaly}
            onResolveAnomaly={handleResolveAnomaly}
          />
        )}

        {currentTab === 'processes' && (
          <ProcessManager
            processes={processes}
            onRefresh={fetchProcesses}
            onRequestKillProcess={handleRequestKillProcess}
            onRequestLaunchProcess={handleRequestLaunchProcess}
          />
        )}

        {currentTab === 'logs' && (
          <LogsAndAnomalies
            logs={logs}
            anomalies={anomalies}
            notificationSettings={notificationSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onResolveAnomaly={handleResolveAnomaly}
            onAskAiToMitigate={handleAskAiToFixAnomaly}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={ollamaSettings}
        onSaveSettings={handleSaveSettings}
        notificationSettings={notificationSettings}
        onSaveNotifications={handleSaveNotifications}
        availableModels={availableModels}
        onRefreshModels={checkOllama}
      />
    </div>
  );
}
