import { Game } from '../engine/game.js'
import type { Subject } from '../engine/types.js'
import type { DailyDraw } from './daily.js'

const PLAYED_KEY = (channelId: string, subjectId: string) => `${channelId}:${subjectId}`

// Les parties, en mémoire seulement : un redémarrage les efface, et le salon peut relancer
// la partie du jour (même réponse, puisque le tirage, lui, est sauvegardé).
export class GameStore {
  // salon → dernière partie lancée, finie ou pas
  private readonly games = new Map<string, Game>()
  // salon:sujet → dernier jour où la partie du jour a été lancée
  private readonly played = new Map<string, string>()

  constructor(private readonly daily: DailyDraw) {}

  startDaily(channelId: string, subject: Subject): Game {
    const game = new Game(subject, this.daily.target(subject), this.daily.day)
    this.games.set(channelId, game)
    this.played.set(PLAYED_KEY(channelId, subject.id), this.daily.day)
    return game
  }

  get(channelId: string): Game | undefined {
    return this.games.get(channelId)
  }

  playedToday(channelId: string, subjectId: string): boolean {
    return this.played.get(PLAYED_KEY(channelId, subjectId)) === this.daily.day
  }

  // Debug : nouveau tirage pour aujourd'hui et on oublie toutes les parties
  reset(): void {
    this.daily.redraw()
    this.games.clear()
    this.played.clear()
  }
}
