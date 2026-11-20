/**
 * Live UI test for the Japanese speech warm-up fix.
 *
 * Drives the real app in a real Chrome through the DevTools Protocol on
 * http://127.0.0.1:9222 with real mouse input, records every speechSynthesis
 * call from a fake engine installed before app scripts run, and asserts:
 *  - a silent primer is spoken inside the lesson-node gesture,
 *  - the auto-played exercise audio is the FULL string ('あさ', 'うみ'),
 *  - no cancel() lands within 100ms before an auto-play speak.
 *
 * Screenshots go to artifacts/live-speech/ with a red cursor dot at the last
 * clicked coordinate.
 *
 * Usage: node tests/ui-speech-live.mjs
 */
import { execSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ART = join(ROOT, 'artifacts', 'live-speech');
const APP = 'http://127.0.0.1:5173';
const CDP = 'http://127.0.0.1:9222';
const STORAGE_KEY = 'nihongo-duo:progress:v1';

mkdirSync(ART, { recursive: true });

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const q = (value) => JSON.stringify(value);

/* --------------------------------------------------------------- content */

const CONTENT_BUNDLE = join(ROOT, 'artifacts', 'content.mjs');
if (!existsSync(CONTENT_BUNDLE)) {
  console.log('bundling content with esbuild …');
  execSync('npx esbuild src/content/index.ts --bundle --format=esm --outfile=artifacts/content.mjs', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}
const content = await import(pathToFileURL(CONTENT_BUNDLE).href);
const LESSON = content.UNITS.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === 'u1-l3');
if (!LESSON) throw new Error('u1-l3 not found in bundled content');
const E1 = LESSON.exercises[0];
const E2 = LESSON.exercises[1];
if (E1.kind !== 'translate-choice' || E1.japanese !== 'あさ') {
  throw new Error(`unexpected e1: ${JSON.stringify({ kind: E1.kind, japanese: E1.japanese })}`);
}
if (E2.kind !== 'select-image' || E2.japanese !== 'うみ') {
  throw new Error(`unexpected e2: ${JSON.stringify({ kind: E2.kind, japanese: E2.japanese })}`);
}

const SEED = {
  username: 'Học viên Speech',
  avatar: '🦊',
  gems: 500,
  xp: 40,
  streak: 2,
  longestStreak: 3,
  lastActiveDate: null,
  dailyXp: 20,
  dailyGoal: 50,
  crowns: {},
  completedLessons: ['u1-l1', 'u1-l2'],
  perfectLessons: 0,
  totalAnswers: 20,
  correctAnswers: 18,
  settings: { soundOn: true, speechOn: true },
  version: 0,
};

/* ---------------------------------------------------------------- chrome */

async function cdpUp() {
  try {
    const res = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

let chromeChild = null;

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

/** Reuse a Chrome already listening on 9222, otherwise start one headless instance. */
async function ensureChrome() {
  if (await cdpUp()) {
    console.log('CDP already listening on 9222 — reusing it');
    return;
  }
  const exe = chromeExecutable();
  if (!exe) throw new Error('Chrome not found; set CHROME_PATH or start Chrome on port 9222');
  const profile = join(tmpdir(), `nd-cdp-speech-${process.pid}`);
  console.log(`starting headless Chrome: ${exe}`);
  chromeChild = spawn(
    exe,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--remote-allow-origins=*',
      '--window-size=390,844',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--mute-audio',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await cdpUp()) return;
    await sleep(300);
  }
  throw new Error('Chrome did not open the CDP port 9222');
}

process.on('exit', () => {
  if (!chromeChild?.pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(chromeChild.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      chromeChild.kill('SIGKILL');
    }
  } catch {
    /* best effort */
  }
});

await ensureChrome();

/* ------------------------------------------------------------------- cdp */

class Session {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return;
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: ok, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else ok(msg.result);
        return;
      }
      if (msg.method) {
        for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
      }
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((ok, reject) => {
      this.pending.set(id, { resolve: ok, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

async function openTarget() {
  let target;
  try {
    const res = await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' });
    target = await res.json();
  } catch {
    const res = await fetch(`${CDP}/json/new?about:blank`);
    target = await res.json();
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('could not create a CDP page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, reject) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => reject(new Error('CDP websocket failed')), { once: true });
  });
  return new Session(ws);
}

/* ------------------------------------------------------- speech recorder */

const RECORDER = `
(() => {
  const log = [];
  window.__speechLog = log;
  window.__speechMode = { synthesis: 'none', utterance: 'native' };

  const voice = {
    lang: 'ja-JP',
    name: 'Fake Japanese',
    voiceURI: 'fake-ja-JP',
    localService: true,
    default: true,
  };
  let voicesReady = false;
  const listeners = new Map();

  function emit(type) {
    const set = listeners.get(type);
    if (!set) return;
    for (const handler of Array.from(set)) {
      try { handler({ type: type }); } catch (error) {}
    }
  }

  class FakeUtterance {
    constructor(text) {
      this.text = text == null ? '' : String(text);
      this.lang = '';
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
    }
  }

  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices() { return voicesReady ? [voice] : []; },
    speak(utterance) {
      log.push({
        type: 'speak',
        text: utterance.text,
        lang: utterance.lang,
        rate: utterance.rate,
        volume: utterance.volume,
        voice: utterance.voice && utterance.voice.lang ? utterance.voice.lang : null,
        at: performance.now(),
      });
      synth.speaking = true;
      synth.pending = true;
      const duration = utterance.volume === 0 ? 40 : 400;
      window.setTimeout(() => { synth.speaking = false; synth.pending = false; }, duration);
    },
    cancel() {
      log.push({
        type: 'cancel',
        text: null,
        lang: null,
        rate: null,
        volume: null,
        voice: null,
        at: performance.now(),
      });
      synth.speaking = false;
      synth.pending = false;
    },
    pause() {},
    resume() {},
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      const set = listeners.get(type);
      if (set) set.delete(handler);
    },
    dispatchEvent(event) { emit(event && event.type); return true; },
  };

  try {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => synth });
    window.__speechMode.synthesis = 'defineProperty';
  } catch (error) {
    const existing = window.speechSynthesis;
    if (existing) {
      existing.speak = synth.speak;
      existing.cancel = synth.cancel;
      existing.getVoices = synth.getVoices;
      existing.pause = synth.pause;
      existing.resume = synth.resume;
      existing.addEventListener = synth.addEventListener;
      existing.removeEventListener = synth.removeEventListener;
      existing.dispatchEvent = synth.dispatchEvent;
      window.__speechMode.synthesis = 'patched:' + (error && error.name ? error.name : 'error');
    }
  }

  try {
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeUtterance,
    });
    window.__speechMode.utterance = 'replaced';
  } catch (error) {
    window.__speechMode.utterance = 'native:' + (error && error.name ? error.name : 'error');
  }

  // Voices load late in real Chrome; exercise the "wait for voices" path.
  window.setTimeout(() => {
    voicesReady = true;
    emit('voiceschanged');
  }, 80);
})();
`;

/* --------------------------------------------------------------- helpers */

const failures = [];
const pageErrors = [];
const shots = [];
let stepCount = 0;
let lastClick = null;

function record(step, desc, selector, rect, pass, extra = '') {
  stepCount += 1;
  const x = rect ? rect.x : -1;
  const y = rect ? rect.y : -1;
  const line = `step ${step} · ${desc} · ${selector} · x=${x} y=${y} · ${pass ? 'PASS' : 'FAIL'}${
    extra ? ` · ${extra}` : ''
  }`;
  console.log(line);
  if (!pass) failures.push(line);
  return pass;
}

let session;

async function evaluate(expression) {
  const res = await session.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (res.exceptionDetails) {
    const detail =
      res.exceptionDetails.exception?.description ?? JSON.stringify(res.exceptionDetails);
    throw new Error(`page JS error: ${detail}`);
  }
  return res.result.value;
}

async function waitFor(expression, timeout = 10000, label = expression) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(expression)) return true;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  if (lastError) console.log(`  (waitFor ${label} last error: ${lastError.message})`);
  return false;
}

async function shot(name, point) {
  if (point) {
    await evaluate(`(() => {
      const old = document.getElementById('__cursor');
      if (old) old.remove();
      const dot = document.createElement('div');
      dot.id = '__cursor';
      dot.style.cssText = 'position:fixed;z-index:2147483647;width:14px;height:14px;margin-left:-7px;margin-top:-7px;border-radius:50%;background:#e11;box-shadow:0 0 0 3px rgba(225,17,17,.35);pointer-events:none;left:${point.x}px;top:${point.y}px';
      document.documentElement.appendChild(dot);
    })()`);
    await sleep(80);
  }
  const { data } = await session.send('Page.captureScreenshot', { format: 'png' });
  const file = join(ART, name);
  writeFileSync(file, Buffer.from(data, 'base64'));
  shots.push(`${name} (${Math.round(statSync(file).size / 1024)} KB)`);
  return file;
}

async function centerOf(selector) {
  const found = await evaluate(`(() => {
    const el = document.querySelector(${q(selector)});
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    return true;
  })()`);
  if (!found) return null;
  await sleep(160);
  return evaluate(`(() => {
    const el = document.querySelector(${q(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
      w: Math.round(r.width),
      h: Math.round(r.height),
      disabled: !!el.disabled,
      text: (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 90),
    };
  })()`);
}

async function clickAt(x, y) {
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
    button: 'none',
    buttons: 0,
  });
  await sleep(40);
  await session.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await sleep(40);
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  await sleep(150);
}

/** Click a selector with a real mouse. Returns the rect (or null). */
async function click(selector) {
  const rect = await centerOf(selector);
  if (!rect) return null;
  await clickAt(rect.x, rect.y);
  lastClick = { x: rect.x, y: rect.y };
  return rect;
}

const checkButtonEnabled = `(() => {
  const b = document.querySelector('[data-testid="check-button"]');
  return !!b && !b.disabled;
})()`;

const hasVerdict = `!!document.querySelector('[data-testid="verdict"]')`;

async function readVerdict() {
  return evaluate(`(() => {
    const el = document.querySelector('[data-testid="verdict"]');
    return el ? el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 160) : '';
  })()`);
}

async function speechLog() {
  return (await evaluate(`(window.__speechLog || []).map((entry) => ({ ...entry }))`)) ?? [];
}

const speaksOf = (log) => log.filter((entry) => entry.type === 'speak');
const cancelsWithin = (log, at, windowMs) =>
  log.filter((entry) => entry.type === 'cancel' && entry.at <= at && entry.at >= at - windowMs);

/* ------------------------------------------------------------------ main */

console.log(`preview: ${APP}  (CDP ${CDP})`);

session = await openTarget();
session.on('Runtime.exceptionThrown', (params) => {
  const text = params.exceptionDetails?.exception?.description ?? 'unknown exception';
  pageErrors.push(text.split('\n')[0]);
});
session.on('Runtime.consoleAPICalled', (params) => {
  if (params.type === 'error') {
    pageErrors.push(
      params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 200),
    );
  }
});

await session.send('Page.enable');
await session.send('Runtime.enable');
await session.send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});

const { identifier: recorderId } = await session.send('Page.addScriptToEvaluateOnNewDocument', {
  source: RECORDER,
});

/* step 1 — seed progress, reload, the path shows u1-l3 unlocked */
await session.send('Page.navigate', { url: `${APP}/#path` });
await waitFor(
  `!!document.querySelector('[data-testid="lesson-node-u1-l1"]')`,
  20000,
  'app shell',
);
await evaluate(
  `localStorage.setItem(${q(STORAGE_KEY)}, ${q(JSON.stringify(SEED))})`,
);
await session.send('Page.reload', { ignoreCache: true });

const pathReady = await waitFor(
  `document.querySelectorAll('[data-testid^="lesson-node-"]').length >= 25 &&
   Array.isArray(window.__speechLog)`,
  20000,
  'path after seed',
);
const mode = await evaluate(`window.__speechMode || null`);
const nodeInfo = await evaluate(`(() => {
  const el = document.querySelector('[data-testid="lesson-node-u1-l3"]');
  if (!el) return null;
  return {
    cls: el.className,
    aria: el.getAttribute('aria-label') || '',
    text: (el.textContent || '').trim(),
  };
})()`);
const seededSettings = await evaluate(`(() => {
  try {
    const raw = localStorage.getItem(${q(STORAGE_KEY)});
    const state = raw ? JSON.parse(raw) : null;
    return state ? { speechOn: state.settings.speechOn, completedLessons: state.completedLessons } : null;
  } catch (error) {
    return null;
  }
})()`);
const nodeRect = await centerOf('[data-testid="lesson-node-u1-l3"]');
const recorderOk = !!mode && mode.synthesis === 'defineProperty' && mode.utterance === 'replaced';
const nodeUnlocked =
  !!nodeInfo && !/locked/.test(nodeInfo.cls) && !/khóa|khoá/i.test(nodeInfo.aria);
record(
  1,
  `path seeded (speechOn=${seededSettings?.speechOn}), u1-l3 unlocked, speech recorder installed`,
  '[data-testid="lesson-node-u1-l3"]',
  nodeRect,
  pathReady &&
    recorderOk &&
    nodeUnlocked &&
    seededSettings?.speechOn === true &&
    Array.isArray(seededSettings?.completedLessons),
  `mode=${JSON.stringify(mode)} nodeCls="${nodeInfo?.cls ?? ''}" logEmpty=${await evaluate(
    `(window.__speechLog || []).length === 0`,
  )}`,
);
await shot('step-01-path.png', nodeRect);

/* step 2 — click the node: primer must run inside that gesture */
await evaluate(`(() => {
  window.__nodeDown = null;
  window.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('[data-testid="lesson-node-u1-l3"]')) {
      window.__nodeDown = performance.now();
    }
  }, true);
})()`);

const openedRect = await click('[data-testid="lesson-node-u1-l3"]');
const lessonReady = await waitFor(
  `!!document.querySelector('[role="progressbar"]') && !!document.querySelector('[data-testid="lesson-close"]')`,
  8000,
  'lesson screen',
);
await sleep(450); // let the first auto-play timer (260ms) land

const logAfterOpen = await speechLog();
const primer = speaksOf(logAfterOpen).find((entry) => entry.volume === 0);
const nodeDownAt = await evaluate(`window.__nodeDown`);
const primerDelta =
  primer && typeof nodeDownAt === 'number' ? Math.round(primer.at - nodeDownAt) : null;
const primerFirst = logAfterOpen.length > 0 && logAfterOpen[0].type === 'speak' && logAfterOpen[0].volume === 0;
record(
  2,
  'open u1-l3 → silent primer (volume 0) fired by the click gesture',
  '[data-testid="lesson-node-u1-l3"]',
  openedRect,
  !!openedRect &&
    lessonReady &&
    !!primer &&
    primerFirst &&
    primerDelta !== null &&
    primerDelta >= 0 &&
    primerDelta <= 600,
  `primerText="${primer?.text ?? ''}" primerRate=${primer?.rate ?? '?'} deltaAfterPointerDown=${primerDelta}ms`,
);
await shot('step-02-lesson-open.png', lastClick);

/* step 3 — e1 auto-play: full 'あさ' */
const e1Selector = `[data-testid="choice-${E1.answerId}"]`;
const e1Ready = await waitFor(
  `!!document.querySelector(${q(e1Selector)}) && document.body.innerText.includes('あさ')`,
  8000,
  'e1 あさ',
);
const e1Spoken = await waitFor(
  `(window.__speechLog || []).some((entry) => entry.type === 'speak' && entry.text === 'あさ')`,
  6000,
  'speak あさ',
);
const logE1 = await speechLog();
const e1Speak = speaksOf(logE1).find((entry) => entry.text === 'あさ');
const e1Clipped = speaksOf(logE1).some((entry) => entry.text === 'さ');
const e1Cancels = e1Speak ? cancelsWithin(logE1, e1Speak.at, 100) : [];
const e1Rect = await centerOf(e1Selector);
record(
  3,
  `e1 auto-played exactly "${E1.japanese}" (leading mora intact)`,
  e1Selector,
  e1Rect,
  e1Ready && e1Spoken && !!e1Speak && e1Speak.text === 'あさ' && !e1Clipped && e1Cancels.length === 0,
  `spoken="${e1Speak?.text ?? '<none>'}" clippedMora=${e1Clipped} cancelsBefore=${e1Cancels.length} lang=${e1Speak?.lang ?? '?'} voice=${e1Speak?.voice ?? '?'}`,
);
await shot('step-03-e1-asa.png', lastClick);

/* step 4 — answer e1 correctly and continue */
const e1ChoiceRect = await click(e1Selector);
const e1Selected = await evaluate(
  `document.querySelector(${q(e1Selector)})?.getAttribute('aria-pressed') === 'true'`,
);
const e1CheckEnabled = await waitFor(checkButtonEnabled, 4000, 'e1 check enabled');
const e1CheckRect = await click('[data-testid="check-button"]');
const e1VerdictReady = await waitFor(hasVerdict, 6000, 'e1 verdict');
const e1Verdict = await readVerdict();
await shot('step-04-e1-answered.png', lastClick);
const e1ContinueRect = await click('[data-testid="continue-button"]');
record(
  4,
  'answer e1 (あさ) correctly → CHECK → verdict → continue',
  e1Selector,
  e1ChoiceRect,
  !!e1ChoiceRect &&
    e1Selected &&
    e1CheckEnabled &&
    !!e1CheckRect &&
    e1VerdictReady &&
    /Chính xác/.test(e1Verdict) &&
    !!e1ContinueRect,
  `verdict="${e1Verdict}"`,
);

/* step 5 — e2 auto-play: full 'うみ' */
const e2Selector = `[data-testid="image-${E2.answerId}"]`;
const e2Ready = await waitFor(
  `!!document.querySelector(${q(e2Selector)}) && document.body.innerText.includes('うみ')`,
  8000,
  'e2 うみ',
);
const e2Spoken = await waitFor(
  `(window.__speechLog || []).some((entry) => entry.type === 'speak' && entry.text === 'うみ')`,
  6000,
  'speak うみ',
);
const logE2 = await speechLog();
const e2Speak = speaksOf(logE2).find((entry) => entry.text === 'うみ');
const e2Clipped = speaksOf(logE2).some((entry) => entry.text === 'み');
const e2Cancels = e2Speak ? cancelsWithin(logE2, e2Speak.at, 100) : [];
const e2Rect = await centerOf(e2Selector);
record(
  5,
  `e2 auto-played exactly "${E2.japanese}" (the clipped-mora bug case)`,
  e2Selector,
  e2Rect,
  e2Ready && e2Spoken && !!e2Speak && e2Speak.text === 'うみ' && !e2Clipped && e2Cancels.length === 0,
  `spoken="${e2Speak?.text ?? '<none>'}" clippedMora=${e2Clipped} cancelsBefore=${e2Cancels.length} lang=${e2Speak?.lang ?? '?'} voice=${e2Speak?.voice ?? '?'}`,
);
await shot('step-05-e2-umi.png', lastClick);

/* step 6 — whole speech sequence is primer → あさ → うみ, no strays */
const finalLog = await speechLog();
const sequence = speaksOf(finalLog).map((entry) => entry.text);
const expectedSequence = ['。', 'あさ', 'うみ'];
record(
  6,
  'exact speech sequence: primer → あさ → うみ',
  'window.__speechLog',
  lastClick,
  sequence.length === expectedSequence.length &&
    sequence.every((text, index) => text === expectedSequence[index]),
  `sequence=${JSON.stringify(sequence)} cancels=${finalLog.filter((entry) => entry.type === 'cancel').length}`,
);

/* -------------------------------------------------------------- summary */

console.log('\n=== SPEECH LOG ===');
console.log(JSON.stringify(finalLog, null, 2));
console.log('\n=== SUMMARY ===');
console.log(`steps=${stepCount} pass=${stepCount - failures.length} fail=${failures.length}`);
console.log(`screenshots in artifacts/live-speech/: ${shots.join(', ')}`);
if (pageErrors.length) {
  console.log(`page console errors (${pageErrors.length}):`);
  for (const error of pageErrors.slice(0, 10)) console.log(`  - ${error}`);
}
if (failures.length) {
  console.log('FAILURES:');
  for (const failure of failures) console.log(`  ${failure}`);
}

try {
  await session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: recorderId });
} catch {
  /* ignore */
}
session.close();
process.exit(failures.length ? 1 : 0);
