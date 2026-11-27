import { describe, expect, it } from 'vitest'
import { finishOccupations, manualOccupations, groupOccupations, translateEntries, translateOccupation } from '../translate.js'
import { cleanValue, infoboxFields, mentionsAnime, pageTitles, wikiGender, wikiHair } from '../wikipedia.js'

const SUBARU_FR = `{{Infobox Personnage (fiction)
 | charte couleur      = animanga
 | nom                 = Subaru Natsuki
 | œuvre               = [[Re:Zero]]
 | sexe                = Masculin
 | espèce              = Humain
 | cheveux             = Noir
 | activité            = [[Hikikomori]]<ref>Tome 1</ref>
 | série               = [[Re:Zero]] (anime)
}}
'''Subaru Natsuki''' est le protagoniste du [[light novel]] ''[[Re:Zero]]''.`

const LUFFY_EN = `{{Short description|Fictional character}}
{{Infobox character
| series = [[One Piece]]
| occupation = Pirate (Captain)<!-- pas l'empereur -->
| alias = {{nihongo|Straw Hat|麦わら|Mugiwara}}
| relatives = {{Plainlist|
* [[Monkey D. Dragon]] (father)
* [[Monkey D. Garp]] (grandfather)
}}
}}`

describe('infoboxFields', () => {
  it('InfoboxFR_ChampsNettoyes', () => {
    const fields = infoboxFields(SUBARU_FR)
    expect(fields).toMatchObject({ sexe: 'Masculin', cheveux: 'Noir', activité: 'Hikikomori', œuvre: 'Re:Zero' })
  })

  it('InfoboxEN_ModelesEtCommentaires', () => {
    const fields = infoboxFields(LUFFY_EN)
    expect(fields).toMatchObject({ occupation: 'Pirate (Captain)', alias: 'Straw Hat' })
    expect(fields!.relatives).toBe('Monkey D. Dragon (father), Monkey D. Garp (grandfather)')
  })

  it('SansInfobox_Null', () => {
    expect(infoboxFields('{{Infobox anime}} Un anime')).toBeNull()
  })
})

describe('cleanValue', () => {
  it('LiensEtRetoursALaLigne_TexteSimple', () => {
    expect(cleanValue(' [[Étudiant|Lycéen]]<br>[[Ninja]] ')).toBe('Lycéen, Ninja')
  })
})

describe('wikiGender / wikiHair', () => {
  it('FrEtEn_Traduits', () => {
    expect(wikiGender('Masculin')).toBe('Male')
    expect(wikiGender('Female')).toBe('Female')
    expect(wikiGender('Inconnu')).toBeNull()
    expect(wikiHair('Noir')).toEqual(['Black'])
    expect(wikiHair('Châtain et blanc')).toEqual(['Brown', 'White'])
    expect(wikiHair('White, with light blue tips and green streaks')).toEqual(['White', 'Blue'])
  })
})

describe('mentionsAnime', () => {
  it('LienQuiCommenceLeTitre_Oui', () => {
    expect(mentionsAnime(SUBARU_FR, ['Re:ZERO -Starting Life in Another World-'])).toBe(true)
  })

  it('AutreAnime_Non', () => {
    expect(mentionsAnime(SUBARU_FR, ['One Piece'])).toBe(false)
  })
})

describe('pageTitles', () => {
  it('NomJaponais_DeuxOrdresEtSansVoyellesLongues', () => {
    expect(pageTitles({ full: 'Satoru Gojou', native: null, alternative: [] }))
      .toEqual(['Satoru Gojou', 'Gojou Satoru', 'Satoru Gojo', 'Gojo Satoru'])
  })
})

describe('translateOccupation', () => {
  it('MotCle_RegleGenerique', () => {
    expect(translateOccupation('Leader of the Phantom Troupe')).toBe('Leader')
    expect(translateOccupation('Commander of the Secret Mobile Corps')).toBe('Leader')
    expect(translateOccupation('Gilberta company\'s master')).toBe('Leader')
    expect(translateOccupation('Housemaster of Cecile Hall')).toBe('Teacher')
    expect(translateOccupation('Area Guardian of the Treasury')).toBe('Guardian')
    expect(translateOccupation('Captain of the Black Bulls')).toBe('Captain')
    expect(translateOccupation('Dieu de la mort')).toBe('Shinigami')
    expect(translateOccupation('Étudiant en secondaire')).toBe('Student')
    expect(translateOccupation('Student at U.A. High School')).toBe('Pupil')
  })

  it('DictionnairePrioritaire_PasLaRegle', () => {
    expect(translateOccupation('Real estate agent')).toBe('Real estate agent')
    expect(translateOccupation('Lycoris Agent')).toBe('Secret agent')
  })

  it('DejaEnFrancais_Garde', () => {
    expect(translateOccupation('Guerrier')).toBe('Warrior')
    expect(translateOccupation('Jedi')).toBeUndefined()
  })
})

describe('translateEntries', () => {
  it('Occupations_TraduitesEtInconnuesListees', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Student', 'Unknown', 'Jedi'] } }
    const { entries, untranslated } = translateEntries([entry])
    expect(entries[0]!.attributes.occupation).toEqual(['Pupil', 'Unknown', 'Jedi'])
    expect([...untranslated]).toEqual([['Jedi', 1]])
  })

  it('CorrigeeALaMain_PasListee', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Jedi'] } }
    const { untranslated } = translateEntries([entry], manualOccupations({ '1': { occupation: { plus: ['Chevalier'] } } }))
    expect(untranslated.size).toBe(0)
  })

  it('CorrigeeALaMain_TraduiteSaufCeQuiEstRetire', () => {
    const entry = { id: '1', name: 'Yuuji', attributes: { occupation: ['Sorcerer', 'Student', 'Jujutsu Sorcerer'] } }
    const { entries } = translateEntries([entry], manualOccupations({ '1': { occupation: { plus: ['Exorciste'], moins: ['Sorcerer', 'Student'] } } }))
    expect(entries[0]!.attributes.occupation).toEqual(['Sorcerer', 'Student', 'Exorcist'])
  })
})

describe('groupOccupations', () => {
  it('Synonymes_UneSeuleValeur', () => {
    expect(groupOccupations(['High schooler', 'Pupil', 'Student'])).toEqual(['Student'])
  })

  it('ValeurPrecise_FamilleAjoutee', () => {
    expect(groupOccupations(['Swordsman'])).toEqual(['Swordsman', 'Fighter'])
    expect(groupOccupations(['Killer'])).toEqual(['Assassin', 'Criminal', 'Fighter'])
  })

  it('Vide_Null', () => {
    expect(groupOccupations([])).toBeNull()
  })
})

describe('finishOccupations', () => {
  it('Armes_AjouteesALOccupationPuisRetirees', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Mercenary'], weapon: ['Swordsman', 'Marksman', 'Archer'] } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Mercenary', 'Swordsman', 'Marksman', 'Fighter', 'Shooter'] })
  })

  it('SansOccupation_LArmeSuffit', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: null, weapon: ['Swordsman'] } }
    expect(finishOccupations([entry])[0]!.attributes.occupation).toEqual(['Swordsman', 'Fighter'])
  })
})

describe('translateOccupation, rôles des intros Fandom', () => {
  it('Pluriels_EtNouveauxMotsCles', () => {
    expect(translateOccupation('swordsmen')).toBe('Swordsman')
    expect(translateOccupation('bodyguards')).toBe('Guard')
    expect(translateOccupation('one of Satoru Fujinuma\'s classmates')).toBe('Pupil')
    expect(translateOccupation('Junior Second Class Exorcist of the True Cross Order')).toBe('Exorcist')
  })

  it('ProprietaireSansCommerce_PasCommercant', () => {
    expect(translateOccupation('owner of the Giftia')).toBeUndefined()
    expect(translateOccupation('previous owner of the Koba Mart convenience store')).toBe('Merchant')
  })
})

describe('finishOccupations, titres', () => {
  it('Titres_AjoutesALOccupation', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Student'], titles: ['King'] } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Student', 'Royalty', 'Noble', 'Leader'] })
  })
})

describe('finishOccupations, titres', () => {
  it('Titres_AjoutesALOccupation', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Student'], titles: ['King'] } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Student', 'Royalty', 'Noble', 'Leader'] })
  })
})

describe('finishOccupations, mort', () => {
  it('MortSansOccupation_Aucune', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: null, deceased: 'deceased' } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['None'] })
  })

  it('MortAvecOccupation_PasDeAucune', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Soldier'], deceased: 'deceased' } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Soldier'] })
  })
})

describe('groupOccupations, Inconnu et Aucune', () => {
  it('AssumeParLaSource_Garde', () => {
    expect(translateOccupation('Unknown')).toBe('Unknown')
    expect(translateOccupation('None')).toBe('None')
    expect(groupOccupations(['Unknown'])).toEqual(['Unknown'])
  })

  it('AvecUneVraieOccupation_Efface', () => {
    expect(groupOccupations(['Unknown', 'Swordsman'])).toEqual(['Swordsman', 'Fighter'])
  })
})
