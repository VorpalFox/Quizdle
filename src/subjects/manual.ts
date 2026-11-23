// Les corrections faites à la main : data/anime-manual.json (Animedle), data/weebdle-manual.json (Weebdle) et data/pixeldle-manual.json (Pixeldle).
// Appliquées par les scripts de récupération à chaque génération, et par le bot au chargement des données
// (une correction faite avec /quizdebug survit donc à un redémarrage). Format dans le README.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import type { AttributeValue, Entry } from '../engine/types.js'

export interface Manual {
  // ids des personnages à retirer
  exclude: string[]
  // id → champs à remplacer : name, aliases, image, ou un attribut (gender, hair...). Les clés en « _ » sont ignorées (« _nom » pour s'y retrouver).
  edit: Record<string, Record<string, unknown>>
  // personnages complets à ajouter
  add: Entry[]
  // Pixeldle : titre de la franchise → réglages de la recherche dans son wiki (voir scripts/pixeldleWikiCharacters.ts)
  wikis?: Record<string, WikiSettings>
}

export interface WikiSettings {
  // pages à prendre d'abord, avant le classement par longueur
  preferred?: string[]
  // pages à lire en plus de la catégorie (personnages qui n'y sont pas rangés), prises en premier
  pages?: string[]
  // nombre de personnages au plus, quand le wiki n'en a pas plus de vrais
  limit?: number
  // catégorie des personnages, quand ce n'est ni « Characters » ni une des autres essayées
  category?: string
}

// Le fichier de corrections de chaque sujet qui en a un (data/ à la racine, même chemin depuis src/subjects et dist/subjects)
const MANUAL_FILES: Record<string, string> = { animedle: 'anime-manual.json', weebdle: 'weebdle-manual.json', pixeldle: 'pixeldle-manual.json' }

export const hasManual = (subjectId: string) => subjectId in MANUAL_FILES
export const manualSubjectIds = Object.keys(MANUAL_FILES)

// « data/weebdle-manual.json »
export function manualFileName(subjectId: string): string {
  const name = MANUAL_FILES[subjectId]
  if (!name)
    throw new Error(`Le sujet ${subjectId} n'a pas de fichier de corrections`)
  return `data/${name}`
}

export function manualFile(subjectId: string): URL {
  return new URL(`../../${manualFileName(subjectId)}`, import.meta.url)
}

export function readManual(file: URL): Manual {
  const manual = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as Partial<Manual> : {}
  return { exclude: (manual.exclude ?? []).map(String), edit: manual.edit ?? {}, add: manual.add ?? [], ...manual.wikis ? { wikis: manual.wikis } : {} }
}

// Écrit dans un fichier temporaire puis renomme : pas de fichier à moitié écrit si le bot s'arrête pile à ce moment
export function writeManual(file: URL, manual: Manual): void {
  const temp = new URL(`${file.href}.tmp`)
  writeFileSync(temp, `${JSON.stringify(manual, null, 1)}\n`)
  renameSync(temp, file)
}

const ENTRY_FIELDS = new Set(['name', 'aliases', 'image'])

// Applique un jeu de champs (ceux d'une ligne de « edit ») à une entrée, sur place : une correction faite pendant
// que le bot tourne touche aussi la réponse du jour et les parties en cours, qui pointent sur le même objet.
// Renvoie les clés qui ne sont ni un champ ni un attribut.
export function editEntry(entry: Entry, changes: Record<string, unknown>, attributeKeys: readonly string[]): string[] {
  const unknown: string[] = []
  const mutable = entry as { -readonly [K in keyof Entry]: Entry[K] }
  const attributes: Record<string, AttributeValue> = { ...entry.attributes }
  for (const [key, value] of Object.entries(changes)) {
    if (key.startsWith('_'))
      continue
    if (ENTRY_FIELDS.has(key))
      (mutable as Record<string, unknown>)[key] = value
    else if (attributeKeys.includes(key))
      attributes[key] = value as AttributeValue
    else
      unknown.push(key)
  }
  mutable.attributes = attributes
  return unknown
}

// Applique les corrections à des entrées. Renvoie aussi ce qui ne colle pas (id inconnu, attribut inconnu...).
// Sans effet si les corrections sont déjà appliquées : le bot peut repasser sur un fichier généré par les scripts.
export function applyManual(entries: Entry[], manual: Manual, attributeKeys: readonly string[]): { entries: Entry[], warnings: string[] } {
  const warnings: string[] = []
  const ids = new Set(entries.map(entry => entry.id))
  const excluded = new Set(manual.exclude)

  for (const id of Object.keys(manual.edit)) {
    if (!ids.has(id))
      warnings.push(`edit : l'id ${id} n'est pas dans les personnages gardés (retiré, ou pas encore tiré)`)
    else if (excluded.has(id))
      warnings.push(`edit : l'id ${id} est aussi dans exclude, il reste retiré`)
  }

  const kept = entries.filter(entry => !excluded.has(entry.id)).map(entry => {
    const changes = manual.edit[entry.id]
    if (!changes)
      return entry
    const copy: Entry = { ...entry }
    for (const key of editEntry(copy, changes, attributeKeys))
      warnings.push(`edit ${entry.id} (${entry.name}) : « ${key} » n'est pas un attribut (${attributeKeys.join(', ')})`)
    return copy
  })

  const added = manual.add.filter(entry => !ids.has(entry.id) && !excluded.has(entry.id))
  for (const entry of added) {
    for (const key of Object.keys(entry.attributes ?? {})) {
      if (!attributeKeys.includes(key))
        warnings.push(`add ${entry.id} (${entry.name}) : « ${key} » n'est pas un attribut`)
    }
  }
  return { entries: [...kept, ...added], warnings }
}
