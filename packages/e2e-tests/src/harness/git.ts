import { existsSync } from 'node:fs'
import { lstat, rm } from 'node:fs/promises'
import * as path from 'node:path'
import { runCommand } from './exec'

export interface EnsureGitRepoOptions {
  repoRoot: string
  env: NodeJS.ProcessEnv
  logsRoot: string
}

export const ensureGitRepo = async (options: EnsureGitRepoOptions): Promise<void> => {
  const gitPath = path.join(options.repoRoot, '.git')
  const gitEnv: NodeJS.ProcessEnv = {
    ...options.env,
    GIT_AUTHOR_NAME: 'Magek E2E',
    GIT_AUTHOR_EMAIL: 'e2e@example.com',
    GIT_COMMITTER_NAME: 'Magek E2E',
    GIT_COMMITTER_EMAIL: 'e2e@example.com'
  }

  if (existsSync(gitPath)) {
    const stats = await lstat(gitPath)
    if (stats.isFile()) {
      await rm(gitPath)
    }
  }

  if (!existsSync(gitPath)) {
    await runCommand('git', ['init'], {
      cwd: options.repoRoot,
      env: gitEnv,
      logFile: path.join(options.logsRoot, 'git-init.log')
    })

    await runCommand('git', ['add', '-A'], {
      cwd: options.repoRoot,
      env: gitEnv,
      logFile: path.join(options.logsRoot, 'git-add.log')
    })

    await runCommand('git', ['commit', '-m', 'e2e bootstrap', '--no-gpg-sign'], {
      cwd: options.repoRoot,
      env: gitEnv,
      logFile: path.join(options.logsRoot, 'git-commit.log')
    })
  }
}
