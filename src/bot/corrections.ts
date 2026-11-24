// /quizdebug remove et /quizdebug edit : corrections à la main faites depuis Discord.
// Elles sont écrites dans data/<sujet>-manual.json (relues au démarrage et par les scripts de récupération),
// et appliquées tout de suite aux données en mémoire.
import { GameError } from '../engine/game.js'
import { findEntry } from '../engine/search.js'
import { type AttributeDef, type AttributeValue, type Entry, NOT_APPLICABLE, type Subject } from '../engine/types.js'
import { editEntry, isSetEdit, manualFile, mergeSetEdits, readManual, type SetEdit, writeManual } from '../subjects/manual.js'
import type { GameStore } from './store.js'

// Valeur qui veut dire « vide » dans /quizdebug edit
const EMPTY_VALUES = new Set(['-', 'vide', 'aucun', 'aucune', 'null'])
// Valeur qui veut dire « non applicable » (personnage immatériel), acceptée aussi pour un nombre
const NOT_APPLICABLE_VALUES = new Set(['na', 'n/a', 'non applicable'])

// L'entrée choisie : l'autocomplétion donne son id, mais on accepte aussi un nom tapé à la main
export function resolveEntry(subject: Subject, input: string): Entry {
  const entry = subject.entries.find(candidate => candidate.id === input) ?? findEntry(subject, input)
  if (!entry)
    throw new GameError(`« ${input} » n'est pas dans le ${subject.name}.`)
  return entry
}

// « Blancs, Noirs » → ["Blancs", "Noirs"] pour un attribut à plusieurs valeurs, « 17 » → 17 pour un nombre, « - » → vide
export function parseValue(attribute: AttributeDef, input: string): AttributeValue {
  const text = input.trim()
  if (EMPTY_VALUES.has(text.toLowerCase()))
    return null
  if (NOT_APPLICABLE_VALUES.has(text.toLowerCase()))
    return attribute.kind === 'set' ? [NOT_APPLICABLE] : NOT_APPLICABLE
  switch (attribute.kind) {
    case 'number': {
      const value = Number(text.replace(',', '.'))
      if (!Number.isFinite(value))
        throw new GameError(`${attribute.label} attend un nombre (« - » pour vide, « n/a » pour non applicable), pas « ${text} ».`)
      return value
    }
    case 'set': {
      const values = [...new Set(text.split(/\s*[,/]\s*/).filter(Boolean))]
      return values.length > 0 ? values : null
    }
    case 'exact':
      return text
  }
}

// Un attribut à plusieurs valeurs : « Soldat, -Dirigeant » ajoute Soldat et retire Dirigeant, sans toucher aux autres
// valeurs. « - » vide le champ, « n/a » le remplace par non applicable : toutes les valeurs actuelles sont retirées.
export function parseSetEdit(input: string, current: AttributeValue): SetEdit {
  const text = input.trim().toLowerCase()
  const all = (Array.isArray(current) ? current : current === null ? [] : [current]).map(String)
  if (EMPTY_VALUES.has(text))
    return all.length > 0 ? { moins: all } : {}
  if (NOT_APPLICABLE_VALUES.has(text))
    return { plus: [NOT_APPLICABLE], ...all.length > 0 ? { moins: all.filter(value => value !== NOT_APPLICABLE) } : {} }
  const items = [...new Set(input.split(/\s*[,/]\s*/).map(item => item.trim()).filter(Boolean))]
  const plus = items.filter(item => !item.startsWith('-'))
  const moins = items.filter(item => item.startsWith('-')).map(item => item.slice(1).trim()).filter(Boolean)
  return { ...plus.length > 0 ? { plus } : {}, ...moins.length > 0 ? { moins } : {} }
}

// Les valeurs déjà utilisées par d'autres entrées, de la plus fréquente à la moins fréquente : pour repérer « blanc » au lieu de « Blancs »
export function existingValues(subject: Subject, key: string): string[] {
  const counts = new Map<string, number>()
  for (const entry of subject.entries) {
    const value = entry.attributes[key]
    for (const item of Array.isArray(value) ? value : value === null || value === undefined ? [] : [value])
      counts.set(String(item), (counts.get(String(item)) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([value]) => value)
}

// file : le fichier de corrections, celui du sujet dans data/ par défaut (les tests en passent un autre)
export function removeEntry(subject: Subject, entry: Entry, store: Pick<GameStore, 'redrawIfTarget'>, file: URL = manualFile(subject.id)): { redrawn: boolean } {
  const manual = readManual(file)
  if (!manual.exclude.includes(entry.id))
    manual.exclude.push(entry.id)
  writeManual(file, manual)

  const entries = subject.entries as Entry[]
  entries.splice(entries.indexOf(entry), 1)
  return { redrawn: store.redrawIfTarget(subject, entry.id) }
}

// Un attribut à plusieurs valeurs s'écrit en valeurs ajoutées et retirées (parseSetEdit), cumulées avec la correction
// déjà faite. value : la valeur après la correction.
export function editAttribute(subject: Subject, entry: Entry, attribute: AttributeDef, input: string, file: URL = manualFile(subject.id)): { value: AttributeValue, unseen: string[], known: string[] } {
  const change = attribute.kind === 'set' ? parseSetEdit(input, entry.attributes[attribute.key] ?? null) : parseValue(attribute, input)
  // avant la modif, pour que la valeur tapée ne se compte pas elle-même
  const known = attribute.kind === 'number' ? [] : existingValues(subject, attribute.key)

  const manual = readManual(file)
  const before = manual.edit[entry.id]?.[attribute.key]
  const saved = isSetEdit(change) ? mergeSetEdits(isSetEdit(before) ? before : undefined, change) : change
  manual.edit[entry.id] = { _nom: entry.name, ...manual.edit[entry.id], [attribute.key]: saved }
  writeManual(file, manual)

  editEntry(entry, { [attribute.key]: change }, subject.attributes.map(({ key }) => key))
  const value = entry.attributes[attribute.key] ?? null
  const typed = isSetEdit(change) ? change.plus ?? [] : (Array.isArray(change) ? change : change === null ? [] : [change]).map(String)
  const unseen = typed.filter(item => attribute.kind !== 'number' && !known.includes(item))
  return { value, unseen, known }
}
