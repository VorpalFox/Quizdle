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

// Faute tolérée seulement si le mot tapé fait au moins 4 lettres : en dessous, des mots courants
// seraient pris pour des noms (« new » → Mew, « ami » → Abo)
const MIN_TYPO_LENGTH = 4

// « Sam (The Last of Us) », « chien (half-life) » : le nom, puis l'univers entre parenthèses
const WITH_UNIVERSE = /^(.+?)\s*\(([^()]+)\)\s*$/
// Un bout de l'univers suffit (« Sam (Last of Us) »), mais pas une ou deux lettres
const MIN_UNIVERSE_LENGTH = 3

// Le nom suivi de son univers : les entrées de ce nom dans cet univers. null si la saisie n'a pas cette forme.
function matchesInUniverse(subject: Subject, query: string): { exact: boolean, entries: Entry[] } | null {
  const parsed = WITH_UNIVERSE.exec(query.trim())
  const universeKey = subject.universeKey
  if (!parsed || !universeKey)
    return null
  const universe = normalize(parsed[2]!)
  if (universe.length < MIN_UNIVERSE_LENGTH)
    return null
  const inUniverse = (entry: Entry) => normalize(String(entry.attributes[universeKey] ?? '')).includes(universe)
  const { exact, entries } = matches(subject, parsed[1]!)
  return { exact, entries: entries.filter(inUniverse) }
}

// Tous les noms exacts d'abord (plusieurs : des homonymes), sinon les noms à une faute de frappe près
// (« roocool » → Roucool, « ratattac » → Rattatac). Un nom suivi de son univers entre parenthèses ne garde que celui-là.
function matches(subject: Subject, query: string): { exact: boolean, entries: Entry[] } {
  const whole = matchesByName(subject, query)
  // Un nom qui contient lui-même des parenthèses (« Samuel Hayden (Doom) ») passe d'abord
  if (whole.exact && whole.entries.length > 0)
    return whole
  return matchesInUniverse(subject, query) ?? whole
}

function matchesByName(subject: Subject, query: string): { exact: boolean, entries: Entry[] } {
  const wanted = normalize(query)
  if (!wanted)
    return { exact: true, entries: [] }
  const exact = subject.entries.filter(entry => keys(entry).includes(wanted))
  if (exact.length > 0 || wanted.length < MIN_TYPO_LENGTH)
    return { exact: true, entries: exact }
  return { exact: false, entries: subject.entries.filter(entry => keys(entry).some(key => isOneTypoAway(wanted, key))) }
}

// L'entrée tapée, seulement si une seule colle : on ne devine ni entre deux homonymes, ni entre deux noms proches
export function findEntry(subject: Subject, query: string): Entry | undefined {
  const { entries } = matches(subject, query)
  return entries.length === 1 ? entries[0] : undefined
}

// Les homonymes que ce nom désigne exactement (« Sam » : celui de The Last of Us, de Stardew Valley...), [] sinon
export function homonyms(subject: Subject, query: string): Entry[] {
  const { exact, entries } = matches(subject, query)
  return exact && entries.length > 1 ? entries : []
}

// Les noms portés par plusieurs entrées (nom ou alias), calculés une fois par sujet
const sharedNames = new WeakMap<Subject, Set<string>>()
function shared(subject: Subject): Set<string> {
  let names = sharedNames.get(subject)
  if (!names) {
    const owners = new Map<string, number>()
    for (const entry of subject.entries) {
      for (const key of new Set([entry.name, ...entry.aliases ?? []].map(normalize)))
        owners.set(key, (owners.get(key) ?? 0) + 1)
    }
    names = new Set([...owners].filter(([, count]) => count > 1).map(([key]) => key))
    sharedNames.set(subject, names)
  }
  return names
}

// Le nom à afficher : avec son univers si un autre personnage porte le même nom (« Sam (The Last of Us) »), ou toujours
export function displayName(subject: Subject, entry: Entry, always = false): string {
  const universe = subject.universeKey ? entry.attributes[subject.universeKey] : null
  return typeof universe === 'string' && (always || shared(subject).has(normalize(entry.name))) ? `${entry.name} (${universe})` : entry.name
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
