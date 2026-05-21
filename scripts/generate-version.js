import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import packageJson from '../package.json' with { type: 'json' }

const target = resolve('src/generated/version.js')

mkdirSync(dirname(target), { recursive: true })
writeFileSync(
  target,
  `export const appVersion = '${packageJson.version}'\nexport const elstarVersion = '${packageJson.elstarVersion}'\n`,
)
