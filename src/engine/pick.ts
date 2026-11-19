import type { Entry, Subject } from './types.js'

const DAY_MS = 86_400_000

export function randomEntry(subject: Subject, random: () => number = Math.random): Entry {
  if (subject.entries.length === 0)
    throw new Error(`Le sujet ${subject.id} n'a aucune entrée`)
  return subject.entries[Math.floor(random() * subject.entries.length)]!
}

// Le jour au format AAAA-MM-JJ, à l'heure locale du fuseau (minuit à Paris, pas minuit UTC)
export function dayKey(date: Date = new Date(), timeZone = 'Europe/Paris'): string {
  return date.toLocaleDateString('en-CA', { timeZone })
}

// Même cible pour tout le monde un jour donné, comme sur les sites -dle.
// On parcourt les entrées dans un ordre mélangé : pas de doublon avant d'avoir fait le tour,
// et chaque tour a un ordre différent.
export function dailyEntry(subject: Subject, day: string = dayKey()): Entry {
  if (subject.entries.length === 0)
    throw new Error(`Le sujet ${subject.id} n'a aucune entrée`)
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS)
  const count = subject.entries.length
  const round = Math.floor(dayNumber / count)
  // tri par id : l'ordre ne dépend pas de l'ordre du fichier de données
  const sorted = [...subject.entries].sort((a, b) => a.id.localeCompare(b.id))
  return shuffle(sorted, seededRandom(`${subject.id}:${round}`))[dayNumber % count]!
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

// Hash FNV-1a de la graine puis mulberry32 : toujours la même suite pour la même graine
function seededRandom(seed: string): () => number {
  let state = 2166136261
  for (const char of seed)
    state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
}
