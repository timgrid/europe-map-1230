import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

function sh(cmd: string, args: string[] = []): string {
  try {
    const result = execFileSync(cmd, args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return (result ?? '').trim()
  } catch (err: any) {
    return ((err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '')).trim()
  }
}

const isGitRepo = existsSync(join(REPO_ROOT, '.git'))

function resolveCutoffSha(): string | null {
  const sha = sh('git', ['rev-parse', '--verify', '9f7ca3d'])
  return sha.length > 0 ? sha : null
}

function findCommitlintBin(): string {
  const localBin = join(REPO_ROOT, 'node_modules', '.bin', 'commitlint')
  return localBin
}

describe('Conventional Commits', () => {
  it.skipIf(!isGitRepo)('commitlint config is present', () => {
    expect(existsSync(join(REPO_ROOT, 'commitlint.config.cjs'))).toBe(true)
  })

  it.skipIf(!isGitRepo)('commit-msg hook is installed', () => {
    const hookPath = join(REPO_ROOT, '.husky', 'commit-msg')
    expect(existsSync(hookPath)).toBe(true)
  })

  it.skipIf(!isGitRepo)('all commits after cutoff follow Conventional Commits', () => {
    const cutoff = resolveCutoffSha()
    if (!cutoff) {
      throw new Error(
        'Cutoff commit 9f7ca3d is not reachable. ' +
          'Ensure CI checkout uses fetch-depth: 0 to preserve full history.',
      )
    }
    const bin = findCommitlintBin()
    expect(existsSync(bin), `commitlint binary not found at ${bin}`).toBe(true)
    const out = sh(bin, ['--from', cutoff, '--to', 'HEAD'])
    expect(out, out).toBe('')
  })
})
