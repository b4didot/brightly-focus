import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const GUARDED_DIRS = [
  "src/features/focus/queries",
  "src/features/focus/view",
  "src/features/projects/queries",
]
const ALLOWLIST = new Set<string>(["lib/focus-engine/queue.ts"])

function collectTsFiles(dirPath: string): string[] {
  const fullPath = path.join(ROOT, dirPath)
  const entries = readdirSync(fullPath)
  const files: string[] = []

  for (const entry of entries) {
    const candidate = path.join(fullPath, entry)
    const stat = statSync(candidate)
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(path.join(dirPath, entry)))
      continue
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(path.join(dirPath, entry).replaceAll("\\", "/"))
    }
  }

  return files
}

function hasAwaitSupabaseInsideLoop(content: string) {
  const lines = content.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!/for\s*\([^)]*\)\s*{/.test(line)) {
      continue
    }

    const window = lines.slice(index + 1, index + 26)
    if (window.some((candidate) => candidate.includes("await") && candidate.includes("supabase"))) {
      return true
    }
  }
  return false
}

describe("n+1 guardrails", () => {
  it("disallows sequential supabase awaits inside loops in focus/project query modules", () => {
    const files = GUARDED_DIRS.flatMap(collectTsFiles)
    const offenders: string[] = []

    for (const file of files) {
      if (ALLOWLIST.has(file)) {
        continue
      }
      const content = readFileSync(path.join(ROOT, file), "utf-8")
      if (hasAwaitSupabaseInsideLoop(content)) {
        offenders.push(file)
      }
    }

    expect(offenders).toEqual([])
  })
})
