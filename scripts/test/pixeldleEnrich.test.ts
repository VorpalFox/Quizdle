import { describe, expect, it } from 'vitest'
import { birthPlaces, disambiguationTitles, infobox, infoboxValues, morePlaces, parseGender, parsePlaces, parseSpecies, stripTimelines } from '../pixeldleEnrich.js'

describe('infobox', () => {
  it('ImagesEtDrapeaux_Retires', () => {
    expect(infobox('{{Character|nationality = [[File:Flag of the United States.svg|border|20px]] American}}')?.nationality).toBe('American')
    expect(infobox('{{Character|species = [[File:Nobody.png|20px]] Human / [[Nobody]]}}')?.species).toBe('Human / Nobody')
    expect(infobox('{{Infobox|nationality = {{flag|ch}} Swiss}}')?.nationality).toBe('Swiss')
  })
})

describe('disambiguationTitles', () => {
  const alena = '{{Disambig}}\n*[[Alena (Princess Alena)]]\n*[[Alena (Dragon Quest IV)]]\n*[[Alena\'s dress]]\n*[[Alena (manga)|Alena]]'

  it('suit les liens « Nom (…) », ceux qui citent la franchise d\'abord, sans les adaptations', () => {
    expect(disambiguationTitles(alena, 'Alena', 'Dragon Quest')).toEqual(['Alena (Dragon Quest IV)', 'Alena (Princess Alena)'])
    expect(disambiguationTitles('\'\'\'Psaro\'\'\' may refer to:\n*[[Psaro the Manslayer]]\n*[[Psaro (character)]]', 'Psaro', 'Dragon Quest')).toEqual(['Psaro (character)'])
  })

  it("rien si ce n'est pas une page d'homonymie", () => {
    expect(disambiguationTitles('{{Character|Name = Alena}} [[Alena (Dragon Quest IV)]]', 'Alena', 'Dragon Quest')).toEqual([])
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
    expect(parseGender('She/Her')).toBe('Female')
    expect(parseGender('he/him')).toBe('Male')
    expect(parseGender('They/Them')).toBe('Other')
    expect(parseGender('Player\'s choice')).toBe("Player's choice")
    expect(parseGender('Genderless, referred to as female')).toBe('Genderless')
    expect(parseGender('N/A (Programmed as male)')).toBe('Genderless')
    expect(parseGender('Feminine Programming')).toBe('Female')
    expect(parseGender('Unspecified')).toBeNull()
  })
})

describe('parseSpecies', () => {
  it('Anglais_Traduit', () => {
    expect(parseSpecies('Human / Nobody')).toBe('Human')
    expect(parseSpecies('Dinosaur')).toBe('Dinosaur')
  })
})

describe('birthPlaces', () => {
  it('DateEtLieu_LeLieu', () => {
    expect(birthPlaces('October 25, 1379, Vigrid')).toEqual(['Vigrid'])
    expect(birthPlaces('2473, Tarsonis')).toEqual(['Tarsonis'])
  })

  it('DateSeule_Rien', () => {
    expect(birthPlaces('circa, 1852')).toEqual([])
    expect(birthPlaces('Mid to late 19th Century')).toEqual([])
    expect(birthPlaces('1986: development start, May 200-: activation')).toEqual([])
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

  it('Naissance_LieuEnPremier', () => {
    expect(infoboxValues({ born: 'October 25, 1379, Vigrid', region: 'Europe' }, new Map()).nationality).toEqual(['Vigrid', 'Europe'])
  })

  it('InconnuEnToutesLettres_Marque', () => {
    expect(infoboxValues({ hair: 'Unknown', occupation: 'Scientist', origin: '?' }, new Map()).unknown).toEqual(['nationality', 'hair'])
    expect(infoboxValues({ occupation: 'Scientist' }, new Map()).unknown).toBeUndefined()
    expect(infoboxValues({ born: 'Unknown' }, new Map()).unknown).toBeUndefined()
  })

  it('AucuneOccupationEnToutesLettres_None', () => {
    expect(infoboxValues({ occupation: 'None', rank: 'Commander' }, new Map()).occupation).toEqual(['None'])
    expect(infoboxValues({ occupation: 'N/A', behavior: 'Hostile' }, new Map()).occupation).toEqual(['None'])
  })

  it('SansOccupation_GradeOuClasse', () => {
    expect(infoboxValues({ rank: 'Commander' }, new Map()).occupation).toEqual(['Soldier'])
    expect(infoboxValues({ occupation: 'Scientist', rank: 'Commander' }, new Map()).occupation).toEqual(['Scientist'])
  })

  it('CreatureHostile_Predateur', () => {
    expect(infoboxValues({ behavior: 'Hostile' }, new Map()).occupation).toEqual(['Predator'])
    expect(infoboxValues({ behavior: 'Passive' }, new Map()).occupation).toBeUndefined()
  })

  it('SeulementLocation_DernierRecours', () => {
    expect(infoboxValues({ location: 'Diamond City, Sanctuary, Vault 111' }, new Map()).nationality).toEqual(['Diamond City', 'Sanctuary'])
    expect(infoboxValues({ location: 'Diamond City', hometown: 'Boston' }, new Map()).nationality).toEqual(['Boston', 'United States'])
  })
})
