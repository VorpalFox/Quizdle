import type { Entry, Subject } from './types.js'

// exclude : ids à éviter (anciennes cibles). Si tout est exclu, on repart sur toutes les entrées.
export function randomEntry(subject: Subject, exclude: ReadonlySet<string> = new Set(), random: () => number = Math.random): Entry {
  if (subject.entries.length === 0)
    throw new Error(`Le sujet ${subject.id} n'a aucune entrée`)
  const remaining = subject.entries.filter(entry => !exclude.has(entry.id))
  const candidates = remaining.length ? remaining : subject.entries
  return candidates[Math.floor(random() * candidates.length)]!
}

// Le jour au format AAAA-MM-JJ, à l'heure locale du fuseau (minuit à Paris, pas minuit UTC)
export function dayKey(date: Date = new Date(), timeZone = 'Europe/Paris'): string {
  return date.toLocaleDateString('en-CA', { timeZone })
}
