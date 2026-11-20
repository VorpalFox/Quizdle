// Les corrections faites à la main, que les scripts de récupération appliquent sans jamais les écraser :
// data/anime-manual.json (Animedle) et data/weebdle-manual.json (Weebdle). Format dans le README.
import { readFile } from 'node:fs/promises'
import type { AttributeValue, Entry } from '../src/engine/types.js'

export interface Manual {
  // ids des personnages à retirer
  exclude: string[]
  // id → champs à remplacer : name, aliases, image, ou un attribut (gender, hair...). Les clés en « _ » sont ignorées (« _nom » pour s'y retrouver).
  edit: Record<string, Record<string, unknown>>
  // personnages complets à ajouter
  add: Entry[]
}

const ENTRY_FIELDS = new Set(['name', 'aliases', 'image'])

export async function loadManual(file: URL): Promise<Manual> {
  const text = await readFile(file, 'utf8').catch(() => null)
  const manual = text ? JSON.parse(text) as Partial<Manual> : {}
  return { exclude: (manual.exclude ?? []).map(String), edit: manual.edit ?? {}, add: manual.add ?? [] }
}

// Applique les corrections à des entrées déjà générées. Renvoie aussi ce qui ne colle pas (id inconnu, attribut inconnu...)
export function applyManual(entries: Entry[], manual: Manual, attributeKeys: readonly string[]): { entries: Entry[], warnings: string[] } {
  const warnings: string[] = []
  const known = new Set(attributeKeys)
  const ids = new Set(entries.map(entry => entry.id))
  const excluded = new Set(manual.exclude)

  for (const id of Object.keys(manual.edit)) {
    if (!ids.has(id))
      warnings.push(`edit : l'id ${id} n'est pas dans les personnages gardés (retiré, ou pas encore tiré)`)
    else if (excluded.has(id))
      warnings.push(`edit : l'id ${id} est aussi dans exclude, il reste retiré`)
  }

  const edited = entries.filter(entry => !excluded.has(entry.id)).map(entry => {
    const changes = manual.edit[entry.id]
    if (!changes)
      return entry
    const result = { ...entry, attributes: { ...entry.attributes } } as { -readonly [K in keyof Entry]: Entry[K] } & { attributes: Record<string, AttributeValue> }
    for (const [key, value] of Object.entries(changes)) {
      if (key.startsWith('_'))
        continue
      if (ENTRY_FIELDS.has(key))
        (result as Record<string, unknown>)[key] = value
      else if (known.has(key))
        result.attributes[key] = value as AttributeValue
      else
        warnings.push(`edit ${entry.id} (${entry.name}) : « ${key} » n'est pas un attribut (${attributeKeys.join(', ')})`)
    }
    return result
  })

  for (const entry of manual.add) {
    if (ids.has(entry.id))
      warnings.push(`add : l'id ${entry.id} (${entry.name}) existe déjà, utiliser edit pour le corriger`)
    for (const key of Object.keys(entry.attributes ?? {})) {
      if (!known.has(key))
        warnings.push(`add ${entry.id} (${entry.name}) : « ${key} » n'est pas un attribut`)
    }
  }
  return { entries: [...edited, ...manual.add.filter(entry => !ids.has(entry.id))], warnings }
}
