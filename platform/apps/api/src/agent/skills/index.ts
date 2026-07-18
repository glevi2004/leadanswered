import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Skill } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Skill registry (docs/system.md §1). Skills are REAL `.md` files in this
// directory — a frontmatter header (name/description) + the markdown procedure
// the agent follows. Adding a skill = dropping in a file; nothing to register.
//
// Loading: read from the directory this module lives in. In dev (tsx) that IS
// src/agent/skills; in prod the build copies *.md into dist/agent/skills (see
// package.json "build"), with a src/ fallback in case the copy is missing.
// Loaded once and cached — skills change by deploy, not at runtime.
// ─────────────────────────────────────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url));
const CANDIDATE_DIRS = [HERE, HERE.replace(`${sep}dist${sep}`, `${sep}src${sep}`)];

/** Parse `---\nkey: value\n---\nbody` frontmatter; body is the procedure. */
function parseSkillFile(filename: string, raw: string): Skill {
  const fallbackName = basename(filename, ".md");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  const meta: Record<string, string> = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(line.trim());
      if (kv) meta[kv[1].toLowerCase()] = kv[2].trim();
    }
  }
  return {
    name: meta.name || fallbackName,
    description: meta.description || "",
    procedure: m ? raw.slice(m[0].length) : raw,
  };
}

let cache: Map<string, Skill> | null = null;

function loadAll(): Map<string, Skill> {
  if (cache) return cache;
  const skills = new Map<string, Skill>();
  for (const dir of CANDIDATE_DIRS) {
    try {
      if (!existsSync(dir)) continue;
      const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      if (files.length === 0) continue;
      for (const f of files) {
        try {
          const skill = parseSkillFile(f, readFileSync(join(dir, f), "utf8"));
          skills.set(skill.name, skill);
        } catch (err) {
          console.error(`[skills] failed to load ${f}:`, err);
        }
      }
      break; // first directory with .md files wins (dist in prod, src in dev)
    } catch (err) {
      console.error(`[skills] failed to scan ${dir}:`, err);
    }
  }
  cache = skills;
  return skills;
}

/** Load a skill by name, or null if there is none. */
export function getSkill(name: string): Skill | null {
  return loadAll().get(name) ?? null;
}

/** All available skills (for listings / debugging). */
export function listSkills(): Skill[] {
  return [...loadAll().values()];
}

export type { Skill } from "./types.js";
