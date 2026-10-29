/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ActionType =
  | 'EXEC_COMMAND'
  | 'WRITE_FILE'
  | 'READ_FILE'
  | 'DELETE_FILE'
  | 'CREATE_FOLDER'
  | 'DELETE_FOLDER'
  | 'RENAME_PATH'
  | 'LAUNCH_APP'
  | 'KILL_PROCESS'
  | 'ENV_SETUP'
  | 'CHANGE_ROOT_DIRECTORY'
  | 'DOWNLOAD'
  | 'LAUNCH_LINK'
  | 'SEARCH';

export type ActionRisk = 'routine' | 'safe' | 'dangerous' | 'critical';

export type ActionStatus =
  | 'pending'
  | 'allowed'
  | 'denied'
  | 'auto_allowed'
  | 'executing'
  | 'completed'
  | 'failed';

export interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

export interface ActionResult {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  content?: string;
  bytesWritten?: number;
  error?: string;
  newCwd?: string;
  downloadedPath?: string;
  searchResults?: SearchResultItem[];
  openedUrl?: string;
  createdFolder?: string;
  deletedPath?: string;
  renamedFrom?: string;
  renamedTo?: string;
}

export interface ActionProposal {
  id: string;
  type: ActionType;
  target: string;
  reason: string;
  details: string;
  risk: ActionRisk;
  status: ActionStatus;
  result?: ActionResult;
  timestamp: string;
  needsContinuationLogs?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  action?: ActionProposal;
  suggestedContinuation?: string;
  isMultiStepPlan?: boolean;
  stepCurrent?: number;
  stepTotal?: number;
  source?: string;
  model?: string;
  needsContinuationLogs?: boolean;
  isError?: boolean;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  osType: string;
  release: string;
  arch: string;
  uptimeSeconds: number;
  primaryIp: string;
  allIps: { interface: string; address: string; family: string; internal: boolean }[];
  cpu: {
    model: string;
    cores: number;
    speedMhz: number;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usagePercent: number;
  };
  runtimes: {
    node: string;
    python: string;
    pip: string;
    git: string;
    docker: string;
    rust: string;
    go: string;
    npm: string;
  };
  user: {
    username: string;
    homedir: string;
  };
  currentWorkingDir: string;
}

export interface SystemMetrics {
  timestamp: string;
  cpuPercent: number;
  loadAvg: number[];
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    percent: number;
  };
  disk: {
    usedPercent: number;
    totalGb: number;
    freeGb: number;
  };
  uptimeSeconds: number;
}

export interface ProcessItem {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryMb: number;
  status: string;
  user: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'SECURITY';
  source: string;
  message: string;
  details?: Record<string, unknown> | string;
}

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  resolved: boolean;
}

export interface OllamaSettings {
  host: string;
  port?: number;
  selectedModel: string;
  temperature: number;
  contextLength: number;
  systemPrompt: string;
  autoConnect: boolean;
  autoApproveSafe: boolean;
  autoApprovePrompt: boolean;
  promptMemoryLimit: number; // default: 5, range: 1 to 20
}

export interface NotificationSettings {
  thresholdCpu: number;
  thresholdMemory: number;
  soundAlerts: boolean;
  desktopNotifications: boolean;
  autoPauseOnAnomaly: boolean;
  sensitivity: 'low' | 'medium' | 'strict';
}

export interface CodeEditorFile {
  path: string;
  name: string;
  content: string;
  isDirty?: boolean;
  language: string;
}
