import { describe, expect, it } from 'vitest'
import { infobox, parseGender, parseNationality, parsePlace, parseSpecies, stripTimelines } from './pixeldleEnrich.js'

describe('infobox', () => {
  it('ImagesEtDrapeaux_Retires', () => {
    expect(infobox('{{Character|nationality = [[File:Flag of the United States.svg|border|20px]] American}}')?.nationality).toBe('American')
    expect(infobox('{{Character|species = [[File:Nobody.png|20px]] Human / [[Nobody]]}}')?.species).toBe('Human / Nobody')
    expect(infobox('{{Infobox|nationality = {{flag|ch}} Swiss}}')?.nationality).toBe('Swiss')
  })
})

describe('stripTimelines', () => {
  it('PrefixesMortalKombat_Retires', () => {
    expect(stripTimelines('1st and 2nd Timelines:, Human/Cryomancer, 3rd Timeline:, Human/Pyromancer')).toBe('Human/Cryomancer, Human/Pyromancer')
    expect(stripTimelines('1stTimeline: Edenian')).toBe('Edenian')
  })
})

describe('parseGender', () => {
  it('PronomsEtChoix_NosValeurs', () => {
    expect(parseGender('She/Her')).toBe('Femme')
    expect(parseGender('he/him')).toBe('Homme')
    expect(parseGender('They/Them')).toBe('Autre')
    expect(parseGender('Player\'s choice')).toBe('Au choix')
    expect(parseGender('Genderless, referred to as female')).toBe('Aucun')
    expect(parseGender('N/A (Programmed as male)')).toBe('Aucun')
    expect(parseGender('Feminine Programming')).toBe('Femme')
    expect(parseGender('Unspecified')).toBeNull()
  })
})

describe('parseSpecies', () => {
  it('Anglais_Traduit', () => {
    expect(parseSpecies('Human / Nobody')).toBe('Humain')
    expect(parseSpecies('Dinosaur')).toBe('Dinosaure')
  })
})

describe('parseNationality', () => {
  it('ChampPays_TelQuelOuTraduit', () => {
    expect(parseNationality('Japanese')).toBe('Japon')
    expect(parseNationality('Hyrule')).toBe('Hyrule')
  })
})

describe('parsePlace', () => {
  it('Ville_SonPays', () => {
    expect(parsePlace('Seattle, Washington, United States')).toBe('États-Unis')
    expect(parsePlace('London')).toBe('Royaume-Uni')
  })

  it('LieuDeFiction_TelQuel', () => {
    expect(parsePlace('Night City')).toBe('Night City')
  })
})
