import { describe, expect, it } from 'vitest'
import { deduceHabitats, encounterHabitat, habitatVotes } from '../pokemonHabitat.js'

describe('encounterHabitat', () => {
  it('Methode_PrimeSurLeLieu', () => {
    expect(encounterHabitat({ area: 'johto-route-33-area', method: 'headbutt' })).toBe('forest')
    expect(encounterHabitat({ area: 'johto-sea-route-41-area', method: 'surf' })).toBe('sea')
    expect(encounterHabitat({ area: 'lake-verity-area', method: 'old-rod' })).toBe('waters-edge')
  })

  it('Lieu_PremiereRegleQuiCorrespond', () => {
    expect(encounterHabitat({ area: 'mt-moon-1f', method: 'walk' })).toBe('mountain')
    expect(encounterHabitat({ area: 'wayward-cave-1f', method: 'walk' })).toBe('cave')
    expect(encounterHabitat({ area: 'eterna-forest-area', method: 'walk' })).toBe('forest')
    expect(encounterHabitat({ area: 'sinnoh-route-201-area', method: 'walk' })).toBe('grassland')
    expect(encounterHabitat({ area: 'giants-cap-main', method: 'walk' })).toBe('grassland')
  })

  it('DonOuRaid_Ignore', () => {
    expect(encounterHabitat({ area: 'nuvema-town-area', method: 'gift' })).toBeNull()
    expect(encounterHabitat({ area: 'giants-bed-den', method: 'max-raid' })).toBeNull()
  })
})

describe('habitatVotes', () => {
  it('UnLieuDansPlusieursJeux_UneSeuleVoix', () => {
    const votes = habitatVotes([
      { area: 'sinnoh-route-201-area', method: 'walk' },
      { area: 'sinnoh-route-201-area', method: 'walk' },
      { area: 'eterna-forest-area', method: 'walk' },
    ])
    expect(Object.fromEntries(votes)).toEqual({ grassland: 1, forest: 1 })
  })

  it('UnQuartDeLieuxMarins_ToutEnMer', () => {
    const votes = habitatVotes([
      { area: 'sinnoh-sea-route-220-area', method: 'surf' },
      { area: 'lake-verity-area', method: 'surf' },
      { area: 'sinnoh-route-203-area', method: 'surf' },
    ])
    expect(Object.fromEntries(votes)).toEqual({ sea: 3 })
  })
})

describe('deduceHabitats', () => {
  it('VotesSerres_PlusieursHabitats', () => {
    const encounters = ['a', 'b', 'c'].map(name => ({ area: `${name}-forest`, method: 'walk' }))
      .concat(['d', 'e'].map(name => ({ area: `sinnoh-route-2${name}`, method: 'walk' })))
    expect(deduceHabitats(encounters, false, 'bug')).toEqual(['forest', 'grassland'])
  })

  it('SansLieu_RareOuSelonLeType', () => {
    expect(deduceHabitats([], true, 'psychic')).toEqual(['rare'])
    expect(deduceHabitats([], false, 'water')).toEqual(['waters-edge'])
  })
})
