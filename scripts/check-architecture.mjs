import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { cwd, exit } from 'node:process'

const projectRoot = cwd()
const sourceRoot = join(projectRoot, 'src')
const uiLayers = ['views', 'pages', 'components', 'features', 'layouts', 'stores', 'widgets']
const sourceExtensions = new Set(['.ts', '.tsx', '.vue'])
const violations = []

function visit(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      visit(path)
      continue
    }
    if (!sourceExtensions.has(extname(path))) continue
    const source = readFileSync(path, 'utf8')
    if (
      /from\s+['"][^'"]*supabase[^'"]*['"]/.test(source)
      || /\bsupabase\s*\.\s*from\s*\(/.test(source)
    ) {
      violations.push(relative(projectRoot, path))
    }
  }
}

for (const layer of uiLayers) {
  const directory = join(sourceRoot, layer)
  try {
    visit(directory)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

if (violations.length) {
  console.error('UI/model layers must use entity APIs instead of Supabase directly:')
  for (const file of violations) console.error(`- ${file}`)
  exit(1)
}

console.log('Architecture boundaries are valid.')
