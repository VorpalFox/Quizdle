import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { Game, type GameSnapshot } from '../engine/game.js'
import { randomEntry } from '../engine/pick.js'
import type { Entry, Subject } from '../engine/types.js'
import { getSubject, subjects } from '../subjects/registry.js'

// state/ à la racine, même chemin relatif depuis src/bot et dist/bot
export const STATE_FILE = new URL('../../state/games.json', import.meta.url)

const PLAYED_KEY = (channelId: string, subjectId: string) => `${channelId}:${subjectId}`

interface SavedState {
  day: string
  // sujet → id de l'entrée du jour
  targets: Record<string, string>
  // sujet → anciennes cibles, pour ne pas retomber dessus avant d'avoir fait le tour
  history: Record<string, string[]>
  // salon → dernière partie lancée, finie ou pas
  games: Record<string, GameSnapshot>
  // salon:sujet → dernier jour où la partie du jour a été lancée
  played: Record<string, string>
}

// Le tirage du jour et les parties, sauvegardés sur disque pour survivre à un redémarrage.
// Le tirage n'est refait qu'au changement de jour (au démarrage ou à minuit), jamais à chaque partie.
export class GameStore {
  private day = ''
  private readonly targets = new Map<string, Entry>()
  private readonly history = new Map<string, string[]>()
  private readonly games = new Map<string, Game>()
  private readonly played = new Map<string, string>()

  private constructor(private readonly file: URL) {}

  static load(file: URL, today: string): GameStore {
    const store = new GameStore(file)
    if (existsSync(file))
      store.restore(JSON.parse(readFileSync(file, 'utf8')) as SavedState)
    store.ensureDay(today)
    return store
  }

  // Nouveau tirage si on a changé de jour (ou s'il manque la cible d'un sujet). Renvoie true si on a tiré.
  ensureDay(today: string): boolean {
    const missing = subjects.filter(subject => this.day !== today || !this.targets.has(subject.id))
    if (missing.length === 0)
      return false
    this.day = today
    for (const subject of missing)
      this.drawTarget(subject)
    this.save()
    return true
  }

  // Debug : nouveau tirage pour aujourd'hui et on oublie toutes les parties
  reset(): void {
    for (const subject of subjects)
      this.drawTarget(subject)
    this.games.clear()
    this.played.clear()
    this.save()
  }

  startDaily(channelId: string, subject: Subject): Game {
    const game = new Game(subject, this.targets.get(subject.id)!, this.day)
    this.games.set(channelId, game)
    this.played.set(PLAYED_KEY(channelId, subject.id), this.day)
    this.save()
    return game
  }

  get(channelId: string): Game | undefined {
    return this.games.get(channelId)
  }

  playedToday(channelId: string, subjectId: string): boolean {
    return this.played.get(PLAYED_KEY(channelId, subjectId)) === this.day
  }

  // Écrit dans un fichier temporaire puis renomme : pas de fichier à moitié écrit si le bot s'arrête pile à ce moment
  save(): void {
    const state: SavedState = {
      day: this.day,
      targets: Object.fromEntries([...this.targets].map(([subjectId, entry]) => [subjectId, entry.id])),
      history: Object.fromEntries(this.history),
      games: Object.fromEntries([...this.games].map(([channelId, game]) => [channelId, game.toSnapshot()])),
      played: Object.fromEntries(this.played),
    }
    mkdirSync(new URL('.', this.file), { recursive: true })
    const temp = new URL(`${this.file.href}.tmp`)
    writeFileSync(temp, JSON.stringify(state))
    renameSync(temp, this.file)
  }

  private drawTarget(subject: Subject): void {
    let history = this.history.get(subject.id) ?? []
    // tout le monde y est passé : on recommence un tour
    if (history.length >= subject.entries.length)
      history = []
    const entry = randomEntry(subject, new Set(history))
    this.history.set(subject.id, [...history, entry.id])
    this.targets.set(subject.id, entry)
  }

  // Un sujet ou une entrée a pu disparaître des données entre-temps : on laisse tomber ce qui ne colle plus
  private restore(saved: SavedState): void {
    this.day = saved.day
    for (const [subjectId, entryId] of Object.entries(saved.targets)) {
      const entry = getSubject(subjectId)?.entries.find(candidate => candidate.id === entryId)
      if (entry)
        this.targets.set(subjectId, entry)
    }
    for (const [subjectId, ids] of Object.entries(saved.history))
      this.history.set(subjectId, ids)
    for (const [channelId, snapshot] of Object.entries(saved.games)) {
      try {
        this.games.set(channelId, Game.restore(snapshot, getSubject))
      } catch (error) {
        console.warn(`Partie du salon ${channelId} ignorée au chargement`, error)
      }
    }
    for (const [key, day] of Object.entries(saved.played))
      this.played.set(key, day)
  }
}
