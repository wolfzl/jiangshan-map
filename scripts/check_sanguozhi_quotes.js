#!/usr/bin/env node
/*
 * Check that every campaign `quote` tagged with a Sanguozhi block ID matches
 * the original text in the local Sanguozhi translation project.
 *
 * Convention in js/atlas_campaigns.js (see docs/campaign-playback.md §9):
 *
 *   // 《武帝纪》v001-b0047
 *   quote: '“公到延津……颜良可禽也。”',
 *
 * The quote (simplified Chinese, "……" for omissions) must appear verbatim in
 * the original-text section of that block after traditional→simplified
 * conversion. Block files: <SANGUOZHI_DIR>/translations/{wei,shu,wu}/NNN-*duizhao.md
 *
 * Usage: node scripts/check_sanguozhi_quotes.js [campaignKey]
 * Env:   SANGUOZHI_DIR (default /Users/zhangliang/ai/readbook/sanguozhi)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.env.SANGUOZHI_DIR || '/Users/zhangliang/ai/readbook/sanguozhi';
const TRANS = path.join(ROOT, 'translations');
const OPENCC = path.join(ROOT, 'sanguozhi-simplified/node_modules/opencc-js');

if (!fs.existsSync(TRANS)) {
  console.error(`Sanguozhi translations not found: ${TRANS}\nSet SANGUOZHI_DIR to the sanguozhi project root.`);
  process.exit(2);
}
const conv = require(OPENCC).Converter({ from: 't', to: 'cn' });

const volumeFile = {};
for (const dir of ['wei', 'shu', 'wu']) {
  for (const f of fs.readdirSync(path.join(TRANS, dir))) {
    const m = f.match(/^(\d{3})-.*duizhao\.md$/);
    if (m) volumeFile[m[1]] = path.join(TRANS, dir, f);
  }
}

const src = fs.readFileSync(path.join(__dirname, '../js/atlas_campaigns.js'), 'utf8');
const only = process.argv[2];

// Split into campaign entries so failures can be reported per campaign.
const entryRe = /^ {4}([a-z]+): \{\n {6}key: '([a-z]+)'/gm;
const entries = [];
let e;
while ((e = entryRe.exec(src))) entries.push({ key: e[2], start: e.index });
entries.forEach((x, i) => { x.end = i + 1 < entries.length ? entries[i + 1].start : src.length; });

const norm = s => s.replace(/\s/g, '')
  .replace(/[「『‘]/g, '“').replace(/[」』’]/g, '”');

let checked = 0;
let failed = 0;
for (const ent of entries) {
  if (only && ent.key !== only) continue;
  const body = src.slice(ent.start, ent.end);
  const re = /\/\/ [^\n]*?(v(\d{3})-b\d{4})[^\n]*\n\s*quote: '“(.*)”',/g;
  let m;
  while ((m = re.exec(body))) {
    const [, id, vol, quote] = m;
    checked++;
    const file = volumeFile[vol];
    const text = file && fs.readFileSync(file, 'utf8');
    const block = text && text.split(`<a id="${id}"></a>`)[1];
    if (!block) { failed++; console.log(`FAIL ${ent.key} ${id}: block not found`); continue; }
    const orig = norm(conv(block.split('**白话译文**')[0].split('**原文**')[1] || ''));
    const missing = norm(quote).split('……').filter(p => p && !orig.includes(p));
    if (missing.length) { failed++; console.log(`FAIL ${ent.key} ${id}: ${missing.join(' | ')}`); }
    else console.log(`ok   ${ent.key} ${id}`);
  }
}
console.log(`${checked} quote(s) checked, ${failed} failed.`);
process.exit(failed ? 1 : 0);
