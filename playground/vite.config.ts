import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from /<repo-name>/, not /. The
// GITHUB_REPOSITORY env var (owner/repo, set automatically in Actions) lets
// this stay correct without hardcoding the repo name; local dev/preview
// still serves from / since that var is unset outside CI.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

// Workspace packages (@steffolino/diagram-kit-*) are linked via pnpm and consumed as
// their built dist/*.js output, not source. Vite normally pre-bundles and
// caches deps under node_modules and ignores node_modules for file
// watching, so a `tsc --watch` rebuild of a workspace package wouldn't
// trigger HMR here without these two overrides.
const workspacePackages = ['@steffolino/diagram-kit-core', '@steffolino/diagram-kit-static', '@steffolino/diagram-kit-react', '@steffolino/diagram-kit-adapters']

export default defineConfig({
  base: repoName ? `/${repoName}/` : '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: workspacePackages,
  },
  server: {
    watch: {
      ignored: workspacePackages.map((name) => `!**/node_modules/${name}/dist/**`),
    },
  },
})
