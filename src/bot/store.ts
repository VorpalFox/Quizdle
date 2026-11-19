import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { Game, type GameSnapshot } from '../engine/game.js'
import { getSubject } from '../subjects/registry.js'

// state/ à la racine, même chemin relatif depuis src/bot et dist/bot
export const STATE_FILE = new URL('../../state/games.json', import.meta.url)

const DAILY_KEY = (channelId: string, subjectId: string) => `${channelId}:${subjectId}`

interface SavedState {
  games: Record<string, GameSnapshot>
  dailies: Record<string, string>
}

// Une partie par salon (la dernière lancée, finie ou pas), sauvegardée sur disque pour survivre à un redémarrage
export class GameStore {
  private readonly games = new Map<string, Game>()
  // dernier jour où le quiz du jour a été lancé, par salon et par sujet
  private readonly dailies = new Map<string, string>()

  private constructor(private readonly file: URL) {}

  static load(file: URL): GameStore {
    const store = new GameStore(file)
    if (!existsSync(file))
      return store
    const saved = JSON.parse(readFileSync(file, 'utf8')) as SavedState
    for (const [channelId, snapshot] of Object.entries(saved.games)) {
      // un sujet ou une entrée a pu disparaître des données entre-temps : on laisse tomber la partie
      try {
        store.games.set(channelId, Game.restore(snapshot, getSubject))
      } catch (error) {
        console.warn(`Partie du salon ${channelId} ignorée au chargement`, error)
      }
    }
    for (const [key, day] of Object.entries(saved.dailies))
      store.dailies.set(key, day)
    return store
  }

  get(channelId: string): Game | undefined {
    return this.games.get(channelId)
  }

  start(channelId: string, game: Game): void {
    this.games.set(channelId, game)
    if (game.day)
      this.dailies.set(DAILY_KEY(channelId, game.subject.id), game.day)
    this.save()
  }

  dailyPlayed(channelId: string, subjectId: string, day: string): boolean {
    return this.dailies.get(DAILY_KEY(channelId, subjectId)) === day
  }

  // Écrit dans un fichier temporaire puis renomme : pas de fichier à moitié écrit si le bot s'arrête pile à ce moment
  save(): void {
    const state: SavedState = {
      games: Object.fromEntries([...this.games].map(([channelId, game]) => [channelId, game.toSnapshot()])),
      dailies: Object.fromEntries(this.dailies),
    }
    mkdirSync(new URL('.', this.file), { recursive: true })
    const temp = new URL(`${this.file.href}.tmp`)
    writeFileSync(temp, JSON.stringify(state))
    renameSync(temp, this.file)
  }
}
