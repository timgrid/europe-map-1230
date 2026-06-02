import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

function sh(cmd: string): string {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch (err: any) {
    return (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '')
  }
}

const isGitRepo = existsSync(join(REPO_ROOT, '.git'))
const CUTOFF_SHA = '9f7ca3d' // first conventional commit; older ones predate the policy

describe('Conventional Commits', () => {
  it.skipIf(!isGitRepo)('commitlint config is present', () => {
    expect(existsSync(join(REPO_ROOT, 'commitlint.config.cjs'))).toBe(true)
  })

  it.skipIf(!isGitRepo)('commit-msg hook is installed', () => {
    const hookPath = join(REPO_ROOT, '.husky', 'commit-msg')
    expect(existsSync(hookPath)).toBe(true)
  })

  it.skipIf(!isGitRepo)('all commits after cutoff follow Conventional Commits', () => {
    const out = sh(
      `npx --no -- commitlint --from=${CUTOFF_SHA} --to=HEAD`,
    )
    expect(out, out).toBe('')
  })
})
