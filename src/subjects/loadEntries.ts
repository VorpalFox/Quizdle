import { readFileSync } from 'node:fs'
import type { Entry } from '../engine/types.js'

// Les données sont dans data/ à la racine : même chemin relatif depuis src/subjects et dist/subjects
export function loadEntries(fileName: string): Entry[] {
  return JSON.parse(readFileSync(new URL(`../../data/${fileName}`, import.meta.url), 'utf8')) as Entry[]
}
