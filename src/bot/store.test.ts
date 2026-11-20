import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pokemon } from '../subjects/pokemon/index.js'
import { subjects } from '../subjects/registry.js'
import { DailyDraw } from './daily.js'
import { GameStore } from './store.js'

describe('DailyDraw et GameStore', () => {
  let dir: string
  let file: URL

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'quizdle-'))
    file = pathToFileURL(join(dir, 'state', 'daily.json'))
  })

  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('refait le tirage d\'un sujet seulement si on retire sa réponse du jour', () => {
    const daily = DailyDraw.load(file, '2026-11-19')
    const store = new GameStore(daily)
    const target = daily.target(pokemon)
    const other = pokemon.entries.find(entry => entry.id !== target.id)!

    expect(store.redrawIfTarget(pokemon, other.id)).toBe(false)
    expect(daily.target(pokemon).id).toBe(target.id)
    expect(store.redrawIfTarget(pokemon, target.id)).toBe(true)
    expect(daily.target(pokemon).id).not.toBe(target.id)
    expect(DailyDraw.load(file, '2026-11-19').target(pokemon).id).toBe(daily.target(pokemon).id)
  })

  it('garde la réponse du jour après un redémarrage, mais pas les parties', () => {
    const daily = DailyDraw.load(file, '2026-11-19')
    const target = new GameStore(daily).startDaily('salon', pokemon).target

    const reloaded = DailyDraw.load(file, '2026-11-19')
    expect(reloaded.target(pokemon).id).toBe(target.id)
    expect(reloaded.ensureDay('2026-11-19')).toBe(false)
    expect(new GameStore(reloaded).get('salon')).toBeUndefined()
  })

  it('oublie au chargement les sujets qui n\'existent plus', () => {
    DailyDraw.load(file, '2026-11-19')
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    saved.targets.ancien = '1'
    writeFileSync(file, JSON.stringify(saved))

    DailyDraw.load(file, '2026-11-19').redraw() // redraw pour forcer une sauvegarde
    const cleaned = JSON.parse(readFileSync(file, 'utf8'))
    expect(Object.keys(cleaned.targets)).toEqual(subjects.map(subject => subject.id))
  })

  it('nouveau tirage au changement de jour, jamais deux fois de suite la même réponse', () => {
    const daily = DailyDraw.load(file, '2026-11-01')
    const store = new GameStore(daily)
    let previous = store.startDaily('salon', pokemon).target.id
    for (let day = 2; day <= 30; day++) {
      expect(daily.ensureDay(`2026-11-${String(day).padStart(2, '0')}`)).toBe(true)
      expect(store.playedToday('salon', pokemon.id)).toBe(false)
      const target = store.startDaily('salon', pokemon).target.id
      expect(target).not.toBe(previous)
      previous = target
    }
  })

  it('une seule partie du jour par salon et par sujet', () => {
    const store = new GameStore(DailyDraw.load(file, '2026-11-19'))
    store.startDaily('salon', pokemon)
    expect(store.playedToday('salon', pokemon.id)).toBe(true)
    expect(store.playedToday('autre salon', pokemon.id)).toBe(false)
  })

  it('reset : oublie les parties du jour', () => {
    const store = new GameStore(DailyDraw.load(file, '2026-11-19'))
    store.startDaily('salon', pokemon)
    store.reset()
    expect(store.get('salon')).toBeUndefined()
    expect(store.playedToday('salon', pokemon.id)).toBe(false)
  })
})
