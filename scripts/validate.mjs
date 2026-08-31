#!/usr/bin/env node
/**
 * Apex SAT architecture consistency check. Zero dependencies.
 *
 *   node scripts/validate.mjs
 *
 * The specification is spread across prose, JSON Schemas, a system prompt and a
 * TypeScript module, and every one of them names trap IDs, skill IDs, Desmos
 * plays and gate checks. This asserts they still agree.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const notes = [];
const fail = (m) => failures.push(m);
const read = (p) => readFileSync(join(root, p), "utf8");

const prose = [
  { path: "README.md", text: read("README.md") },
  ...["docs", "prompts"].flatMap((dir) =>
    readdirSync(join(root, dir))
      .filter((f) => f.endsWith(".md"))
      .map((f) => ({ path: `${dir}/${f}`, text: read(`${dir}/${f}`) }))
  ),
];

/* 1. Every JSON file parses. -------------------------------------------- */
const schemas = {};
for (const f of readdirSync(join(root, "schemas"))) {
  if (!f.endsWith(".json")) continue;
  try {
    schemas[f] = JSON.parse(read(`schemas/${f}`));
  } catch (e) {
    fail(`schemas/${f} is not valid JSON: ${e.message}`);
  }
}
notes.push(`parsed ${Object.keys(schemas).length} schema files`);

/* 2. Trap IDs: unique, well-formed, and every prose reference resolves. -- */
const traps = schemas["cognitive-traps.json"]?.traps ?? [];
const trapIds = new Set();
for (const t of traps) {
  if (trapIds.has(t.id)) fail(`duplicate trap id: ${t.id}`);
  trapIds.add(t.id);
  if (!/^(MATH|RW)_[A-Z_]+$/.test(t.id)) fail(`malformed trap id: ${t.id}`);
  for (const k of ["label", "section", "description", "distractor_recipe", "tell", "remediation_cue"]) {
    if (!t[k]) fail(`trap ${t.id} is missing "${k}"`);
  }
  if (!["math", "reading_writing"].includes(t.section)) {
    fail(`trap ${t.id} has unknown section "${t.section}"`);
  }
  const expectedPrefix = t.section === "math" ? "MATH_" : "RW_";
  if (!t.id.startsWith(expectedPrefix)) {
    fail(`trap ${t.id} prefix does not match section "${t.section}"`);
  }
}
notes.push(`${trapIds.size} trap ids (${traps.filter((t) => t.section === "math").length} math, ${traps.filter((t) => t.section === "reading_writing").length} rw)`);

for (const { path, text } of prose) {
  for (const m of text.matchAll(/\b(?:MATH|RW)_[A-Z][A-Z_]*\b/g)) {
    if (!trapIds.has(m[0])) fail(`${path} references unknown trap id ${m[0]}`);
  }
}

/* 3. Skill IDs referenced in prose exist in the question schema enum. ---- */
const skillEnum = new Set(schemas["question.schema.json"]?.$defs?.skill?.enum ?? []);
const domainEnum = new Set(schemas["question.schema.json"]?.$defs?.domain?.enum ?? []);
for (const s of skillEnum) {
  const domain = s.split(".").slice(0, 2).join(".");
  if (!domainEnum.has(domain)) fail(`skill ${s} has no matching domain ${domain}`);
}
notes.push(`${skillEnum.size} skills across ${domainEnum.size} domains`);

for (const { path, text } of prose) {
  for (const m of text.matchAll(/\b(?:rw|math)\.[a-z_]+\.[a-z_0-9]+\b/g)) {
    if (!skillEnum.has(m[0])) fail(`${path} references unknown skill id ${m[0]}`);
  }
}

/* 4. Desmos plays referenced anywhere are defined in the Academy doc. ---- */
const academy = prose.find((p) => p.path.endsWith("06-desmos-academy.md"));
const definedPlays = new Set(
  [...(academy?.text ?? "").matchAll(/`(T[1-5]\.[A-Z][A-Z_]*)`/g)].map((m) => m[1])
);
notes.push(`${definedPlays.size} Desmos plays defined`);
if (definedPlays.size === 0) fail("no Desmos plays found in the Academy doc");
for (const { path, text } of prose) {
  for (const m of text.matchAll(/\bT[1-5]\.[A-Z][A-Z_]*\b/g)) {
    if (!definedPlays.has(m[0])) fail(`${path} references undefined Desmos play ${m[0]}`);
  }
}

/* 5. Gate check IDs agree between the system prompt and the types. ------- */
const enginePrompt = read("prompts/content-engine.system.md");
const promptGates = new Set([...enginePrompt.matchAll(/\bG\d{2}_[A-Z_]+\b/g)].map((m) => m[0]));
const typeGates = new Set([...read("types/apex.ts").matchAll(/"(G\d{2}_[A-Z_]+)"/g)].map((m) => m[1]));
for (const g of promptGates) if (!typeGates.has(g)) fail(`gate ${g} is in the prompt but not in types/apex.ts`);
for (const g of typeGates) if (!promptGates.has(g)) fail(`gate ${g} is in types/apex.ts but not in the prompt`);
notes.push(`${promptGates.size} validation gate checks, prompt and types agree`);

/* 6. Score scales agree between the types and the blueprint doc. --------- */
const scaleBlock = read("types/apex.ts").match(/export const SCALES[\s\S]*?};/)?.[0] ?? "";
for (const [name, composite] of [
  ["SAT", "[400, 1600]"],
  ["PSAT_NMSQT", "[320, 1520]"],
  ["PSAT_8_9", "[240, 1440]"],
]) {
  if (!scaleBlock.includes(composite)) fail(`SCALES is missing the ${name} composite range ${composite}`);
}
const blueprintDoc = prose.find((p) => p.path.endsWith("02-assessment-blueprints.md"))?.text ?? "";
for (const n of ["240–1440", "320–1520", "400–1600"]) {
  if (!blueprintDoc.includes(n)) fail(`blueprint doc is missing the ${n} scale`);
}

/* 7. Every internal markdown link resolves. ------------------------------ */
const exists = (p) => {
  try { statSync(join(root, p)); return true; } catch { return false; }
};
let linkCount = 0;
for (const { path, text } of prose) {
  for (const m of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(m[1])) continue; // external
    linkCount++;
    const target = join(dirname(path), m[1]);
    if (!exists(target)) fail(`${path} links to missing file ${m[1]}`);
  }
}
notes.push(`${linkCount} internal links resolve`);

/* ----------------------------------------------------------------------- */
for (const n of notes) console.log(`  ${n}`);
if (failures.length) {
  console.error(`\n${failures.length} consistency failure(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("\nArchitecture is internally consistent.");
