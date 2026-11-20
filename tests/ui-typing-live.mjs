/**
 * Live UI test for Nihongo Duo.
 *
 * Drives the real app in a real Chrome through the DevTools Protocol on
 * http://127.0.0.1:9222 using real input events (Input.dispatchMouseEvent /
 * Input.insertText), asserts on the DOM after every action, and stores a
 * screenshot per step in artifacts/live/.
 *
 * Usage: node tests/ui-live.mjs
 */
import { execSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ART = join(ROOT, 'artifacts', 'live-typing');
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
const LESSON = content.UNITS.flatMap((unit) => unit.lessons).find((lesson) => lesson.id === 'u1-l1');
if (!LESSON) throw new Error('u1-l1 not found in bundled content');

/* ---------------------------------------------------------------- chrome */

let chromeChild = null;

async function cdpUp() {
  try {
    const res = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

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

/** Reuse a Chrome already listening on 9222, otherwise start our own headless one. */
async function ensureChrome() {
  if (await cdpUp()) {
    console.log('CDP already listening on 9222 — reusing it');
    return;
  }
  const exe = chromeExecutable();
  if (!exe) throw new Error('Chrome not found; set CHROME_PATH or start Chrome on port 9222');
  const profile = join(tmpdir(), `nd-cdp-live-${process.pid}`);
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

/* --------------------------------------------------------------- helpers */

const failures = [];
const pageErrors = [];
const shots = [];
let stepCount = 0;

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
let evalBroken = false;

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

async function shot(name) {
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
  return rect;
}

/** Click a match-card by its visible text inside .match-col[index]. */
async function clickMatchCard(index, text) {
  const scrolled = await evaluate(`(() => {
    const col = document.querySelectorAll('.match-col')[${index}];
    if (!col) return false;
    const el = [...col.querySelectorAll('button')].find(
      (b) => (b.textContent || '').trim() === ${q(text)},
    );
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    return true;
  })()`);
  if (!scrolled) return null;
  await sleep(160);
  const rect = await evaluate(`(() => {
    const col = document.querySelectorAll('.match-col')[${index}];
    if (!col) return null;
    const el = [...col.querySelectorAll('button')].find(
      (b) => (b.textContent || '').trim() === ${q(text)},
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + r.width / 2),
      y: Math.round(r.top + r.height / 2),
      w: Math.round(r.width),
      h: Math.round(r.height),
      disabled: !!el.disabled,
      text: (el.textContent || '').trim().slice(0, 40),
    };
  })()`);
  if (!rect) return null;
  await clickAt(rect.x, rect.y);
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

async function readProgressState() {
  try {
    const raw = await evaluate(`localStorage.getItem(${q(STORAGE_KEY)})`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function signatureFor(exercise) {
  switch (exercise.kind) {
    case 'translate-choice':
    case 'select-image':
      return exercise.japanese ?? null;
    case 'fill-blank':
      return (exercise.sentence ?? '').split('___')[0] || null;
    case 'word-bank':
    case 'typing':
      return exercise.text ?? exercise.japanese ?? null;
    case 'listen-typing':
      return null;
    case 'match-pairs':
      return exercise.pairs[0]?.left ?? null;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ main */

console.log(`preview: ${APP}  (CDP ${CDP})`);

await ensureChrome();
session = await openTarget();
session.on('Runtime.exceptionThrown', (params) => {
  const text = params.exceptionDetails?.exception?.description ?? 'unknown exception';
  pageErrors.push(text.split('\n')[0]);
});
session.on('Runtime.consoleAPICalled', (params) => {
  if (params.type === 'error') {
    pageErrors.push(params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 200));
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

/* step 1 — home */
await session.send('Page.navigate', { url: `${APP}/#path` });
await waitFor(`document.querySelectorAll('[data-testid^="lesson-node-"]').length >= 25`, 20000, 'home');
await evaluate('localStorage.clear()');
await session.send('Page.reload', { ignoreCache: true });
const homeReady = await waitFor(
  `document.querySelectorAll('[data-testid^="lesson-node-"]').length >= 25`,
  20000,
  'home after reset',
);

const nodeCount = await evaluate(
  `document.querySelectorAll('[data-testid^="lesson-node-"]').length`,
);
const bannerText = await evaluate(`(() => {
  const el = document.querySelector('.unit-banner');
  return el ? el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 60) : '';
})()`);
const heartsRect = await centerOf('[data-testid="hearts-stat"]');
const heartsText = heartsRect?.text ?? '';
const heartsLabel = await evaluate(
  `document.querySelector('[data-testid="hearts-stat"]')?.getAttribute('aria-label') ?? ''`,
);
const unlimitedHearts = /♾/.test(heartsText) && !/\d/.test(heartsText) && heartsLabel === 'Không giới hạn tim';
const homeOk = homeReady && nodeCount >= 25 && !!bannerText && unlimitedHearts;
record(
  1,
  `home loaded, ${nodeCount} lesson nodes, banner "${bannerText}"`,
  '[data-testid="hearts-stat"]',
  heartsRect,
  homeOk,
  `hearts="${heartsText}" label="${heartsLabel}" unlimited=${unlimitedHearts}`,
);
await shot('step-01-home.png');

/* step 2 — open u1-l1 */
const nodeRect = await click('[data-testid="lesson-node-u1-l1"]');
const lessonReady = await waitFor(
  `!!document.querySelector('[role="progressbar"]') && !!document.querySelector('[data-testid="lesson-close"]')`,
  8000,
  'lesson screen',
);
const closeRect = await centerOf('[data-testid="lesson-close"]');
record(
  2,
  'open first lesson → progressbar + X',
  '[data-testid="lesson-node-u1-l1"]',
  nodeRect,
  !!nodeRect && lessonReady,
  `closeButton=${!!closeRect}`,
);
await shot('step-02-lesson.png');

/* step 3 — answer question 1 */
const q1 = LESSON.exercises[0];
const q1Selector = `[data-testid="choice-${q1.answerId}"]`;
const q1Rect = await click(q1Selector);
const q1Selected = await evaluate(
  `document.querySelector(${q(q1Selector)})?.getAttribute('aria-pressed') === 'true'`,
);
const q1Enabled = await waitFor(checkButtonEnabled, 4000, 'check enabled');
const checkRect = await click('[data-testid="check-button"]');
const verdictReady = await waitFor(hasVerdict, 6000, 'verdict');
const verdict1 = await readVerdict();
const lessonHeader = await evaluate(`(() => {
  const top = document.querySelector('.lesson__top');
  return {
    hasHeartsSpan: !!document.querySelector('.lesson__hearts'),
    text: top ? top.innerText.trim().replace(/\\s+/g, ' ') : '',
  };
})()`);
const lessonHeartsGone = !lessonHeader.hasHeartsSpan && !/❤/.test(lessonHeader.text);
const q1Ok =
  !!q1Rect &&
  q1Selected &&
  q1Enabled &&
  !!checkRect &&
  verdictReady &&
  /Chính xác/.test(verdict1) &&
  lessonHeartsGone;
record(
  3,
  `answer Q1 (${q1.kind}) correctly → CHECK → verdict`,
  q1Selector,
  q1Rect,
  q1Ok,
  `verdict="${verdict1}" lessonHeaderHearts=${lessonHeader.hasHeartsSpan} header="${lessonHeader.text}"`,
);
await shot('step-03-feedback.png');
const continueRect = await click('[data-testid="continue-button"]');
record(
  '3b',
  'TIẾP TỤC after feedback',
  '[data-testid="continue-button"]',
  continueRect,
  !!continueRect,
);

/* step 4 — play the whole lesson correctly */
let lessonFailed = false;
for (let index = 1; index < LESSON.exercises.length; index += 1) {
  const exercise = LESSON.exercises[index];
  const signature = signatureFor(exercise);
  const arrived = signature
    ? await waitFor(`document.body.innerText.includes(${q(signature)})`, 8000, exercise.id)
    : await waitFor(`!!document.querySelector('[data-testid="typing-input"]')`, 8000, exercise.id);

  let actionRect = null;
  let actionSelector = '';

  if (exercise.kind === 'translate-choice' || exercise.kind === 'fill-blank') {
    actionSelector =
      exercise.kind === 'translate-choice'
        ? `[data-testid="choice-${exercise.answerId}"]`
        : `[data-testid="blank-${exercise.answerId}"]`;
    actionRect = await click(actionSelector);
  } else if (exercise.kind === 'select-image') {
    actionSelector = `[data-testid="image-${exercise.answerId}"]`;
    actionRect = await click(actionSelector);
  } else if (exercise.kind === 'word-bank') {
    const used = new Set();
    const order = [];
    for (const token of exercise.answerTokens) {
      const found = exercise.tokens.findIndex((candidate, i) => !used.has(i) && candidate === token);
      if (found === -1) throw new Error(`token "${token}" missing from ${exercise.id}`);
      used.add(found);
      order.push(found);
    }
    for (const tokenIndex of order) {
      actionSelector = `[data-testid="token-${tokenIndex}"]`;
      actionRect = await click(actionSelector);
    }
  } else if (exercise.kind === 'typing' || exercise.kind === 'listen-typing') {
    actionSelector = '[data-testid="typing-input"]';
    actionRect = await click(actionSelector);

    if (!globalThis.__beginnerTypingDone) {
      globalThis.__beginnerTypingDone = true;
      await sleep(250);
      await shot('typing-beginner-idle');

      const helper = await evaluate(
        `document.querySelector('#typing-helper')?.innerText ?? ''`,
      );
      const padOpen = await evaluate(
        `document.querySelector('[data-testid="kana-toggle"]')?.getAttribute('aria-expanded')`,
      );
      record(
        '4a',
        `${exercise.id} beginner padding: helper + kana pad open`,
        '#typing-helper',
        actionRect,
        /romaji/i.test(helper) && padOpen === 'true',
        `helper="${helper.replace(/\s+/g, ' ')}" padOpen=${padOpen}`,
      );

      const hintRect = await click('[data-testid="reading-hint-toggle"]');
      const hintShown = await waitFor(
        `!!document.querySelector('[data-testid="reading-hint"]')`,
        4000,
        'reading hint',
      );
      const hintText = await evaluate(
        `document.querySelector('[data-testid="reading-hint"]')?.innerText ?? ''`,
      );
      record('4b', `${exercise.id} reading hint`, '[data-testid="reading-hint-toggle"]', hintRect, hintShown, `hint="${hintText}"`);
      await shot('typing-hint-open');

      for (const char of ['さ', 'よ', 'う', 'な', 'ら']) {
        const keyRect = await click(`[data-testid="kana-${char}"]`);
        record(
          '4c',
          `${exercise.id} tap kana ${char}`,
          `[data-testid="kana-${char}"]`,
          keyRect,
          !!keyRect,
          `value="${await evaluate(`document.querySelector('[data-testid="typing-input"]').value`)}"`,
        );
      }
      await shot('typing-kana-typed');
    } else {
      const latin =
        exercise.accepted.find((variant) => /[A-Za-z]/.test(variant)) ?? exercise.accepted[0];
      await session.send('Input.insertText', { text: latin });
      await sleep(200);
    }
  } else if (exercise.kind === 'match-pairs') {
    actionSelector = '.match-col';
    for (const pair of exercise.pairs) {
      const leftRect = await clickMatchCard(0, pair.left);
      const rightRect = await clickMatchCard(1, pair.right);
      actionRect = rightRect ?? leftRect ?? actionRect;
      if (!leftRect || !rightRect) {
        console.log(`  (could not click pair ${pair.left} / ${pair.right})`);
        lessonFailed = true;
      }
    }
  }

  if (!arrived) {
    record(`4.${index}`, `did not reach ${exercise.id}`, actionSelector, actionRect, false);
    lessonFailed = true;
    break;
  }

  if (exercise.kind !== 'match-pairs') {
    const enabled = await waitFor(checkButtonEnabled, 5000, `${exercise.id} check enabled`);
    const check = await click('[data-testid="check-button"]');
    const shown = await waitFor(hasVerdict, 6000, `${exercise.id} verdict`);
    const verdict = await readVerdict();
    const ok = enabled && !!check && shown && /Chính xác/.test(verdict);
    record(
      `4.${index}`,
      `${exercise.id} (${exercise.kind}) → CHECK`,
      actionSelector,
      actionRect,
      ok,
      `verdict="${verdict}"`,
    );
    if (!ok) lessonFailed = true;
  } else {
    const shown = await waitFor(hasVerdict, 8000, `${exercise.id} verdict`);
    const verdict = await readVerdict();
    const ok = shown && /Chính xác/.test(verdict);
    record(
      `4.${index}`,
      `${exercise.id} (match-pairs) → all 4 pairs`,
      actionSelector,
      actionRect,
      ok,
      `verdict="${verdict}"`,
    );
    if (!ok) lessonFailed = true;
  }

  const nextRect = await click('[data-testid="continue-button"]');
  if (!nextRect) {
    console.log(`  (no continue button after ${exercise.id})`);
    lessonFailed = true;
  }
}

const resultReady = await waitFor(`!!document.querySelector('[data-testid="lesson-result"]')`, 10000, 'result');
const resultText = await evaluate(`(() => {
  const el = document.querySelector('[data-testid="lesson-result"]');
  return el ? el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 200) : '';
})()`);
const resultRect = await centerOf('[data-testid="result-continue"]');
record(
  4,
  `lesson finished → result screen`,
  '[data-testid="lesson-result"]',
  resultRect,
  resultReady && /XP/.test(resultText) && !!resultRect,
  `text="${resultText}"`,
);
await shot('step-04-result.png');

/* step 5 — back on the path, lesson done */
const continueResultRect = await click('[data-testid="result-continue"]');
await waitFor(`!!document.querySelector('[data-testid="lesson-node-u1-l1"]')`, 8000, 'path');
const doneInfo = await evaluate(`(() => {
  const el = document.querySelector('[data-testid="lesson-node-u1-l1"]');
  if (!el) return null;
  return {
    cls: el.className,
    text: (el.innerText || el.textContent || '').trim(),
    aria: el.getAttribute('aria-label') || '',
  };
})()`);
const xpRect = await centerOf('[data-testid="xp-stat"]');
const xpText = xpRect?.text ?? '';
const xpValue = Number((xpText.match(/\d+/) ?? ['0'])[0]);
const storedAfterLesson = await readProgressState();
record(
  5,
  'result → path, u1-l1 done + XP > 0',
  '[data-testid="xp-stat"]',
  xpRect,
  !!continueResultRect &&
    !!doneInfo &&
    /path-node--done/.test(doneInfo.cls) &&
    /👑/.test(doneInfo.text) &&
    xpValue > 0,
  `xp="${xpText}" node="${doneInfo?.cls ?? ''}" crowns=${storedAfterLesson?.crowns?.['u1-l1'] ?? '?'}`,
);
await shot('step-05-path-after.png');

/* step 6 — alphabet: katakana ア */
const navAlphaRect = await click('[data-testid="nav-alphabet"]');
const alphaReady = await waitFor(`!!document.querySelector('[data-testid="alphabet-tab-katakana"]')`, 6000, 'alphabet');
record(6, 'nav → alphabet', '[data-testid="nav-alphabet"]', navAlphaRect, !!navAlphaRect && alphaReady);

const kataTabRect = await click('[data-testid="alphabet-tab-katakana"]');
const cellReady = await waitFor(`!!document.querySelector('[data-testid="kana-cell-ア"]')`, 6000, 'kana cell');
const cellRect = await click('[data-testid="kana-cell-ア"]');
const detail = await evaluate(`(() => {
  const el = document.querySelector('.kana-detail');
  return el ? el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 80) : '';
})()`);
record(
  '6b',
  'katakana tab → ア cell → detail panel',
  '[data-testid="kana-cell-ア"]',
  cellRect,
  !!kataTabRect && cellReady && !!cellRect && detail.includes('ア'),
  `detail="${detail}"`,
);
await shot('step-06-alphabet.png');

/* step 7 — leaderboard */
const navBoardRect = await click('[data-testid="nav-leaderboard"]');
const meReady = await waitFor(`!!document.querySelector('[data-testid="leaderboard-me"]')`, 6000, 'leaderboard');
const meText = await evaluate(`(() => {
  const el = document.querySelector('[data-testid="leaderboard-me"]');
  return el ? el.innerText.trim().replace(/\\s+/g, ' ').slice(0, 120) : '';
})()`);
const storedBoard = (await readProgressState()) ?? storedAfterLesson;
const expectedBoardXp = storedBoard?.dailyXp ?? 0;
record(
  7,
  'leaderboard shows me with my XP',
  '[data-testid="leaderboard-me"]',
  navBoardRect,
  !!navBoardRect && meReady && meText.includes(String(expectedBoardXp)) && expectedBoardXp > 0,
  `row="${meText}" dailyXp=${expectedBoardXp}`,
);
await shot('step-07-leaderboard.png');

/* step 8 — shop */
const navShopRect = await click('[data-testid="nav-shop"]');
const shopReady = await waitFor(`!!document.querySelector('#shop-free-title')`, 6000, 'shop');
const shopInfo = await evaluate(`(() => {
  const title = document.querySelector('#shop-free-title');
  const hint = document.querySelector('.shop-hint');
  return {
    title: title ? title.innerText.trim() : '',
    hint: hint ? hint.innerText.trim().replace(/\\s+/g, ' ') : '',
    refill: !!document.querySelector('[data-testid="shop-refill"]'),
    heartCard: /Tim của bạn/.test(document.body.innerText),
  };
})()`);
record(
  8,
  'shop: free-learning section, no hearts card / refill button',
  '#shop-free-title',
  navShopRect,
  !!navShopRect &&
    shopReady &&
    /Học miễn phí/.test(shopInfo.title) &&
    /không cần nạp tim/i.test(shopInfo.hint) &&
    !shopInfo.refill &&
    !shopInfo.heartCard,
  `title="${shopInfo.title}" hint="${shopInfo.hint}" refill=${shopInfo.refill} heartCard=${shopInfo.heartCard}`,
);
await shot('step-08-shop.png');

/* step 9 — profile */
const navProfileRect = await click('[data-testid="nav-profile"]');
const profileReady = await waitFor(`!!document.querySelector('[data-testid="profile-xp"]')`, 6000, 'profile');
const profileXp = await evaluate(`(() => {
  const el = document.querySelector('[data-testid="profile-xp"]');
  return el ? el.innerText.trim() : '';
})()`);
const storedProfile = (await readProgressState()) ?? storedAfterLesson;
const expectedProfileXp = storedProfile?.xp ?? xpValue;
record(
  9,
  'profile shows total XP',
  '[data-testid="profile-xp"]',
  navProfileRect,
  !!navProfileRect && profileReady && Number(profileXp) === expectedProfileXp,
  `profileXp=${profileXp} expected=${expectedProfileXp}`,
);
await shot('step-09-profile.png');

/* step 10 — no horizontal overflow at 390px (on the path) */
const navPathRect = await click('[data-testid="nav-path"]');
await waitFor(`document.querySelectorAll('[data-testid^="lesson-node-"]').length >= 25`, 8000, 'path');
const overflow = await evaluate(`({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  bodyScrollWidth: document.body.scrollWidth,
})`);
record(
  10,
  'no horizontal overflow at 390px',
  '[data-testid="nav-path"]',
  navPathRect,
  !!navPathRect &&
    overflow.scrollWidth <= overflow.innerWidth + 1 &&
    overflow.bodyScrollWidth <= overflow.innerWidth + 1,
  `scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth} body=${overflow.bodyScrollWidth}`,
);
await shot('step-10-path-390.png');

/* step 11 — desktop viewport sanity */
await session.send('Emulation.setDeviceMetricsOverride', {
  width: 1024,
  height: 768,
  deviceScaleFactor: 1,
  mobile: false,
});
await sleep(600);
const desktop = await evaluate(`({
  nodes: document.querySelectorAll('[data-testid^="lesson-node-"]').length,
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
})`);
record(
  11,
  'desktop 1024×768 keeps the path intact',
  'document.documentElement',
  { x: 512, y: 384 },
  desktop.nodes >= 25 && desktop.scrollWidth <= desktop.innerWidth + 1,
  `nodes=${desktop.nodes} scrollWidth=${desktop.scrollWidth} innerWidth=${desktop.innerWidth}`,
);
await shot('step-11-desktop.png');

/* step 12 — legacy save (hearts:0 / maxHearts:5) must not lock the user out */
await session.send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await evaluate(`localStorage.setItem(${q(STORAGE_KEY)}, JSON.stringify({
  username: 'Học viên cũ',
  avatar: '🦊',
  gems: 500,
  xp: 40,
  streak: 3,
  longestStreak: 5,
  lastActiveDate: null,
  dailyXp: 10,
  dailyGoal: 50,
  crowns: {},
  completedLessons: [],
  perfectLessons: 0,
  totalAnswers: 4,
  correctAnswers: 2,
  settings: { soundOn: true, speechOn: true },
  version: 0,
  hearts: 0,
  maxHearts: 5
}))`);
await session.send('Page.navigate', { url: `${APP}/#path` });
await session.send('Page.reload', { ignoreCache: true });
const legacyReady = await waitFor(
  `document.querySelectorAll('[data-testid^="lesson-node-"]').length >= 25`,
  15000,
  'legacy path',
);
const legacyStatRect = await centerOf('[data-testid="hearts-stat"]');
const legacyStatText = legacyStatRect?.text ?? '';
const legacyBanner = await evaluate(
  `!!document.querySelector('.hearts-banner') || !!document.querySelector('[data-testid="hearts-banner"]')`,
);
const legacyNodeRect = await click('[data-testid="lesson-node-u1-l1"]');
const legacyLessonReady = await waitFor(
  `!!document.querySelector('[role="progressbar"]') && !!document.querySelector('[data-testid="lesson-close"]')`,
  8000,
  'legacy lesson',
);
await sleep(300);
const legacyDom = await evaluate(`({
  banner: !!document.querySelector('.hearts-banner') || !!document.querySelector('[data-testid="hearts-banner"]'),
  lessonHearts: !!document.querySelector('.lesson__hearts'),
  outOfHearts: /hết mạng/i.test(document.body.innerText),
  headerText: (document.querySelector('.lesson__top')?.innerText ?? '').trim().replace(/\\s+/g, ' '),
})`);
record(
  12,
  'legacy save hearts:0 → path + lesson open, no banner/modal',
  '[data-testid="lesson-node-u1-l1"]',
  legacyNodeRect,
  legacyReady &&
    /♾/.test(legacyStatText) &&
    !/\d/.test(legacyStatText) &&
    !legacyBanner &&
    !!legacyNodeRect &&
    legacyLessonReady &&
    !legacyDom.banner &&
    !legacyDom.lessonHearts &&
    !legacyDom.outOfHearts,
  `heartsStat="${legacyStatText}" banner=${legacyDom.banner} lessonHearts=${legacyDom.lessonHearts} outOfHearts=${legacyDom.outOfHearts} header="${legacyDom.headerText}"`,
);
await shot('step-12-legacy-hearts0-lesson.png');

/* step 13 — answering WRONG with legacy hearts:0 must not lose hearts or show an out-of-hearts modal */
const legacyWrongRect = await click('[data-testid="choice-b"]');
const legacyWrongEnabled = await waitFor(checkButtonEnabled, 4000, 'legacy wrong check enabled');
const legacyCheckRect = await click('[data-testid="check-button"]');
const legacyWrongReady = await waitFor(hasVerdict, 6000, 'legacy wrong verdict');
const legacyWrongVerdict = await readVerdict();
const legacyAfterWrong = await evaluate(`({
  inLesson: !!document.querySelector('[role="progressbar"]') && !!document.querySelector('[data-testid="lesson-close"]'),
  outOfHearts: /hết mạng/i.test(document.body.innerText),
  lessonHearts: !!document.querySelector('.lesson__hearts'),
  continueButton: !!document.querySelector('[data-testid="continue-button"]'),
})`);
record(
  13,
  'wrong answer on legacy hearts:0 → verdict "Sai rồi", no modal, lesson continues',
  '[data-testid="choice-b"]',
  legacyWrongRect,
  !!legacyWrongRect &&
    legacyWrongEnabled &&
    !!legacyCheckRect &&
    legacyWrongReady &&
    /Sai rồi/.test(legacyWrongVerdict) &&
    legacyAfterWrong.inLesson &&
    !legacyAfterWrong.outOfHearts &&
    !legacyAfterWrong.lessonHearts &&
    legacyAfterWrong.continueButton,
  `verdict="${legacyWrongVerdict}" inLesson=${legacyAfterWrong.inLesson} outOfHearts=${legacyAfterWrong.outOfHearts} continue=${legacyAfterWrong.continueButton}`,
);
await shot('step-13-legacy-wrong-answer.png');

/* -------------------------------------------------------------- summary */

console.log('\n=== SUMMARY ===');
console.log(`steps=${stepCount} pass=${stepCount - failures.length} fail=${failures.length}`);
console.log(`screenshots in artifacts/live/: ${shots.join(', ')}`);
if (pageErrors.length) {
  console.log(`page console errors (${pageErrors.length}):`);
  for (const error of pageErrors.slice(0, 10)) console.log(`  - ${error}`);
}
if (failures.length) {
  console.log('FAILURES:');
  for (const failure of failures) console.log(`  ${failure}`);
}

session.close();
process.exit(failures.length ? 1 : 0);
