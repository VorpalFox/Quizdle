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

// En dessous, une faute tolérée ferait prendre des mots courants pour des noms (« new » → Mew, « ami » → Abo)
const MIN_TYPO_LENGTH = 4

// Nom exact d'abord, sinon une faute de frappe tolérée (« roocool » → Roucool, « ratattac » → Rattatac),
// mais seulement si une seule entrée colle : on ne devine pas entre deux noms proches
export function findEntry(subject: Subject, query: string): Entry | undefined {
  const wanted = normalize(query)
  if (!wanted)
    return undefined
  const exact = subject.entries.find(entry => keys(entry).includes(wanted))
  if (exact)
    return exact
  const close = subject.entries.filter(entry => keys(entry).some(key => key.length >= MIN_TYPO_LENGTH && isOneTypoAway(wanted, key)))
  return close.length === 1 ? close[0] : undefined
}

// Une lettre changée, ajoutée, enlevée, ou deux lettres voisines inversées. Un seul passage sur le mot.
export function isOneTypoAway(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1)
    return false
  const [longer, shorter] = a.length >= b.length ? [a, b] : [b, a]
  let i = 0
  while (i < shorter.length && longer[i] === shorter[i])
    i++
  if (i === shorter.length)
    return longer.length - shorter.length === 1 // identiques à une lettre en plus près
  if (longer.length > shorter.length)
    return longer.slice(i + 1) === shorter.slice(i) // lettre en trop
  return longer.slice(i + 1) === shorter.slice(i + 1) // lettre changée
    || (longer[i] === shorter[i + 1] && longer[i + 1] === shorter[i] && longer.slice(i + 2) === shorter.slice(i + 2)) // inversion
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
