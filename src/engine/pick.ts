import type { Entry, Subject } from './types.js'

export function randomEntry(subject: Subject, random: () => number = Math.random): Entry {
  if (subject.entries.length === 0)
    throw new Error(`Le sujet ${subject.id} n'a aucune entrée`)
  return subject.entries[Math.floor(random() * subject.entries.length)]!
}

// Même cible pour tout le monde un jour donné (pour un futur mode « du jour » comme sur les sites -dle)
export function dailyEntry(subject: Subject, date: Date = new Date()): Entry {
  const seed = `${subject.id}:${date.toISOString().slice(0, 10)}`
  let hash = 2166136261
  for (const char of seed)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return randomEntry(subject, () => (hash >>> 0) / 2 ** 32)
}
