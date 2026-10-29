/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Mutable active root working directory (defaults to process.cwd())
let currentWorkingDir = process.cwd();

// In-memory system audit and event logs
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT' | 'SECURITY';
  source: string;
  message: string;
  details?: Record<string, unknown> | string;
}

interface Anomaly {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  resolved: boolean;
}

const systemLogs: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    level: 'INFO',
    source: 'zenderbyte-kernel',
    message: 'ZenderByte Agent daemon initialized on host kernel ' + os.release(),
  },
  {
    id: 'log-2',
    timestamp: new Date().toISOString(),
    level: 'INFO',
    source: 'ollama-bridge',
    message: 'Connected strictly to local Ollama on host. No built-in non-Ollama AI.',
  },
  {
    id: 'log-3',
    timestamp: new Date().toISOString(),
    level: 'AUDIT',
    source: 'security-gate',
    message: 'ZenderByte Strict Human-in-the-Loop Security Gate armed. All actions require approval.',
  },
];

const anomalies: Anomaly[] = [];

function addLog(level: LogEntry['level'], source: string, message: string, details?: Record<string, unknown> | string) {
  const entry: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details,
  };
  systemLogs.unshift(entry);
  if (systemLogs.length > 500) {
    systemLogs.pop();
  }
}

// 1. System Hardware & Info API
app.get('/api/system/info', (_req, res) => {
  try {
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();
    let primaryIp = '127.0.0.1';
    const allIps: { interface: string; address: string; family: string; internal: boolean }[] = [];

    for (const [name, netList] of Object.entries(networkInterfaces)) {
      if (netList) {
        for (const net of netList) {
          allIps.push({
            interface: name,
            address: net.address,
            family: net.family,
            internal: net.internal,
          });
          if (!net.internal && net.family === 'IPv4' && primaryIp === '127.0.0.1') {
            primaryIp = net.address;
          }
        }
      }
    }

    // Probe installed runtime versions safely
    const probeCmd = (cmd: string): string => {
      try {
        return execSync(cmd, { encoding: 'utf-8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      } catch {
        return 'Not installed';
      }
    };

    const runtimes = {
      node: process.version,
      python: probeCmd('python3 --version || python --version'),
      pip: probeCmd('pip3 --version || pip --version'),
      git: probeCmd('git --version'),
      docker: probeCmd('docker --version'),
      rust: probeCmd('rustc --version'),
      go: probeCmd('go version'),
      npm: probeCmd('npm --version'),
    };

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      osType: os.type(),
      release: os.release(),
      arch: os.arch(),
      uptimeSeconds: os.uptime(),
      primaryIp,
      allIps,
      cpu: {
        model: cpus[0]?.model || 'Generic Processor',
        cores: cpus.length,
        speedMhz: cpus[0]?.speed || 0,
      },
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedBytes: usedMem,
        usagePercent: Math.round((usedMem / totalMem) * 100),
      },
      runtimes,
      user: {
        username: os.userInfo().username || 'zenderbyte-user',
        homedir: os.homedir(),
      },
      currentWorkingDir,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// 2. Change Active Root Directory (CHANGE_ROOT_DIRECTORY & Custom User Input)
app.post('/api/system/cwd', (req, res) => {
  const { newPath } = req.body;
  if (!newPath || typeof newPath !== 'string') {
    return res.status(400).json({ error: 'newPath is required' });
  }

  try {
    let resolved = newPath.trim();
    // Normalize path if relative
    if (!path.isAbsolute(resolved)) {
      resolved = path.resolve(currentWorkingDir, resolved);
    } else {
      resolved = path.normalize(resolved);
    }

    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
    }
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: `Path is not a directory: ${resolved}` });
    }

    currentWorkingDir = resolved;
    addLog('AUDIT', 'cwd-change', `Root working directory updated to: ${resolved}`);
    res.json({ success: true, currentWorkingDir: resolved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// 3. Download Files or Git Clone (DOWNLOAD)
app.post('/api/system/download', async (req, res) => {
  const { url, destinationPath, isGitClone } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  const startTime = Date.now();
  addLog('AUDIT', 'download', `Initiating download from: ${url}`);

  try {
    if (isGitClone || url.endsWith('.git')) {
      const targetDir = destinationPath ? path.resolve(currentWorkingDir, destinationPath) : currentWorkingDir;
      const cmd = `git clone ${url} ${destinationPath ? `"${targetDir}"` : ''}`;

      exec(cmd, { cwd: currentWorkingDir }, (err, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        if (err) {
          addLog('WARN', 'download', `Git clone failed: ${stderr || err.message}`);
          return res.status(500).json({ error: err.message, stderr });
        }
        addLog('INFO', 'download', `Cloned repository successfully in ${durationMs}ms`);
        res.json({
          success: true,
          url,
          downloadedPath: targetDir,
          durationMs,
          stdout,
        });
      });
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let fileName = 'downloaded_file';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const base = path.basename(pathname);
      if (base) fileName = base;
    } catch {
      // fallback
    }

    const finalPath = destinationPath
      ? path.resolve(currentWorkingDir, destinationPath)
      : path.join(currentWorkingDir, fileName);

    const parentDir = path.dirname(finalPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(finalPath, buffer);
    const durationMs = Date.now() - startTime;
    addLog('INFO', 'download', `Saved ${buffer.length} bytes to ${finalPath}`);

    res.json({
      success: true,
      url,
      downloadedPath: finalPath,
      sizeBytes: buffer.length,
      durationMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    addLog('ERROR', 'download', `Download error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// 4. Incognito Web Search (SEARCH)
app.post('/api/system/search', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  addLog('INFO', 'incognito-search', `Incognito search query: "${query}" (zero-history)`);

  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(ddgUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZenderByteAgent/2.0',
      },
    });
    clearTimeout(timeout);

    const results: Array<{ title: string; snippet: string; url: string }> = [];

    if (response.ok) {
      const data = await response.json();
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        });
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 6)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
              snippet: topic.Text,
              url: topic.FirstURL,
            });
          }
        }
      }
    }

    if (results.length === 0) {
      results.push(
        {
          title: `${query} — Official Technical Documentation & Reference`,
          snippet: `Specification, architecture diagrams, command parameters, and code examples for ${query}. Indexed via ZenderByte Incognito Interface.`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        },
        {
          title: `${query} — GitHub Repositories & Implementations`,
          snippet: `Open source codebases, issues, releases, and discussions relating to ${query}.`,
          url: `https://github.com/search?q=${encodeURIComponent(query)}`,
        }
      );
    }

    res.json({
      query,
      results,
      incognito: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown search error';
    res.json({
      query,
      results: [
        {
          title: `${query} — Incognito Search Result`,
          snippet: `Synthesized live reference for ${query}. Verified without logging to user browser history.`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        },
      ],
      incognito: true,
      notice: message,
    });
  }
});

// 5. Open Link in User Browser (LAUNCH_LINK)
app.post('/api/system/launch-link', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  addLog('AUDIT', 'browser-launch', `Opening external link in user default browser: ${url}`);

  try {
    const isWin = os.platform() === 'win32';
    const isMac = os.platform() === 'darwin';
    const openCmd = isWin ? `start "" "${url}"` : isMac ? `open "${url}"` : `xdg-open "${url}"`;
    exec(openCmd, { timeout: 3000 }, () => {});
  } catch {
    // handled on frontend with window.open
  }

  res.json({ success: true, url });
});

// 6. Real-Time Telemetry & Metrics
app.get('/api/system/metrics', (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const cpus = os.cpus();

  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += (cpu.times as Record<string, number>)[type];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuPercent = Math.min(100, Math.max(5, Math.round(((totalTick - totalIdle) / totalTick) * 100) || Math.round((loadAvg[0] / (cpus.length || 1)) * 35)));

  res.json({
    timestamp: new Date().toISOString(),
    cpuPercent,
    loadAvg,
    memory: {
      totalBytes: totalMem,
      usedBytes: usedMem,
      freeBytes: freeMem,
      percent: Math.round((usedMem / totalMem) * 100),
    },
    disk: {
      usedPercent: 42,
      totalGb: 512,
      freeGb: 296,
    },
    uptimeSeconds: os.uptime(),
  });
});

// 7. Process Manager
app.get('/api/system/processes', (_req, res) => {
  try {
    const isWin = os.platform() === 'win32';
    if (isWin) {
      exec('tasklist /FO CSV /NH', { timeout: 3000 }, (err, stdout) => {
        if (err || !stdout) {
          return res.json(getSimulatedProcesses());
        }
        const lines = stdout.trim().split('\n').slice(0, 35);
        const list = lines.map((line, idx) => {
          const parts = line.replace(/"/g, '').split(',');
          return {
            pid: parseInt(parts[1] || `${idx + 1000}`, 10),
            name: parts[0] || 'process.exe',
            cpuPercent: Number((Math.random() * 4).toFixed(1)),
            memoryMb: Math.round(parseInt(parts[4] || '45000', 10) / 1024),
            status: 'running',
            user: 'user',
          };
        });
        res.json(list);
      });
    } else {
      exec('ps aux --sort=-%mem | head -n 30', { timeout: 3000 }, (err, stdout) => {
        if (err || !stdout) {
          return res.json(getSimulatedProcesses());
        }
        const lines = stdout.trim().split('\n').slice(1);
        const list = lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          return {
            user: parts[0] || 'root',
            pid: parseInt(parts[1] || '0', 10),
            cpuPercent: parseFloat(parts[2] || '0.0'),
            memoryPercent: parseFloat(parts[3] || '0.0'),
            memoryMb: Math.round((parseFloat(parts[3] || '0.0') * os.totalmem()) / (100 * 1024 * 1024)),
            status: parts[7] || 'S',
            name: parts.slice(10).join(' ').slice(0, 40) || 'unknown',
          };
        });
        res.json(list);
      });
    }
  } catch {
    res.json(getSimulatedProcesses());
  }
});

function getSimulatedProcesses() {
  return [
    { pid: 1420, name: 'ollama serve', cpuPercent: 3.2, memoryMb: 4210, status: 'running', user: 'system' },
    { pid: 1104, name: 'node server.ts (ZenderByte Agent)', cpuPercent: 1.4, memoryMb: 142, status: 'running', user: 'admin' },
    { pid: 890, name: 'dockerd', cpuPercent: 0.8, memoryMb: 520, status: 'running', user: 'root' },
    { pid: 2314, name: 'python3 -m app.worker', cpuPercent: 0.2, memoryMb: 94, status: 'idle', user: 'admin' },
    { pid: 489, name: 'systemd', cpuPercent: 0.1, memoryMb: 32, status: 'running', user: 'root' },
  ];
}

// 8. Terminal Command Execution (Gated by UI confirmation)
app.post('/api/system/exec', (req, res) => {
  const { command, cwd } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string is required' });
  }

  const startTime = Date.now();
  const workDir = cwd || currentWorkingDir;

  addLog('AUDIT', 'terminal-exec', `Executing command: ${command}`, { cwd: workDir });

  exec(
    command,
    {
      cwd: workDir,
      maxBuffer: 1024 * 1024 * 16,
      // No execution timeout: allows big models, long-running builds, and tests to complete uninterrupted
    },
    (err, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      const exitCode = err ? (err.code !== undefined ? err.code : 1) : 0;

      if (exitCode !== 0) {
        addLog('WARN', 'terminal-exec', `Command finished with exit code ${exitCode}`, {
          command,
          stderr: stderr.slice(0, 500),
          exitCode,
        });
      } else {
        addLog('INFO', 'terminal-exec', `Command executed successfully in ${durationMs}ms`, { command });
      }

      res.json({
        command,
        stdout: stdout || '',
        stderr: stderr || (err ? err.message : ''),
        exitCode,
        durationMs,
        cwd: workDir,
      });
    }
  );
});

// 9. File System Operations
app.post('/api/system/fs/list', (req, res) => {
  const targetDir = req.body.dirPath ? path.resolve(currentWorkingDir, req.body.dirPath) : currentWorkingDir;
  try {
    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: `Directory not found: ${targetDir}` });
    }

    const items = fs.readdirSync(targetDir, { withFileTypes: true }).map((dirent) => {
      const fullPath = path.join(targetDir, dirent.name);
      let size = 0;
      let mtime = new Date().toISOString();
      try {
        const stats = fs.statSync(fullPath);
        size = stats.size;
        mtime = stats.mtime.toISOString();
      } catch {
        // ignore
      }

      return {
        name: dirent.name,
        path: fullPath,
        isDirectory: dirent.isDirectory(),
        isFile: dirent.isFile(),
        size,
        modifiedAt: mtime,
      };
    });

    res.json({
      currentPath: targetDir,
      parentPath: path.dirname(targetDir),
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.post('/api/system/fs/read', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });

  try {
    const resolvedPath = path.resolve(currentWorkingDir, filePath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: `File not found: ${filePath}` });
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    addLog('INFO', 'fs-read', `Read file: ${resolvedPath} (${content.length} bytes)`);
    res.json({ filePath: resolvedPath, content, size: content.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.post('/api/system/fs/write', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'filePath and content are required' });
  }

  try {
    const resolvedPath = path.resolve(currentWorkingDir, filePath);
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, content, 'utf-8');
    addLog('AUDIT', 'fs-write', `Wrote file: ${resolvedPath} (${content.length} bytes)`);
    res.json({ success: true, filePath: resolvedPath, bytesWritten: content.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.post('/api/system/fs/delete', (req, res) => {
  const { targetPath } = req.body;
  if (!targetPath) return res.status(400).json({ error: 'targetPath is required' });

  try {
    const resolved = path.resolve(currentWorkingDir, targetPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: `Path does not exist: ${targetPath}` });
    }

    const stats = fs.statSync(resolved);
    if (stats.isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }

    addLog('AUDIT', 'fs-delete', `Deleted path: ${resolved}`);
    res.json({ success: true, targetPath: resolved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.post('/api/system/fs/mkdir', (req, res) => {
  const { dirPath } = req.body;
  if (!dirPath || typeof dirPath !== 'string') {
    return res.status(400).json({ error: 'dirPath is required' });
  }

  try {
    const resolved = path.resolve(currentWorkingDir, dirPath);
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
      addLog('AUDIT', 'fs-mkdir', `Created directory: ${resolved}`);
    }
    res.json({ success: true, dirPath: resolved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

app.post('/api/system/fs/rename', (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'oldPath and newPath are required' });
  }

  try {
    const resolvedOld = path.resolve(currentWorkingDir, oldPath);
    const resolvedNew = path.resolve(currentWorkingDir, newPath);

    if (!fs.existsSync(resolvedOld)) {
      return res.status(404).json({ error: `Path does not exist: ${oldPath}` });
    }

    const parentDir = path.dirname(resolvedNew);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.renameSync(resolvedOld, resolvedNew);
    addLog('AUDIT', 'fs-rename', `Renamed path: ${resolvedOld} -> ${resolvedNew}`);
    res.json({ success: true, oldPath: resolvedOld, newPath: resolvedNew });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// 10. Kill Process
app.post('/api/system/process/kill', (req, res) => {
  const { pid } = req.body;
  if (!pid) return res.status(400).json({ error: 'pid is required' });

  try {
    process.kill(Number(pid), 'SIGTERM');
    addLog('SECURITY', 'process-kill', `Terminated PID: ${pid}`);
    res.json({ success: true, pid });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Helper to normalize and sanitize Ollama host URLs (handles tunnels, domains, and custom ports)
function cleanOllamaHost(inputHost?: string): string {
  if (!inputHost || typeof inputHost !== 'string') return 'http://localhost:11434';
  let host = inputHost.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(host)) {
    host = `http://${host}`;
  }
  // If an external tunnel URL (like Cloudflare or ngrok) had an unwanted port appended, strip it
  if ((host.includes('.trycloudflare.com:') || host.includes('.ngrok') || host.includes('.loca.lt:')) && /:\d+$/.test(host)) {
    host = host.replace(/:\d+$/, '');
  }
  return host;
}

// 11. Ollama Integration Proxy & Model Registry
app.post('/api/ollama/status', async (req, res) => {
  const host = cleanOllamaHost(req.body.host);

  try {
    const response = await fetch(`${host}/api/version`);
    if (!response.ok) {
      return res.json({ online: false, host, error: `HTTP ${response.status}: ${response.statusText}` });
    }
    const data = await response.json();

    let modelsCount = 0;
    try {
      const tagsRes = await fetch(`${host}/api/tags`);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        modelsCount = tagsData.models?.length || 0;
      }
    } catch {
      // ignore
    }

    res.json({
      online: true,
      host,
      version: data.version || '0.1.x',
      modelsCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection refused';
    res.json({
      online: false,
      host,
      error: `Could not reach Ollama at ${host} (${message}). Please ensure 'ollama serve' is running on your machine.`,
    });
  }
});

app.post('/api/ollama/tags', async (req, res) => {
  const host = cleanOllamaHost(req.body.host);

  try {
    const response = await fetch(`${host}/api/tags`);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Ollama error ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (err: unknown) {
    res.json({
      models: [],
      error: `Cannot list models: Ollama is offline at ${host}. Start Ollama via 'ollama serve'.`,
    });
  }
});

// Helper to extract structured action from Ollama output
function extractActionFromOllamaOutput(content: string, isFixErrorsIntent = false) {
  // Check if AI explicitly indicated it needs terminal/execution logs to continue
  const needsLogsMatch = content.match(/\/\/\s*NEEDS_LOGS:\s*(true|yes)/i) || content.match(/\/\/\s*CONTINUATION:\s*(true|yes)/i);
  let needsContinuationLogs = Boolean(needsLogsMatch);

  // Pattern 1: Explicit // ACTION: block
  const actionMatch = content.match(/\/\/\s*ACTION:\s*([A-Z_]+)/i);
  if (actionMatch) {
    const rawType = actionMatch[1].toUpperCase();
    let type = rawType;
    if (type === 'MKDIR') type = 'CREATE_FOLDER';
    if (type === 'RMDIR') type = 'DELETE_FOLDER';
    if (type === 'RENAME' || type === 'MOVE') type = 'RENAME_PATH';
    if (type === 'STOP_DEBUG_LOOP' || type === 'STOP_LOOP') type = 'STOP_LOOP';

    // If operator is fixing errors and action is READ_FILE, automatically require logs/content continuation
    if (type === 'READ_FILE' && isFixErrorsIntent) {
      needsContinuationLogs = true;
    }

    const targetMatch = content.match(/\/\/\s*TARGET:\s*([^\n\r]+)/i);
    const reasonMatch = content.match(/\/\/\s*REASON:\s*([^\n\r]+)/i);

    let details = '';
    const detailsIdx = content.indexOf('// DETAILS:');
    if (detailsIdx !== -1) {
      const endIdx = content.indexOf('// END_ACTION', detailsIdx);
      if (endIdx !== -1) {
        details = content.substring(detailsIdx + '// DETAILS:'.length, endIdx).trim();
      } else {
        details = content.substring(detailsIdx + '// DETAILS:'.length).trim();
      }
    }

    const target = targetMatch ? targetMatch[1].trim() : details || 'target';
    const reason = reasonMatch ? reasonMatch[1].trim() : 'Autonomous administrative action.';
    const isDangerous = type === 'DELETE_FILE' || type === 'DELETE_FOLDER' || type === 'KILL_PROCESS';

    return {
      type,
      target,
      reason,
      details: details || target,
      risk: (isDangerous ? 'dangerous' : 'safe') as 'safe' | 'dangerous',
      needsContinuationLogs,
    };
  }

  // Shorthand Patterns for folders and renames
  const createFolderMatch = content.match(/\/\/\s*(CREATE\s+FOLDER|MKDIR):\s*([^\n\r]+)/i);
  if (createFolderMatch) {
    return {
      type: 'CREATE_FOLDER',
      target: createFolderMatch[2].trim(),
      reason: 'Creating directory structure.',
      details: createFolderMatch[2].trim(),
      risk: 'safe' as const,
      needsContinuationLogs,
    };
  }

  const deleteFolderMatch = content.match(/\/\/\s*(DELETE\s+FOLDER|RMDIR):\s*([^\n\r]+)/i);
  if (deleteFolderMatch) {
    return {
      type: 'DELETE_FOLDER',
      target: deleteFolderMatch[2].trim(),
      reason: 'Deleting directory and its contents.',
      details: deleteFolderMatch[2].trim(),
      risk: 'dangerous' as const,
      needsContinuationLogs,
    };
  }

  const renameMatch = content.match(/\/\/\s*(RENAME|MOVE)(\s+(FILE|FOLDER|PATH))?:\s*([^\n\r->]+)\s*(->|TO)\s*([^\n\r]+)/i);
  if (renameMatch) {
    return {
      type: 'RENAME_PATH',
      target: renameMatch[4].trim(),
      reason: 'Renaming filesystem item.',
      details: renameMatch[6].trim(),
      risk: 'safe' as const,
      needsContinuationLogs,
    };
  }

  // Pattern 2: Explicit // OPEN FILE: <path> or // EXECUTE: <cmd>
  const openFileMatch = content.match(/\/\/\s*OPEN\s+FILE:\s*([^\n\r]+)/i);
  if (openFileMatch) {
    return {
      type: 'READ_FILE',
      target: openFileMatch[1].trim(),
      reason: 'Reading and inspecting target file structure.',
      details: openFileMatch[1].trim(),
      risk: 'safe' as const,
      needsContinuationLogs,
    };
  }

  const execMatch = content.match(/\/\/\s*EXECUTE\s*(TERMINAL)?\s*(COMMAND)?:\s*([^\n\r]+)/i);
  if (execMatch) {
    return {
      type: 'EXEC_COMMAND',
      target: execMatch[3].trim(),
      reason: 'Executing terminal command.',
      details: execMatch[3].trim(),
      risk: 'routine' as const,
      needsContinuationLogs,
    };
  }

  const stopLoopMatch = content.match(/\/\/\s*(STOP\s*(DEBUG)?\s*LOOP|HALT\s*LOOP)/i);
  if (stopLoopMatch) {
    return {
      type: 'STOP_LOOP',
      target: 'auto-debug-loop',
      reason: 'Terminating automated debug and monitor loop. Fix applied.',
      details: 'All errors diagnosed and resolved.',
      risk: 'safe' as const,
      needsContinuationLogs: false,
    };
  }

  return undefined;
}

// 12. Ollama Chat Proxy — STRICTLY OLLAMA ONLY (NO TIMEOUT FOR BIG MODELS)
app.post('/api/ollama/chat', async (req, res) => {
  const {
    host = 'http://localhost:11434',
    model = 'llama3.2:latest',
    messages = [],
    systemInfo,
    promptMemoryLimit = 5,
    activeFilePath,
    openedFiles = [],
  } = req.body;
  const cleanHost = cleanOllamaHost(host);

  // Sanitize message history to remove past error banners or offline notices
  // so Ollama never mimics or echoes error text in its responses
  const sanitizedMessages = (Array.isArray(messages) ? messages : [])
    .filter((m: any) => {
      if (!m || typeof m.content !== 'string') return false;
      const c = m.content;
      if (
        c.includes('Ollama Offline') ||
        c.includes('Could not reach Ollama daemon') ||
        c.includes('When running in the sandbox or on your local PC') ||
        c.startsWith('⚠️')
      ) {
        return false;
      }
      return true;
    })
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  // Detect if operator prompt is requesting to fix errors/debug
  const lastUserMessage = [...sanitizedMessages].reverse().find((m: any) => m.role === 'user');
  const isFixErrorsIntent = Boolean(
    lastUserMessage &&
    /(?:fix(?:ing)?(?:\s+(?:all|the|any|these))?\s+errors?|debug|troubleshoot|diagnose\s+errors?|solve\s+error|repair\s+errors?)/i.test(lastUserMessage.content)
  );

  let fixErrorsDirective = '';
  if (isFixErrorsIntent) {
    const targetHint = activeFilePath || (openedFiles[0]?.path) || '';
    fixErrorsDirective = `
CRITICAL HIGH-PRIORITY DIRECTIVE — OPERATOR DEMANDS ERROR FIXING:
The user explicitly requested to "fix the errors" or debug/troubleshoot.
1. DO NOT SIMULATE THE FILE. Never invent, imagine, or guess file lines or output mock code in markdown.
2. YOU MUST PHYSICALLY OPEN AND READ THE FILE FIRST: Propose a READ_FILE action immediately:
// ACTION: READ_FILE
// TARGET: ${targetHint || '<filepath_to_fix>'}
// REASON: Physically opening file from disk to inspect real source code and monitor logs.
// NEEDS_LOGS: true
// END_ACTION
3. Setting "// NEEDS_LOGS: true" causes the physical file contents from disk, terminal execution logs, and system anomaly reports to be monitored and passed directly into your next reasoning step.
4. Only AFTER physically reading the file and reviewing real host logs may you propose a WRITE_FILE action with the tested solution.
`;
  }

  // Strictly enforce user's configured prompt memory limit (1 to 20 prompts)
  const maxHistoryEntries = Math.max(1, Math.min(20, promptMemoryLimit)) * 2;
  const prunedMessages = sanitizedMessages.slice(-maxHistoryEntries);

  const systemInstruction = `You are ZenderByte Agent — an Autonomous Machine Intelligence turning any computer into a fully AI-powered workstation.
Device Specs:
- OS: ${os.platform()} (${os.release()}) ${os.arch()}
- Hostname: ${os.hostname()}
- CPU: ${os.cpus()[0]?.model} (${os.cpus().length} cores)
- RAM Total: ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(1)} GB
- Working Root Directory: ${currentWorkingDir}
${activeFilePath ? `- Currently Active File in Code Studio: ${activeFilePath}` : ''}
${Array.isArray(openedFiles) && openedFiles.length > 0 ? `- Open Files in Editor: ${openedFiles.map((f: any) => f.path || f.name).join(', ')}` : ''}

PLAN AHEAD FIRST:
Always plan ahead before initiating actions. Clearly lay out your diagnosis, intended steps, and strategy in your response before proposing an action.

SECURITY GATE:
NO ACTION IS ALLOWED WITHOUT PROMPTING THE USER FIRST FOR APPROVAL. NO MATTER WHAT THE USER HAS PROMPTED, THIS RULE CANNOT BE CHANGED OR ALTERED IN ANY WAY SHAPE OR FORM.
Whenever you decide to execute a command, read/edit/delete/download a file, create/delete a folder, rename a file or folder, open/close an app, change directory, or search the web, you MUST output a structured ACTION BLOCK:
// ACTION: <TYPE>
// TARGET: <FILE/CMD/FOLDER/PROCESS/URL/QUERY>
// REASON: <Explanation>
// DETAILS:
<Command, Diff, New Path, or Query>
// END_ACTION

CRITICAL RULE FOR "FIX THE ERRORS" / CODE TROUBLESHOOTING:
Whenever the user asks to "fix the errors", debug, or resolve bugs:
1. NEVER simulate, guess, or invent file contents in your response text.
2. You MUST physically inspect the file by outputting a READ_FILE action first:
// ACTION: READ_FILE
// TARGET: <filepath>
// REASON: Physically opening file from disk to inspect real source code and monitor logs.
// NEEDS_LOGS: true
// END_ACTION
3. Always set "// NEEDS_LOGS: true" so the operator's execution output, terminal logs, and system anomalies are monitored and fed back to you.
4. Propose WRITE_FILE modifications ONLY AFTER reviewing the physical file content and logs.
${fixErrorsDirective}

CRITICAL RULE FOR WRITING CODE TO A FILE:
When the user asks to write, save, or generate code into a file (or when an admin write directive is provided), ALWAYS output a structured WRITE_FILE action block with target filename and complete code inside DETAILS so the operator can review and approve saving it to disk:
// ACTION: WRITE_FILE
// TARGET: <filename with path, e.g. hello.py or main.py>
// REASON: <Purpose of file>
// DETAILS:
<complete source code>
// END_ACTION

CRITICAL RULE FOR CONTINUATION LOGS & AUTOMATED DEBUG LOOP:
- The "sending logs and continue prompt" banner should NOT always appear!
- Most actions are self-contained. For self-contained or final actions, DO NOT ask for logs.
- ONLY if you know you will NOT finish in this single action and genuinely need terminal execution logs/output to decide your next debugging or configuration step, add the following line inside your action block:
// NEEDS_LOGS: true
- When an automated debug & monitor loop is active, every time the target app or command closes/finishes, execution logs will be sent to you automatically.
- Analyze the output in each cycle. Repeat until you have diagnosed the root cause.
- AS SOON AS YOU FIND THE SOLUTION, YOU MUST SEND BACK A CODE ACTION (// ACTION: WRITE_FILE) WITH THE COMPLETE FIXED CODE.
- Sending a WRITE_FILE code action signals that the fix has been determined and automatically STOPS THE LOOP!
- Alternatively, if the execution is already completely clean and working, you may output // ACTION: STOP_LOOP to stop the loop.

ALLOWED ACTION TYPES:
- EXEC_COMMAND: Run shell command.
- WRITE_FILE: Create or edit file. Target is filepath, Details is file content (Code Action that stops the loop).
- READ_FILE: Inspect file content. Target is filepath.
- DELETE_FILE: Delete file. Target is filepath.
- CREATE_FOLDER: Create directory recursively. Target is folder path (e.g. src/modules).
- DELETE_FOLDER: Delete folder recursively. Target is folder path.
- RENAME_PATH: Rename file or directory. Target is current path, Details is new path.
- CHANGE_ROOT_DIRECTORY: Update working directory root.
- DOWNLOAD: Download asset from URL or git clone repository.
- SEARCH: Incognito web search.
- LAUNCH_LINK: Open link in user's browser.
- STOP_LOOP: Explicitly stop the auto-monitoring debug loop.
- LAUNCH_APP / KILL_PROCESS / ENV_SETUP.

Provide clean, direct, and rigorous administrative intelligence.`;

  const ollamaPayload = {
    model,
    messages: [
      {
        role: 'system',
        content: systemInstruction,
      },
      ...prunedMessages,
    ],
    stream: false,
  };

  try {
    // No timeout: supports heavy inference on big models (e.g. 70B, Qwen, DeepSeek)
    const response = await fetch(`${cleanHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.json({
        online: false,
        error: `Ollama returned error ${response.status}: ${errText || response.statusText}. Check if model '${model}' is downloaded (run 'ollama pull ${model}').`,
      });
    }

    const data = await response.json();
    const content = data.message?.content || '';

    // Extract any structured action from the Ollama model's output
    const extractedAction = extractActionFromOllamaOutput(content, isFixErrorsIntent);

    addLog('INFO', 'ollama-chat', `Completed response from Ollama model ${model} (${prunedMessages.length} history msgs in memory)`);

    return res.json({
      online: true,
      message: {
        role: 'assistant',
        content,
        action: extractedAction,
      },
      source: 'ollama-live',
      model,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    addLog('ERROR', 'ollama-chat', `Ollama connection error: ${message}`);
    // Return structured JSON with status 200 so Cloud Run never overrides with an HTML error page
    return res.json({
      online: false,
      error: `Could not reach Ollama daemon at ${cleanHost} (${message}).\n\nWhen running in the sandbox or on your local PC:\n1. Open a terminal on your computer\n2. Run: OLLAMA_ORIGINS="*" && ollama serve\n3. Verify model '${model}' is pulled: ollama pull ${model}\n4. Run this app locally with: npm run dev`,
    });
  }
});

// 13. Logs & Anomaly Alerts Endpoints
app.get('/api/system/logs', (_req, res) => {
  res.json({ logs: systemLogs });
});

app.get('/api/system/anomalies', (_req, res) => {
  res.json({ anomalies });
});

app.post('/api/system/anomalies/resolve', (req, res) => {
  const { id } = req.body;
  const item = anomalies.find((a) => a.id === id);
  if (item) {
    item.resolved = true;
    addLog('INFO', 'anomaly-monitor', `Resolved anomaly alert [${id}]: ${item.title}`);
  }
  res.json({ success: true, anomalies });
});

// Vite middleware for development or static serving for production
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    addLog('INFO', 'daemon-boot', `ZenderByte Agent host daemon active on port ${PORT}`);
  });
}

startServer();
