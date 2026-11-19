import { describe, expect, it } from 'vitest'
import { compareValues } from './compare.js'
import { Game, GameError } from './game.js'
import { dailyEntry } from './pick.js'
import { findEntry, searchEntries } from './search.js'
import type { Subject } from './types.js'

// Sujet inventé : le moteur ne doit rien savoir des Pokémon
const fruits: Subject = {
  id: 'fruits',
  name: 'Fruits',
  description: 'Trouve le fruit',
  maxGuesses: 3,
  attributes: [
    { key: 'colors', label: 'Couleurs', kind: 'set' },
    { key: 'season', label: 'Saison', kind: 'exact' },
    { key: 'weight', label: 'Poids', kind: 'number' },
  ],
  entries: [
    { id: 'pomme', name: 'Pomme', attributes: { colors: ['Rouge', 'Vert'], season: 'Automne', weight: 150 } },
    { id: 'citron', name: 'Citron', aliases: ['lemon'], attributes: { colors: ['Jaune'], season: 'Hiver', weight: 100 } },
    { id: 'peche', name: 'Pêche', attributes: { colors: ['Rouge', 'Jaune'], season: 'Été', weight: 150 } },
    { id: 'kiwi', name: 'Kiwi', attributes: { colors: ['Vert'], season: 'Hiver', weight: null } },
  ],
}

describe('compareValues', () => {
  it('exact', () => {
    expect(compareValues('exact', 'Hiver', 'Hiver')).toBe('correct')
    expect(compareValues('exact', 'Été', 'Hiver')).toBe('wrong')
    expect(compareValues('exact', null, null)).toBe('correct')
  })

  it('set', () => {
    expect(compareValues('set', ['Vert', 'Rouge'], ['Rouge', 'Vert'])).toBe('correct')
    expect(compareValues('set', ['Rouge', 'Jaune'], ['Rouge', 'Vert'])).toBe('partial')
    expect(compareValues('set', ['Rouge'], ['Rouge', 'Vert'])).toBe('partial')
    expect(compareValues('set', ['Jaune'], ['Vert'])).toBe('wrong')
  })

  it('number : la flèche indique où est la cible', () => {
    expect(compareValues('number', 100, 150)).toBe('higher')
    expect(compareValues('number', 150, 100)).toBe('lower')
    expect(compareValues('number', 150, 150)).toBe('correct')
    expect(compareValues('number', null, 150)).toBe('wrong')
  })
})

describe('recherche', () => {
  it('ignore accents, casse et ponctuation, accepte les alias', () => {
    expect(findEntry(fruits, 'peche')?.id).toBe('peche')
    expect(findEntry(fruits, ' PÊCHE! ')?.id).toBe('peche')
    expect(findEntry(fruits, 'Lemon')?.id).toBe('citron')
    expect(findEntry(fruits, 'banane')).toBeUndefined()
  })

  it('autocomplétion : préfixes avant les contenus, exclut les déjà proposés', () => {
    expect(searchEntries(fruits, 'c', 10).map(e => e.id)).toEqual(['citron', 'peche'])
    expect(searchEntries(fruits, '', 10, new Set(['pomme'])).map(e => e.id)).toEqual(['citron', 'peche', 'kiwi'])
  })
})

describe('Game', () => {
  const target = fruits.entries[0]! // Pomme

  it('compare chaque attribut et gagne sur la bonne réponse', () => {
    const game = new Game(fruits, target)
    const guess = game.guess('Pêche', 'alice')
    expect(guess.correct).toBe(false)
    expect(guess.results.map(r => r.feedback)).toEqual(['partial', 'wrong', 'correct'])
    expect(game.guess('pomme', 'bob').correct).toBe(true)
    expect(game.status).toBe('won')
    expect(() => game.guess('Kiwi', 'alice')).toThrow(GameError)
  })

  it('refuse un inconnu ou un doublon sans consommer d\'essai', () => {
    const game = new Game(fruits, target)
    game.guess('Kiwi', 'alice')
    expect(() => game.guess('kiwi', 'bob')).toThrow(GameError)
    expect(() => game.guess('banane', 'bob')).toThrow(GameError)
    expect(game.remainingGuesses).toBe(2)
  })

  it('perd une fois les essais épuisés', () => {
    const game = new Game(fruits, target)
    game.guess('Kiwi', 'a')
    game.guess('Citron', 'a')
    game.guess('Pêche', 'a')
    expect(game.status).toBe('lost')
  })
})

it('dailyEntry : même cible pour une même date', () => {
  const day = new Date('2026-11-19T12:00:00Z')
  expect(dailyEntry(fruits, day)).toBe(dailyEntry(fruits, day))
})
