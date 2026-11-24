import { describe, expect, it } from 'vitest'
import { fandomInfobox, fandomValues } from './fandom.js'

const NANAMI = `{{Character Infobox
|name = Kento Nanami
|race = Human
|age = 27{{Ref|vol=3|Profile|name = vol3}}<br>28{{Ref|fan=Fanbook|page=58-61|name=fan1}}
|gender = Male
|hair = Blond
|occupation = [[Jujutsu Sorcerer]]
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
    expect(fandomValues(fandomInfobox(NANAMI)!)).toEqual({ gender: 'Homme', hair: ['Blonds'], occupation: ['Jujutsu Sorcerer'], age: 27 })
    expect(fandomValues(fandomInfobox(YURI)!)).toEqual({ gender: 'Homme', hair: ['Noirs'], occupation: ['Counterintelligence Officer', 'Diplomat'], age: null })
  })
})
