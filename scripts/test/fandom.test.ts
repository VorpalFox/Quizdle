import { describe, expect, it } from 'vitest'
import { fandomInfobox, fandomValues, introOccupations } from '../fandom.js'

const NANAMI = `{{Character Infobox
|name = Kento Nanami
|race = Human
|age = 27{{Ref|vol=3|Profile|name = vol3}}<br>28{{Ref|fan=Fanbook|page=58-61|name=fan1}}
|gender = Male
|hair = Blond
|occupation = [[Jujutsu Sorcerer]]
|weapons = Bandaged [[Blade]]
|affiliation = [[Tokyo Metropolitan Curse Technical College|Tokyo Jujutsu High]]
}}
'''Kento Nanami''' is a jujutsu sorcerer.`

const YURI = `{{Infobox Character
|Gender      = Male
|Hair Color  = Black
|Occupation  = Counterintelligence Officer <small>(Covertly)</small><br>Diplomat <small>(Formerly, Publicly)</small>
}}`

describe('fandomInfobox', () => {
  it('InfoboxFandom_ChampsNettoyes', () => {
    expect(fandomInfobox(NANAMI)).toMatchObject({ hair: 'Blond', gender: 'Male', occupation: 'Jujutsu Sorcerer' })
  })

  it('PageSansInfobox_Null', () => {
    expect(fandomInfobox('{{Quote|Hello}} Just some text')).toBeNull()
  })
})

describe('fandomValues', () => {
  it('ChampsVariables_NosValeurs', () => {
    expect(fandomValues(fandomInfobox(NANAMI)!)).toEqual({ gender: 'Homme', hair: ['Blonds'], occupation: ['Jujutsu Sorcerer'], age: 27, weapon: ['Épéiste'] })
    expect(fandomValues(fandomInfobox(YURI)!)).toEqual({ gender: 'Homme', hair: ['Noirs'], occupation: ['Counterintelligence Officer', 'Diplomat'], age: null, weapon: null })
  })
})

describe('introOccupations', () => {
  it('Intro_RoleTraduitSansLesAdjectifs', () => {
    expect(introOccupations("{{Character Infobox|name = Mutsu}}\n'''Mutsu''' is a young archer who serves Tahoumaru.").occupation).toEqual(['Archer'])
  })

  it('RoleIntraduisibleOuServantDeFate_Ignore', () => {
    expect(introOccupations("'''Iskandar''' is the Rider-class Servant of Waver Velvet.").occupation).toEqual([])
    expect(introOccupations("'''Beldia''' is one of the Devil King's Generals.").occupation).toEqual(['Officier'])
  })
})
