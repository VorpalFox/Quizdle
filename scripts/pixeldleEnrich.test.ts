import { describe, expect, it } from 'vitest'
import { infobox, infoboxValues, morePlaces, parseGender, parsePlaces, parseSpecies, stripTimelines } from './pixeldleEnrich.js'

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

describe('parsePlaces', () => {
  it('ChampPays_TelQuelOuTraduit', () => {
    expect(parsePlaces('Japanese')).toEqual(['Japan'])
    expect(parsePlaces('Hyrule')).toEqual(['Hyrule'])
  })

  it('LieuReel_GardeAvecSonPays', () => {
    expect(parsePlaces('Arcadia Bay, Oregon, United States')).toEqual(['Arcadia Bay', 'Oregon', 'United States'])
    expect(parsePlaces('London')).toEqual(['London', 'United Kingdom'])
    expect(parsePlaces('American')).toEqual(['United States'])
  })

  it('LieuxDeFiction_TousGardes', () => {
    expect(parsePlaces('Night City')).toEqual(['Night City'])
    expect(parsePlaces('Pallet Town, Kanto')).toEqual(['Pallet Town', 'Kanto'])
  })

  it('GentileOuPasUnLieu_LieuOuRetire', () => {
    expect(parsePlaces('Deponian')).toEqual(['Deponia'])
    expect(parsePlaces('CyberLife')).toEqual([])
  })
})

describe('morePlaces', () => {
  it('LieuxDuWiki_AjoutesAWikidata', () => {
    expect(morePlaces(['Japan'], ['Kamurocho', 'Japan'])).toEqual([['nationality', ['Japan', 'Kamurocho']]])
    expect(morePlaces(null, ['Hyrule'])).toEqual([['nationality', ['Hyrule']]])
  })

  it('RienDeNouveau_RienAjoute', () => {
    expect(morePlaces(['Hyrule'], ['hyrule'])).toEqual([])
  })
})

describe('infoboxValues', () => {
  it('VilleEtRegion_LesDeux', () => {
    expect(infoboxValues({ hometown: 'Pallet Town', region: 'Kanto' }, new Map()).nationality).toEqual(['Pallet Town', 'Kanto'])
  })
})
