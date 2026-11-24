import { readFileSync } from 'node:fs'
import type { AttributeDef, Entry } from '../engine/types.js'
import { applyManual, manualFile, readManual } from './manual.js'

// Les données sont dans data/ à la racine : même chemin relatif depuis src/subjects et dist/subjects.
// corrections : le sujet a un fichier de corrections à la main (data/<sujet>-manual.json), appliqué par-dessus.
export function loadEntries(fileName: string, corrections?: { subjectId: string, attributes: readonly AttributeDef[] }): Entry[] {
  const entries = JSON.parse(readFileSync(new URL(`../../data/${fileName}`, import.meta.url), 'utf8')) as Entry[]
  if (!corrections)
    return entries
  return applyManual(entries, readManual(manualFile(corrections.subjectId)), corrections.attributes).entries
}
