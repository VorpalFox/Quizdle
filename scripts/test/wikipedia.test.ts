import { describe, expect, it } from 'vitest'
import { finishOccupations, fixedOccupationIds, groupOccupations, translateEntries, translateOccupation } from '../translate.js'
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
    expect(wikiGender('Masculin')).toBe('Homme')
    expect(wikiGender('Female')).toBe('Femme')
    expect(wikiGender('Inconnu')).toBeNull()
    expect(wikiHair('Noir')).toEqual(['Noirs'])
    expect(wikiHair('Châtain et blanc')).toEqual(['Bruns', 'Blancs'])
    expect(wikiHair('White, with light blue tips and green streaks')).toEqual(['Blancs', 'Bleus'])
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
    expect(translateOccupation('Housemaster of Cecile Hall')).toBe('Professeur')
    expect(translateOccupation('Area Guardian of the Treasury')).toBe('Gardien')
    expect(translateOccupation('Captain of the Black Bulls')).toBe('Capitaine')
    expect(translateOccupation('Dieu de la mort')).toBe('Shinigami')
    expect(translateOccupation('Étudiant en secondaire')).toBe('Étudiant')
    expect(translateOccupation('Student at U.A. High School')).toBe('Élève')
  })

  it('DictionnairePrioritaire_PasLaRegle', () => {
    expect(translateOccupation('Real estate agent')).toBe('Agent immobilier')
    expect(translateOccupation('Lycoris Agent')).toBe('Agent secret')
  })

  it('DejaEnFrancais_Garde', () => {
    expect(translateOccupation('Guerrier')).toBe('Guerrier')
    expect(translateOccupation('Jedi')).toBeUndefined()
  })
})

describe('translateEntries', () => {
  it('Occupations_TraduitesEtInconnuesListees', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Student', 'Unknown', 'Jedi'] } }
    const { entries, untranslated } = translateEntries([entry])
    expect(entries[0]!.attributes.occupation).toEqual(['Élève', 'Jedi'])
    expect([...untranslated]).toEqual([['Jedi', 1]])
  })

  it('CorrigeeALaMain_PasListee', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Jedi'] } }
    const { untranslated } = translateEntries([entry], fixedOccupationIds({ '1': { occupation: ['Chevalier'] } }))
    expect(untranslated.size).toBe(0)
  })
})

describe('groupOccupations', () => {
  it('Synonymes_UneSeuleValeur', () => {
    expect(groupOccupations(['Lycéen', 'Élève', 'Étudiant'])).toEqual(['Étudiant'])
  })

  it('ValeurPrecise_FamilleAjoutee', () => {
    expect(groupOccupations(['Épéiste'])).toEqual(['Épéiste', 'Combattant'])
    expect(groupOccupations(['Tueur'])).toEqual(['Assassin', 'Criminel', 'Combattant'])
  })

  it('Vide_Null', () => {
    expect(groupOccupations([])).toBeNull()
  })
})

describe('finishOccupations', () => {
  it('Armes_AjouteesALOccupationPuisRetirees', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Mercenaire'], weapon: ['Épéiste', 'Tireur', 'Archer'] } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Mercenaire', 'Épéiste', 'Tireur', 'Combattant'] })
  })

  it('SansOccupation_LArmeSuffit', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: null, weapon: ['Épéiste'] } }
    expect(finishOccupations([entry])[0]!.attributes.occupation).toEqual(['Épéiste', 'Combattant'])
  })
})

describe('translateOccupation, rôles des intros Fandom', () => {
  it('Pluriels_EtNouveauxMotsCles', () => {
    expect(translateOccupation('swordsmen')).toBe('Épéiste')
    expect(translateOccupation('bodyguards')).toBe('Garde')
    expect(translateOccupation('one of Satoru Fujinuma\'s classmates')).toBe('Élève')
    expect(translateOccupation('Junior Second Class Exorcist of the True Cross Order')).toBe('Exorciste')
  })

  it('ProprietaireSansCommerce_PasCommercant', () => {
    expect(translateOccupation('owner of the Giftia')).toBeUndefined()
    expect(translateOccupation('previous owner of the Koba Mart convenience store')).toBe('Commerçant')
  })
})

describe('finishOccupations, titres', () => {
  it('Titres_AjoutesALOccupation', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Étudiant'], titles: ['Roi'] } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Étudiant', 'Souverain', 'Noble', 'Leader'] })
  })
})

describe('finishOccupations, titres', () => {
  it('Titres_AjoutesALOccupation', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Étudiant'], titles: ['Roi'] } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Étudiant', 'Souverain', 'Noble', 'Leader'] })
  })
})

describe('finishOccupations, mort', () => {
  it('MortSansOccupation_Aucune', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: null, deceased: 'deceased' } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Aucune'] })
  })

  it('MortAvecOccupation_PasDeAucune', () => {
    const entry = { id: '1', name: 'X', attributes: { occupation: ['Soldat'], deceased: 'deceased' } }
    expect(finishOccupations([entry])[0]!.attributes).toEqual({ occupation: ['Soldat'] })
  })
})
