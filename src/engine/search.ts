import type { Entry, Subject } from './types.js'

// « Nidoran♀ », « nidoran f », « M. Mime », « m mime » doivent tous retrouver la bonne entrée
export function normalize(text: string): string {
  return text
    .replaceAll('♀', 'f')
    .replaceAll('♂', 'm')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function keys(entry: Entry): string[] {
  return [entry.name, entry.id, ...(entry.aliases ?? [])].map(normalize)
}

export function findEntry(subject: Subject, query: string): Entry | undefined {
  const wanted = normalize(query)
  return wanted ? subject.entries.find(entry => keys(entry).includes(wanted)) : undefined
}

// Pour l'autocomplétion : ceux qui commencent par la saisie d'abord, puis ceux qui la contiennent
export function searchEntries(subject: Subject, query: string, limit: number, exclude: ReadonlySet<string> = new Set()): Entry[] {
  const wanted = normalize(query)
  const candidates = subject.entries.filter(entry => !exclude.has(entry.id))
  if (!wanted)
    return candidates.slice(0, limit)
  const starts = candidates.filter(entry => keys(entry).some(key => key.startsWith(wanted)))
  const contains = candidates.filter(entry => !starts.includes(entry) && keys(entry).some(key => key.includes(wanted)))
  return [...starts, ...contains].slice(0, limit)
}
