import { type AttributeResult, compareEntries } from './compare.js'
import { findEntry } from './search.js'
import type { Entry, Subject } from './types.js'

// Erreur « normale » de jeu (nom inconnu, déjà proposé...) : à afficher au joueur, pas un bug
export class GameError extends Error {}

export type GameStatus = 'playing' | 'won' | 'lost' | 'abandoned'

export interface Guess {
  entry: Entry
  playerId: string
  results: AttributeResult[]
  correct: boolean
}

// De quoi sauvegarder une partie et la recharger après un redémarrage
export interface GameSnapshot {
  subjectId: string
  targetId: string
  day: string
  guesses: { entryId: string, playerId: string }[]
  status: GameStatus
}

// Une partie : une cible à trouver, des propositions faites par un ou plusieurs joueurs (coop)
export class Game {
  readonly guesses: Guess[] = []
  private _status: GameStatus = 'playing'

  // day : le jour (AAAA-MM-JJ) de la partie du jour
  constructor(readonly subject: Subject, readonly target: Entry, readonly day: string) {}

  // Les propositions sont rejouées pour recalculer les indices
  static restore(snapshot: GameSnapshot, getSubject: (id: string) => Subject | undefined): Game {
    const subject = getSubject(snapshot.subjectId)
    if (!subject)
      throw new Error(`Sujet ${snapshot.subjectId} introuvable`)
    const game = new Game(subject, findById(subject, snapshot.targetId), snapshot.day)
    for (const { entryId, playerId } of snapshot.guesses)
      game.play(findById(subject, entryId), playerId)
    if (snapshot.status === 'abandoned')
      game.abandon()
    return game
  }

  get status(): GameStatus {
    return this._status
  }

  get remainingGuesses(): number | null {
    return this.subject.maxGuesses === undefined ? null : this.subject.maxGuesses - this.guesses.length
  }

  get guessedIds(): ReadonlySet<string> {
    return new Set(this.guesses.map(guess => guess.entry.id))
  }

  guess(query: string, playerId: string): Guess {
    if (this._status !== 'playing')
      throw new GameError('La partie est terminée.')
    const entry = findEntry(this.subject, query)
    if (!entry)
      throw new GameError(`« ${query} » ne fait pas partie du quiz ${this.subject.name}.`)
    if (this.guessedIds.has(entry.id))
      throw new GameError(`${entry.name} a déjà été proposé.`)
    return this.play(entry, playerId)
  }

  abandon(): void {
    if (this._status === 'playing')
      this._status = 'abandoned'
  }

  toSnapshot(): GameSnapshot {
    return {
      subjectId: this.subject.id,
      targetId: this.target.id,
      day: this.day,
      guesses: this.guesses.map(guess => ({ entryId: guess.entry.id, playerId: guess.playerId })),
      status: this._status,
    }
  }

  private play(entry: Entry, playerId: string): Guess {
    const correct = entry.id === this.target.id
    const guess: Guess = { entry, playerId, results: compareEntries(this.subject.attributes, entry, this.target), correct }
    this.guesses.push(guess)
    if (correct)
      this._status = 'won'
    else if (this.remainingGuesses === 0)
      this._status = 'lost'
    return guess
  }
}

function findById(subject: Subject, id: string): Entry {
  const entry = subject.entries.find(candidate => candidate.id === id)
  if (!entry)
    throw new Error(`Entrée ${id} introuvable dans le sujet ${subject.id}`)
  return entry
}
