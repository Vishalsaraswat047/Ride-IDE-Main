// RIDE Feature Checklist Auditor — ESM version
import { sections as s1 } from './parts/s01-09.mjs';
import { sections as s2 } from './parts/s10-24.mjs';
import { sections as s3 } from './parts/s25-33.mjs';
import fs from 'fs';
import path from 'path';

const allSections = [s1, s2, s3].flatMap(m => m);

const PROBE_ROOTS = [
  'apps/desktop/src',
  'apps/backend/src',
  'packages/agent-core/src',
  'packages/agent-bridge/src',
  'packages/git/src',
  'packages/ide-core/src',
  'packages/marketplace/src',
  'packages/model-router/src',
  'packages/permissions/src',
  'packages/plugins/src',
  'packages/project-db/src',
  'packages/theme/src',
  'packages/ui/src',
];

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function grep(pattern, roots) {
  const regex = new RegExp(pattern, 'i');
  for (const root of roots) {
    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name === 'node_modules') continue;
        if (entry.isFile()) {
          try {
            const content = fs.readFileSync(path.join(root, entry.name), 'utf-8');
            if (regex.test(content)) return true;
          } catch { /* skip */ }
        }
      }
      // recurse subdirs
      const subEntries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of subEntries) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'out') {
          if (grep(pattern, [path.join(root, entry.name)])) return true;
        }
      }
    } catch { /* skip root */ }
  }
  return false;
}

function probeItem(item) {
  const [, , probe, evidence] = item;
  if (!probe || probe === 'none') return { pass: false, kind: 'none' };
  if (probe.startsWith('file:')) {
    const p = path.resolve(process.cwd(), probe.slice(5));
    return { pass: fileExists(p), kind: 'file' };
  }
  if (probe.startsWith('grep:')) {
    const pattern = probe.slice(5);
    return { pass: grep(pattern, PROBE_ROOTS), kind: 'grep' };
  }
  return { pass: false, kind: 'unknown' };
}

function statusSymbol(s) {
  if (s === 'ok') return '✅';
  if (s === 'partial') return '🟡';
  if (s === 'missing') return '❌';
  if (s === 'verify') return '⚠️';
  if (s === 'na') return '➖';
  return '?';
}

function mergeStatus(baseline, probeResult) {
  if (probeResult.kind === 'none') return baseline;
  if (probeResult.pass) {
    if (baseline === 'missing') return 'partial';
    return baseline;
  }
  if (baseline === 'ok') return 'verify';
  return baseline;
}

// Compute final statuses
for (const section of allSections) {
  for (const item of section.items) {
    const finalStatus = mergeStatus(item[1], probeItem(item));
    item.push(finalStatus, probeItem(item)); // append finalStatus and probeResult
  }
}

// Generate markdown report
const lines = [];
lines.push('# RIDE IDE Feature Checklist — Automated Audit Report');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push(''); 
lines.push('| Section | Item | Status | Probe | Evidence |');
lines.push('|---------|------|--------|-------|---------|');

const sectionCounts = {};
const verifyItems = [];

for (const section of allSections) {
  const secTitle = section.title;
  sectionCounts[secTitle] = { ok: 0, partial: 0, missing: 0, verify: 0, na: 0 };
  for (const item of section.items) {
    const [name, baseline, probe, evidence, finalStatus, pr] = item;
    const sym = statusSymbol(finalStatus);
    lines.push(`| ${secTitle} | ${name} | ${sym} | ${pr.kind}:${probe || '-'} | ${evidence || '-'} |`);
    sectionCounts[secTitle][finalStatus]++;
    if (finalStatus === 'verify') {
      verifyItems.push({ section: secTitle, item: name, status: finalStatus, evidence });
    }
  }
}

lines.push('');
lines.push('## Section Summary');
for (const [sec, counts] of Object.entries(sectionCounts)) {
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  lines.push(`### ${sec} (${total} items)`);
  lines.push(`- ✅ OK: ${counts.ok}  •  🟡 Partial: ${counts.partial}  •  ❌ Missing: ${counts.missing}  •  ⚠️ Verify: ${counts.verify}  •  ➖ NA: ${counts.na}`);
}
lines.push('');

lines.push('## Verified Items (probe contradicted baseline)');
if (verifyItems.length === 0) {
  lines.push('None — all probe results aligned with baseline statuses.');
} else {
  for (const vi of verifyItems) {
    lines.push(`- [${statusSymbol(vi.status)}] ${vi.item} (${vi.section}) — ${vi.evidence || 'no evidence'}`);
  }
}
lines.push('');

lines.push('## Overall Totals');
const totalItems = allSections.flatMap(s => s.items.length);
const totalOk = allSections.flatMap(s => s.items.filter(([_,____,_______,_____,s])=>s==='ok').length);
const totalPartial = allSections.flatMap(s => s.items.filter(([_,____,_______,_____,s])=>s==='partial').length);
const totalMissing = allSections.flatMap(s => s.items.filter(([_,____,_______,_____,s])=>s==='missing').length);
const totalVerify = allSections.flatMap(s => s.items.filter(([_,____,_______,_____,s])=>s==='verify').length);
lines.push(`- ✅ OK: ${totalOk}  •  🟡 Partial: ${totalPartial}  •  ❌ Missing: ${totalMissing}  •  ⚠️ Verify: ${totalVerify}  •  Total: ${totalItems}  •  Coverage: ${((totalOk/totalItems)*100).toFixed(1)}%`);

// Write markdown report to scripts/audit/out/
const outDir = path.join(process.cwd(), 'scripts', 'audit', 'out');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'AUDIT_REPORT.md'), lines.join('\n'));

// Generate JSON report
const jsonRows = [];
for (const section of allSections) {
  for (const item of section.items) {
    const [name, baseline, probe, evidence, finalStatus, pr] = item;
    jsonRows.push({
      section: section.title,
      item: name,
      baseline,
      probe,
      probeResult: pr.kind,
      probePassed: pr.pass,
      evidence,
      finalStatus,
    });
  }
}
fs.writeFileSync(
  path.join(outDir, 'audit-report.json'),
  JSON.stringify(jsonRows, null, 2)
);

// Print console summary
console.log(`RIDE Feature Checklist Audit Complete`);
console.log(`Total items: ${totalItems}`);
console.log(`✅ OK: ${totalOk}  •  🟡 Partial: ${totalPartial}  •  ❌ Missing: ${totalMissing}  •  ⚠️ Verify: ${totalVerify}`);
console.log(`Report written to ${outDir}/AUDIT_REPORT.md and ${outDir}/audit-report.json`);