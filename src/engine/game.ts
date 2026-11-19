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

// Une partie : une cible à trouver, des propositions faites par un ou plusieurs joueurs (coop)
export class Game {
  readonly guesses: Guess[] = []
  private _status: GameStatus = 'playing'

  // day : le jour (AAAA-MM-JJ) de la partie du jour
  constructor(readonly subject: Subject, readonly target: Entry, readonly day: string) {}

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

    const correct = entry.id === this.target.id
    const guess: Guess = { entry, playerId, results: compareEntries(this.subject.attributes, entry, this.target), correct }
    this.guesses.push(guess)
    if (correct)
      this._status = 'won'
    else if (this.remainingGuesses === 0)
      this._status = 'lost'
    return guess
  }

  abandon(): void {
    if (this._status === 'playing')
      this._status = 'abandoned'
  }
}
