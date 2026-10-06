#!/usr/bin/env node
/** Discover/start the existing local app. No scoring writes or license changes. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const WEBSITE = 'https://fermion-company.github.io/scoring64-download/';
const MAX_JSON = 32 * 1024;

export function localURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password ||
      (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error('接続先は http://127.0.0.1:ポート番号 のみ指定できます。');
  }
  return url.origin;
}

export function dataDirectory(platform = process.platform, home = os.homedir(), env = process.env) {
  if (platform === 'win32') return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Scoring64', 'data');
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Scoring64');
  return path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'Scoring64');
}

export async function readJSON(url) {
  const response = await fetch(url, {redirect: 'error', signal: AbortSignal.timeout(2000)});
  if (!response.ok) throw new Error(`Scoring64に接続できません（HTTP ${response.status}）。`);
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_JSON) throw new Error('Scoring64の応答が大きすぎます。');
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function verifyConnection(url, expected = {}, getJSON = readJSON) {
  url = localURL(url);
  const health = await getJSON(url + '/api/v1/health');
  if (health.status !== 'ok' || health.edition !== 'scoring' || typeof health.version !== 'string' ||
      !/^\d+\.\d+\.\d+/.test(health.version) || typeof health.instance !== 'string') {
    throw new Error('接続先をScoring64として確認できません。');
  }
  if (expected.instance !== undefined && (!expected.instance || health.instance !== expected.instance ||
      (expected.version !== undefined && health.version !== expected.version))) {
    throw new Error('Scoring64の起動情報が古いか、別のアプリに接続しています。');
  }
  const licence = await getJSON(url + '/api/v1/license');
  const states = ['none', 'invalid', 'trial', 'subscription', 'perpetual'];
  if (!states.includes(licence.state) || typeof licence.exportAllowed !== 'boolean') {
    throw new Error('通常のScoring64ライセンスを確認できません。');
  }
  return {
    status: 'ready', url, version: health.version, paidAllowed: licence.exportAllowed,
    licence: {state: licence.state, expired: Boolean(licence.expired), daysLeft: licence.daysLeft,
      reason: licence.reason},
    freeMarkReaderAvailable: true,
  };
}

export async function fromRuntime(filename, getJSON = readJSON) {
  const info = fs.statSync(filename);
  if (!info.isFile() || info.size > MAX_JSON) throw new Error('起動情報ファイルを読み取れません。');
  const runtime = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (typeof runtime.instance !== 'string' || !runtime.instance || typeof runtime.version !== 'string') {
    throw new Error('Scoring64の起動情報が不正です。');
  }
  return verifyConnection(runtime.url, runtime, getJSON);
}

export function cleanEnvironment(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('SCORING64_') &&
    !['TEX64_EDITION', 'PYTHONPATH', 'PYTHONHOME'].includes(key)));
}

export function installedCommand(appPath, platform = process.platform) {
  if (appPath && !path.isAbsolute(appPath)) throw new Error('--appには絶対パスを指定してください。');
  if (platform === 'darwin') {
    const app = appPath || ['/Applications/Scoring64.app', path.join(os.homedir(), 'Applications', 'Scoring64.app')].find(fs.existsSync);
    if (app && fs.existsSync(app) && app.endsWith('.app')) return ['open', '-a', app];
  } else if (platform === 'win32') {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const app = appPath || [path.join(base, 'Programs', 'Scoring64', 'Scoring64.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Scoring64', 'Scoring64.exe')].find(fs.existsSync);
    if (app && fs.existsSync(app) && app.toLowerCase().endsWith('.exe')) return [app];
  } else if (appPath && fs.existsSync(appPath)) return [appPath];
  throw new Error(`Scoring64が見つかりません。インストール先を--appで指定するか、${WEBSITE} から準備してください。`);
}

export async function unusedPort() {
  const server = net.createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

export async function startSource(root) {
  if (!path.isAbsolute(root)) throw new Error('--source-rootには絶対パスを指定してください。');
  const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!fs.existsSync(python) || !fs.existsSync(path.join(root, 'frontend/dist/index.html')) ||
      !fs.existsSync(path.join(root, 'backend/scoring64/app.py'))) {
    throw new Error('ソース版の環境が未準備です。Scoring64のREADMEに従って先に準備してください。');
  }
  const port = await unusedPort();
  // Reuse the normal persistent data directory; never create a fresh trial store.
  const folder = path.join(root, '.scoring64');
  fs.mkdirSync(folder, {recursive: true});
  const instance = randomUUID();
  const log = fs.openSync(path.join(folder, 'agent-launch.log'), 'a', 0o600);
  let pid;
  try {
    pid = await startDetached([python, '-m', 'uvicorn', 'scoring64.app:app', '--host', '127.0.0.1', '--port', String(port)],
      {cwd: root, env: {...cleanEnvironment(), PYTHONPATH: path.join(root, 'backend'), SCORING64_DATA: folder,
        SCORING64_INSTANCE: instance}, stdio: ['ignore', log, log]});
  } finally { fs.closeSync(log); }
  return {url: `http://127.0.0.1:${port}`, instance, pid};
}

export async function startDetached(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {detached: true, stdio: 'ignore', env: cleanEnvironment(), ...options});
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(child.pid); });
  });
}

export function parseOptions(args) {
  const options = {timeout: 25};
  const values = {'--app': 'app', '--runtime-file': 'runtimeFile', '--url': 'url', '--source-root': 'sourceRoot', '--timeout': 'timeout'};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') { options.help = true; continue; }
    if (args[i] === '--no-launch') { options.noLaunch = true; continue; }
    const key = values[args[i]];
    if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`不正な引数です: ${args[i]}`);
    options[key] = args[++i];
  }
  options.timeout = Number(options.timeout);
  if (!Number.isFinite(options.timeout) || options.timeout < 1 || options.timeout > 60) throw new Error('--timeoutは1〜60秒です。');
  if ([options.app, options.url, options.sourceRoot].filter(Boolean).length > 1) throw new Error('--app、--url、--source-rootは1つだけ指定してください。');
  if (options.runtimeFile && !path.isAbsolute(options.runtimeFile)) throw new Error('--runtime-fileには絶対パスを指定してください。');
  if (options.url) localURL(options.url);
  return options;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) {
    console.log('Scoring64を起動し、検証したローカル接続先とライセンス状態をJSONで返します。\n' +
      'Node.js 18以上が必要です。ブラウザは呼び出し元のツールで開いてください。\n' +
      '--app ABSOLUTE_PATH       インストール済みの.app / .exe\n' +
      '--runtime-file ABSOLUTE_PATH  別のデータ保存先のnative-runtime.json\n' +
      '--url http://127.0.0.1:PORT  起動済みのScoring64に接続\n' +
      '--source-root ABSOLUTE_PATH  準備済みのソース版を起動\n' +
      '--no-launch              起動済みのアプリの確認だけ\n--timeout SECONDS         起動待ち（1〜60秒、既定25秒）');
    return;
  }
  if (options.sourceRoot && !path.isAbsolute(options.sourceRoot)) throw new Error('--source-rootには絶対パスを指定してください。');
  const runtimeFile = options.sourceRoot ? path.join(options.sourceRoot, '.scoring64', 'agent-runtime.json')
    : options.runtimeFile || path.join(dataDirectory(), 'native-runtime.json');
  let lastError;
  let source;
  const connect = async () => options.url ? verifyConnection(options.url, source || {}) : fromRuntime(runtimeFile);
  try { const result = await connect(); console.log(JSON.stringify(result)); return result; }
  catch (error) { lastError = error; }
  if (options.noLaunch || options.url) throw lastError;
  if (!options.sourceRoot) {
    await startDetached(installedCommand(options.app));
  } else {
    source = await startSource(options.sourceRoot);
    options.url = source.url;
  }
  const deadline = Date.now() + options.timeout * 1000;
  while (Date.now() < deadline) {
    try {
      const result = await connect();
      if (source) fs.writeFileSync(runtimeFile, JSON.stringify({...source, version: result.version}) + '\n', {mode: 0o600});
      console.log(JSON.stringify(result)); return result;
    }
    catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Scoring64の起動を確認できません。アプリのエラー表示を確認してください。${lastError?.message || ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(JSON.stringify({status: 'error', message: error.message})); process.exitCode = 1; });
}
