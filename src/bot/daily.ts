import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { randomEntry } from '../engine/pick.js'
import type { Entry, Subject } from '../engine/types.js'
import { getSubject, subjects } from '../subjects/registry.js'

// state/ à la racine, même chemin relatif depuis src/bot et dist/bot
export const DAILY_FILE = new URL('../../state/daily.json', import.meta.url)

interface SavedDaily {
  day: string
  // sujet → id de la réponse du jour
  targets: Record<string, string>
}

// La réponse du jour de chaque sujet : la seule chose sauvegardée sur disque.
// Le tirage n'est refait qu'au changement de jour (au démarrage ou à minuit), jamais à chaque partie.
export class DailyDraw {
  private _day = ''
  private readonly targets = new Map<string, Entry>()

  private constructor(private readonly file: URL) {}

  static load(file: URL, today: string): DailyDraw {
    const daily = new DailyDraw(file)
    if (existsSync(file))
      daily.restore(JSON.parse(readFileSync(file, 'utf8')) as SavedDaily)
    daily.ensureDay(today)
    return daily
  }

  get day(): string {
    return this._day
  }

  target(subject: Subject): Entry {
    return this.targets.get(subject.id)!
  }

  // Nouveau tirage si on a changé de jour (ou s'il manque la réponse d'un sujet). Renvoie true si on a tiré.
  ensureDay(today: string): boolean {
    const missing = subjects.filter(subject => this._day !== today || !this.targets.has(subject.id))
    if (missing.length === 0)
      return false
    this._day = today
    for (const subject of missing)
      this.draw(subject)
    this.save()
    return true
  }

  // Debug : nouveau tirage pour aujourd'hui
  redraw(): void {
    for (const subject of subjects)
      this.draw(subject)
    this.save()
  }

  private draw(subject: Subject): void {
    // pas deux fois de suite la même réponse : on exclut celle d'avant (celle de la veille, ou d'avant le reset)
    const previous = this.targets.get(subject.id)
    this.targets.set(subject.id, randomEntry(subject, new Set(previous ? [previous.id] : [])))
  }

  // Écrit dans un fichier temporaire puis renomme : pas de fichier à moitié écrit si le bot s'arrête pile à ce moment
  private save(): void {
    const saved: SavedDaily = {
      day: this._day,
      targets: Object.fromEntries([...this.targets].map(([subjectId, entry]) => [subjectId, entry.id])),
    }
    mkdirSync(new URL('.', this.file), { recursive: true })
    const temp = new URL(`${this.file.href}.tmp`)
    writeFileSync(temp, JSON.stringify(saved, null, 2))
    renameSync(temp, this.file)
  }

  // Les sujets qui n'existent plus sont oubliés, et une réponse disparue des données sera retirée
  private restore(saved: SavedDaily): void {
    this._day = saved.day
    for (const [subjectId, entryId] of Object.entries(saved.targets)) {
      const entry = getSubject(subjectId)?.entries.find(candidate => candidate.id === entryId)
      if (entry)
        this.targets.set(subjectId, entry)
    }
  }
}
