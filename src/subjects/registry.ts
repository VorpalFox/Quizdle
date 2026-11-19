import type { Subject } from '../engine/types.js'
import { pokemon } from './pokemon/index.js'

// Pour ajouter un sujet : créer src/subjects/<sujet>/index.ts + data/<sujet>.json, puis l'ajouter ici
export const subjects: readonly Subject[] = [pokemon]

export function getSubject(id: string): Subject | undefined {
  return subjects.find(subject => subject.id === id)
}
