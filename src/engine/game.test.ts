import { describe, expect, it } from 'vitest'
import { compareValues } from './compare.js'
import { Game, GameError } from './game.js'
import { dayKey, randomEntry } from './pick.js'
import { findEntry, isOneTypoAway, searchEntries } from './search.js'
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

  it('isOneTypoAway : une lettre changée, ajoutée, enlevée ou deux voisines inversées', () => {
    expect(isOneTypoAway('roocool', 'roucool')).toBe(true)
    expect(isOneTypoAway('ratattac', 'rattatac')).toBe(true)
    expect(isOneTypoAway('salamch', 'salameche')).toBe(false)
    expect(isOneTypoAway('salamche', 'salameche')).toBe(true)
    expect(isOneTypoAway('salamechee', 'salameche')).toBe(true)
    expect(isOneTypoAway('salamehce', 'salameche')).toBe(true)
    expect(isOneTypoAway('slamaeche', 'salameche')).toBe(false)
    expect(isOneTypoAway('salameche', 'salameche')).toBe(false)
  })

  it('tolère une faute, sauf sur les noms courts ou si deux entrées collent', () => {
    expect(findEntry(fruits, 'citrn')?.id).toBe('citron')
    expect(findEntry(fruits, 'Cirton')?.id).toBe('citron')
    expect(findEntry(fruits, 'kiwo')?.id).toBe('kiwi')
    const more: Subject = { ...fruits, entries: [...fruits.entries, { id: 'poire', name: 'Poire', attributes: {} }, { id: 'mure', name: 'Mûr', attributes: {} }] }
    expect(findEntry(more, 'mir')).toBeUndefined() // 3 lettres tapées : trop court pour une faute
    expect(findEntry(more, 'murr')?.id).toBe('mure') // 4 lettres tapées : ok, même vers un nom de 3
    expect(findEntry(more, 'poime')).toBeUndefined() // pomme ou poire ?
    expect(findEntry(more, 'pomme')?.id).toBe('pomme') // l'exact passe avant
  })

  it('autocomplétion : préfixes avant les contenus, exclut les déjà proposés', () => {
    expect(searchEntries(fruits, 'c', 10).map(e => e.id)).toEqual(['citron', 'peche'])
    expect(searchEntries(fruits, '', 10, new Set(['pomme'])).map(e => e.id)).toEqual(['citron', 'peche', 'kiwi'])
  })
})

describe('Game', () => {
  const target = fruits.entries[0]! // Pomme
  const DAY = '2026-11-19'

  it('compare chaque attribut et gagne sur la bonne réponse', () => {
    const game = new Game(fruits, target, DAY)
    const guess = game.guess('Pêche', 'alice')
    expect(guess.correct).toBe(false)
    expect(guess.results.map(r => r.feedback)).toEqual(['partial', 'wrong', 'correct'])
    expect(game.guess('pomme', 'bob').correct).toBe(true)
    expect(game.status).toBe('won')
    expect(() => game.guess('Kiwi', 'alice')).toThrow(GameError)
  })

  it('refuse un inconnu ou un doublon sans consommer d\'essai', () => {
    const game = new Game(fruits, target, DAY)
    game.guess('Kiwi', 'alice')
    expect(() => game.guess('kiwi', 'bob')).toThrow(GameError)
    expect(() => game.guess('banane', 'bob')).toThrow(GameError)
    expect(game.remainingGuesses).toBe(2)
  })

  it('perd une fois les essais épuisés', () => {
    const game = new Game(fruits, target, DAY)
    game.guess('Kiwi', 'a')
    game.guess('Citron', 'a')
    game.guess('Pêche', 'a')
    expect(game.status).toBe('lost')
  })
})

describe('tirage', () => {
  it('randomEntry : évite les entrées exclues, et repart sur tout si tout est exclu', () => {
    expect(randomEntry(fruits, new Set(['pomme', 'citron', 'peche'])).id).toBe('kiwi')
    expect(randomEntry(fruits, new Set(['pomme', 'citron', 'peche', 'kiwi']), () => 0).id).toBe('pomme')
  })

  it('dayKey : le jour change à minuit heure de Paris, pas à minuit UTC', () => {
    expect(dayKey(new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-20')
    expect(dayKey(new Date('2026-11-19T22:30:00Z'))).toBe('2026-11-19')
  })
})

describe('sauvegarde', () => {
  it('une partie rechargée retrouve ses propositions et son statut', () => {
    const game = new Game(fruits, fruits.entries[0]!, '2026-11-19')
    game.guess('Kiwi', 'alice')
    game.guess('Citron', 'bob')
    game.abandon()

    const restored = Game.restore(JSON.parse(JSON.stringify(game.toSnapshot())), id => (id === fruits.id ? fruits : undefined))
    expect(restored.day).toBe('2026-11-19')
    expect(restored.status).toBe('abandoned')
    expect(restored.guesses.map(g => [g.entry.id, g.playerId])).toEqual([['kiwi', 'alice'], ['citron', 'bob']])
    expect(restored.remainingGuesses).toBe(1)
  })
})
