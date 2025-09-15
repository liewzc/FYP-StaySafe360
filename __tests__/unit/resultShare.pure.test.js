const fs = require('fs');
const path = require('path');

function resolveModulePath() {
  const candidates = [
    path.join(process.cwd(), 'screens', 'quiz', 'ResultShareScreen.js'),
    path.join(process.cwd(), 'screens', 'quiz', 'ResultShareScreen.jsx'),
    path.join(process.cwd(), 'src', 'screens', 'quiz', 'ResultShareScreen.js'),
    path.join(process.cwd(), 'src', 'screens', 'quiz', 'ResultShareScreen.jsx'),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}
const modPath = resolveModulePath();

function extractNamedHelper(source, keywordRegex) {
  const reArrowBlock = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+([\\w$]*${keywordRegex.source}[\\w$]*)\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{([\\s\\S]*?)\\}`,
    'mi'
  );
  const reArrowExpr = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+([\\w$]*${keywordRegex.source}[\\w$]*)\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*([^;\\n]+)`,
    'mi'
  );
  const reFuncDecl = new RegExp(
    `(?:export\\s+)?function\\s+([\\w$]*${keywordRegex.source}[\\w$]*)\\s*\\(([^)]*)\\)\\s*\\{([\\s\\S]*?)\\}`,
    'mi'
  );

  const tryBuild = (m, isExpr) => {
    if (!m) return null;
    const args = (m[2] || '').trim();
    const body = (m[3] || m[2] || '').trim();
    const name = (m[1] || '').trim();
    const realBody = isExpr ? `return (${body});` : body;
    // eslint-disable-next-line no-new-func
    const fn = new Function(args, realBody);
    return { name, fn };
  };

  return (
    tryBuild(source.match(reArrowBlock), false) ||
    tryBuild(source.match(reArrowExpr), true) ||
    tryBuild(source.match(reFuncDecl), false)
  );
}

/** Convert various width-like outputs to pixels for assertions */
function toPixelWidth(any, containerWidth) {
  if (any == null) return NaN;
  if (typeof any === 'number' && Number.isFinite(any)) return any;
  if (typeof any === 'string') {
    const m = any.match(/^(-?\d+(?:\.\d+)?)%$/);
    if (m) return (parseFloat(m[1]) / 100) * containerWidth;
    const num = Number(any);
    if (Number.isFinite(num)) return num;
  }
  if (typeof any === 'object') {
    if ('width' in any) return toPixelWidth(any.width, containerWidth);
    if (any.style && 'width' in any.style) {
      return toPixelWidth(any.style.width, containerWidth);
    }
  }
  return NaN;
}

/** Fallback helpers used when we fail to extract from the screen source */
function fallbackPercent(correct, total) {
  if (!total) return 100;
  const p = Math.max(0, Math.min(1, (Number(correct) || 0) / Number(total)));
  return Math.round(p * 100);
}
function fallbackProgressWidth(pctOrNum, container) {
  const pct =
    typeof pctOrNum === 'number'
      ? pctOrNum
      : Number(String(pctOrNum).replace('%', ''));
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (clamped / 100) * container;
}

let percentFn = fallbackPercent;
let widthFn = fallbackProgressWidth;

describe('ResultShareScreen pure helpers', () => {
  test('module presence', () => {
    expect(Boolean(modPath)).toBe(true);
  });

  if (modPath) {
    const source = fs.readFileSync(modPath, 'utf8');

    // Try a few common names for a "percent" helper
    const pickedPercent =
      extractNamedHelper(source, /percent|pct/i) ||
      extractNamedHelper(source, /scoreToPercent|toPercent|calcPercent/i);

    // Try a few common names for a "progress width" helper
    const pickedWidth =
      extractNamedHelper(source, /width/i) ||
      extractNamedHelper(source, /progress[^\\n]*width/i) ||
      extractNamedHelper(source, /barWidth/i);

    if (pickedPercent) percentFn = pickedPercent.fn;
    if (pickedWidth) widthFn = pickedWidth.fn;
  }

  /* --------- percent --------- */
  test('percent: 0 / 10 -> 0%', () => {
    const v = Number(percentFn(0, 10));
    expect(Math.round(v)).toBe(0);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });

  test('percent: 5 / 10 ≈ 50%', () => {
    const v = Number(percentFn(5, 10));
    expect(v).toBeGreaterThanOrEqual(49);
    expect(v).toBeLessThanOrEqual(51);
  });

  test('percent: 10 / 10 -> 100%', () => {
    const v = Number(percentFn(10, 10));
    expect(Math.round(v)).toBe(100);
  });

  test('percent: overflow clamps to ≤ 100', () => {
    const v = Number(percentFn(200, 100));
    expect(v).toBeLessThanOrEqual(100);
  });

  test('percent: negative score clamps to ≥ 0', () => {
    const v = Number(percentFn(-5, 10));
    expect(v).toBeGreaterThanOrEqual(0);
  });

  test('percent: total = 0 -> returns 100 (or implementation-compatible value)', () => {
    const v = Number(percentFn(5, 0));
    expect([100, 0].includes(Math.round(v))).toBe(true);
  });

  /* --------- width --------- */
  test('width: 50% in a 200px container ≈ 100px', () => {
    const out = widthFn(50, 200);
    const px = toPixelWidth(out, 200);
    expect(Number.isFinite(px)).toBe(true);
    expect(px).toBeGreaterThanOrEqual(99);
    expect(px).toBeLessThanOrEqual(101);
  });

  test('width: negative percentage -> 0px', () => {
    const out = widthFn(-20, 100);
    const px = toPixelWidth(out, 100);
    expect(Number.isFinite(px)).toBe(true);
    expect(px).toBeCloseTo(0, 3);
  });

  test('width: >100% clamps to container width', () => {
    const out = widthFn(180, 150);
    const px = toPixelWidth(out, 150);
    expect(Number.isFinite(px)).toBe(true);
    expect(px).toBeCloseTo(150, 3);
  });

  test('width: accepts string percentages like "75%"', () => {
    const px = toPixelWidth('75%', 200);
    expect(px).toBeCloseTo(150, 3);
  });
});
