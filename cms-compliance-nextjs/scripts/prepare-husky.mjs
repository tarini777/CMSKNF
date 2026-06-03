import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.join(__dirname, '..')
const repoRoot = path.join(appRoot, '..')

if (process.env.CI === 'true' || process.env.HUSKY === '0') {
  process.exit(0)
}

const gitDir = path.join(repoRoot, '.git')
if (!existsSync(gitDir)) {
  process.exit(0)
}

try {
  execSync('husky install cms-compliance-nextjs/.husky', {
    cwd: repoRoot,
    stdio: 'inherit',
  })
} catch {
  process.exit(0)
}
