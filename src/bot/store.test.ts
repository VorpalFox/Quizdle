import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pokemon } from '../subjects/pokemon/index.js'
import { GameStore } from './store.js'

describe('GameStore', () => {
  let dir: string
  let file: URL

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'quizdle-'))
    file = pathToFileURL(join(dir, 'state', 'games.json'))
  })

  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('garde le tirage du jour et les parties après un redémarrage', () => {
    const store = GameStore.load(file, '2026-11-19')
    const game = store.startDaily('salon', pokemon)
    game.guess('Pikachu', 'alice')
    store.save()

    const reloaded = GameStore.load(file, '2026-11-19')
    expect(reloaded.get('salon')?.target.id).toBe(game.target.id)
    expect(reloaded.get('salon')?.guesses.map(g => g.entry.name)).toEqual(['Pikachu'])
    expect(reloaded.playedToday('salon', pokemon.id)).toBe(true)
    expect(reloaded.ensureDay('2026-11-19')).toBe(false)
  })

  it('nouveau tirage au changement de jour, sans retomber sur une ancienne cible', () => {
    const store = GameStore.load(file, '2026-11-01')
    const targets = new Set([store.startDaily('salon', pokemon).target.id])
    for (let day = 2; day <= 30; day++) {
      expect(store.ensureDay(`2026-11-${String(day).padStart(2, '0')}`)).toBe(true)
      expect(store.playedToday('salon', pokemon.id)).toBe(false)
      targets.add(store.startDaily(`salon${day}`, pokemon).target.id)
    }
    expect(targets.size).toBe(30)
  })

  it('reset : oublie les parties du jour', () => {
    const store = GameStore.load(file, '2026-11-19')
    store.startDaily('salon', pokemon)
    store.reset()
    expect(store.get('salon')).toBeUndefined()
    expect(store.playedToday('salon', pokemon.id)).toBe(false)
  })
})
