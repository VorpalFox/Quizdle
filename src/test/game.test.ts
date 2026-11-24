import { describe, expect, it } from 'vitest'
import { compareEntries, compareValues } from '../engine/compare.js'
import { Game, GameError } from '../engine/game.js'
import { dayKey, randomEntry } from '../engine/pick.js'
import { displayName, findEntry, homonyms, isOneTypoAway, searchEntries } from '../engine/search.js'
import { NOT_APPLICABLE, type Subject } from '../engine/types.js'

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
  })

  it('cible sans valeur : inconnu, quel que soit le type', () => {
    expect(compareValues('exact', null, null)).toBe('unknown')
    expect(compareValues('exact', 'Hiver', null)).toBe('unknown')
    expect(compareValues('set', ['Rouge'], [])).toBe('unknown')
    expect(compareValues('number', 150, null)).toBe('unknown')
  })

  it('non applicable : juste contre non applicable, faux contre tout le reste, même un nombre', () => {
    expect(compareValues('number', NOT_APPLICABLE, NOT_APPLICABLE)).toBe('correct')
    expect(compareValues('number', 17, NOT_APPLICABLE)).toBe('wrong')
    expect(compareValues('number', NOT_APPLICABLE, 17)).toBe('wrong')
    expect(compareValues('set', [NOT_APPLICABLE], ['Noirs'])).toBe('wrong')
  })

  it('bon perso : tout est juste, même ses indices vides', () => {
    const kiwi = fruits.entries[3]!
    expect(compareEntries(fruits.attributes, kiwi, kiwi).map(r => r.feedback)).toEqual(['correct', 'correct', 'correct'])
    expect(compareEntries(fruits.attributes, fruits.entries[0]!, kiwi).map(r => r.feedback)).toEqual(['partial', 'wrong', 'unknown'])
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

describe('homonymes', () => {
  const persos: Subject = {
    id: 'persos', name: 'Persos', description: 'Trouve le perso', universeKey: 'univers',
    attributes: [{ key: 'univers', label: 'Univers', kind: 'exact' }],
    entries: [
      { id: 'sam-tlou', name: 'Sam', attributes: { univers: 'The Last of Us' } },
      { id: 'sam-sdv', name: 'Sam', attributes: { univers: 'Stardew Valley' } },
      { id: 'elena', name: 'Elena Fisher', aliases: ['Elena'], attributes: { univers: 'Uncharted' } },
      { id: 'elena-sf', name: 'Elena', attributes: { univers: 'Spiritfarer' } },
      { id: 'joel', name: 'Joel', attributes: { univers: 'The Last of Us' } },
    ],
  }

  it('un nom porté par plusieurs : aucun choisi, tous listés', () => {
    expect(findEntry(persos, 'sam')).toBeUndefined()
    expect(homonyms(persos, 'Sam').map(e => e.id)).toEqual(['sam-tlou', 'sam-sdv'])
    expect(homonyms(persos, 'Elena').map(e => e.id)).toEqual(['elena', 'elena-sf'])
    expect(homonyms(persos, 'Joel')).toEqual([])
    expect(findEntry(persos, 'Elena Fisher')?.id).toBe('elena')
    expect(findEntry(persos, 'sam-sdv')?.id).toBe('sam-sdv') // l'id, envoyé par l'autocomplétion
  })

  it('un nom suivi de son univers entre parenthèses : celui-là', () => {
    expect(findEntry(persos, 'Sam (The Last of Us)')?.id).toBe('sam-tlou')
    expect(findEntry(persos, 'sam (stardew)')?.id).toBe('sam-sdv')
    expect(findEntry(persos, 'Joel (The Last of Us)')?.id).toBe('joel')
    expect(homonyms(persos, 'Sam (Stardew Valley)')).toEqual([])
  })

  it('un univers qui ne colle pas : rien', () => {
    expect(findEntry(persos, 'Joel (Stardew Valley)')).toBeUndefined()
    expect(findEntry(persos, 'Sam (xy)')).toBeUndefined() // trop court pour un univers
  })

  it("le nom affiché porte l'univers seulement s'il est partagé", () => {
    expect(displayName(persos, persos.entries[0]!)).toBe('Sam (The Last of Us)')
    expect(displayName(persos, persos.entries[4]!)).toBe('Joel')
    expect(displayName(persos, persos.entries[4]!, true)).toBe('Joel (The Last of Us)')
  })

  it("une proposition ambiguë ne consomme pas d'essai", () => {
    const game = new Game(persos, persos.entries[4]!, '2026-11-22')
    expect(() => game.guess('Sam', 'p1')).toThrow(/Sam \(The Last of Us\) · Sam \(Stardew Valley\)/)
    expect(game.guesses).toHaveLength(0)
    expect(game.guess('sam-sdv', 'p1').entry.id).toBe('sam-sdv')
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
    expect(guess.results[0]!.common).toEqual(['Rouge'])
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
