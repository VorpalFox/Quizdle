import { describe, expect, it } from 'vitest'
import { bloodRelatives, templateSpecies } from '../fandom.js'
import { affiliationOccupations,fandomInfobox, fandomValues, introOccupations, infoboxTemplate, pageSection, sameName, schoolOccupations, templateInfobox } from '../fandom.js'
import { frenchOccupation, translateOccupation } from '../translate.js'
import { splitOccupations } from '../anilist.js'

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
  it('ChampsNumerotes_TousLus', () => {
    expect(fandomValues(fandomInfobox('{{Daily Character|Gender = Male|Job = Student|Job 2 = Buddy - Spirit Capturing}}')!).occupation).toEqual(['Student', 'Buddy', 'Spirit Capturing'])
  })

  it('ChampsVariables_NosValeurs', () => {
    expect(fandomValues(fandomInfobox(NANAMI)!)).toEqual({ gender: 'Male', hair: ['Blond'], occupation: ['Jujutsu Sorcerer'], age: 27, species: ['Human'], height: null, weapon: ['Swordsman'], titles: null, deceased: null, relatives: null })
    expect(fandomValues(fandomInfobox(YURI)!)).toEqual({ gender: 'Male', hair: ['Black'], occupation: ['Counterintelligence Officer', 'Diplomat'], age: null, species: null, height: null, weapon: null, titles: null, deceased: null, relatives: null })
  })

  it('EcoleSuivieDuRole_LeRolePasLEcole', () => {
    expect(fandomValues(fandomInfobox('{{Character|Gender=Male|Postion=Private Aichi Symbiosis Academy (Student)}}')!).occupation).toEqual(['Student'])
    expect(fandomValues(fandomInfobox('{{Character|position = Member of the Supreme Five Swords,Private Aichi Symbiosis Academy (Student)}}')!).occupation)
      .toEqual(['Member of the Supreme Five Swords', 'Student'])
  })

  it('NomDeLEcoleSeul_Eleve', () => {
    expect(translateOccupation('Private Aichi Symbiosis Academy')).toBe('Pupil')
    expect(translateOccupation('Middle School Student')).toBe('Middle schooler')
  })

  it('UnDesMembresDUnGroupe_RoleDuGroupeOuRien', () => {
    expect(translateOccupation('One of the Three Beasts')).toBeNull()
    expect(translateOccupation('One of the soldiers')).toBe(translateOccupation('soldiers'))
  })

  it('FamilleDeSang_SansConjointNiAdoption', () => {
    expect(bloodRelatives('Mabel Crane (Sister)')).toEqual(['Mabel Crane'])
    expect(bloodRelatives('Blaise Lamprogue (father), Grey Lamprogue (younger brother), Seika Lamprogue (Adoptive younger brother)')).toEqual(['Blaise Lamprogue', 'Grey Lamprogue'])
    expect(bloodRelatives('Bertha Lamprogue (wife), Luft Lamprogue(son)')).toEqual(['Luft Lamprogue'])
    expect(bloodRelatives('Unnamed Mother†')).toBeNull()
    expect(bloodRelatives('Santana (his attempted god-child), Elizabeth Joestar (daughter in law)')).toBeNull()
  })

  it('EpeisteMagique_MageEtEpeiste', () => {
    expect(splitOccupations('Magical swordsman')!.map(translateOccupation)).toEqual(['Mage', 'Swordsman'])
    expect(splitOccupations('Magic swordman (Hero)')!.map(translateOccupation)).toEqual(['Mage', 'Swordsman'])
  })

  it('MetiersDeTheWorldGodOnlyKnows', () => {
    expect(splitOccupations('Track and Field Club Girl')!.map(translateOccupation)).toEqual(['Athlete'])
    expect(translateOccupation('Café Owner')).toBe('Bartender')
    expect(translateOccupation('Chauffeur of Mio Aoyama')).toBe('Driver')
    expect(translateOccupation('Private Household Demon')).toBe('Maid')
    expect(translateOccupation('Normal Person')).toBeNull()
  })

  it('IdoleChasseurBibliothecaire', () => {
    expect(translateOccupation('Roller-coaster Idol')).toBe('Idol')
    expect(translateOccupation('Runaway Spirit Squad Agent')).toBe('Demon hunter')
    expect(translateOccupation('Demon Hunter')).toBe('Demon hunter')
    expect(translateOccupation('Eloquent Library Committee Member')).toBe('Librarian')
    expect(translateOccupation('Bakery Employee')).toBe('Employee')
  })

  it('DemonEtCaretaker', () => {
    expect(translateOccupation('Contract Devil')).toBe('Demon')
    expect(translateOccupation('Devil Hunter')).toBe('Demon hunter')
    // « caretaker » : un mentor, donc un Professeur comme « mentor »
    expect(translateOccupation("Nia's caretaker")).toBe('Teacher')
  })
})

describe('introOccupations', () => {
  it('Intro_RoleTraduitSansLesAdjectifs', () => {
    expect(introOccupations("{{Character Infobox|name = Mutsu}}\n'''Mutsu''' is a young archer who serves Tahoumaru.").occupation).toEqual(['Archer'])
  })

  it('RoleIntraduisibleOuServantDeFate_Ignore', () => {
    expect(introOccupations("'''Iskandar''' is the Rider-class Servant of Waver Velvet.").occupation).toEqual([])
    expect(introOccupations("'''Beldia''' is one of the Devil King's Generals.").occupation).toEqual(['Officer'])
  })
})

describe('fandomInfobox, modèle maison', () => {
  it('ModeleAuNomInconnu_ReconnuASesChamps', () => {
    expect(fandomInfobox('{{Human\n|title = Hirokazu Ukita\n|gender = Male\n|occupation = Police officer\n}}')).toMatchObject({ gender: 'Male', occupation: 'Police officer' })
  })
})

describe('fandomInfobox, nowiki', () => {
  it('CrochetsDansNowiki_ModeleLuJusquAuBout', () => {
    const page = "{{Character_information_real\n|gender=Male\n|dao=[[Cultivation | Eternal]]<nowiki>| Realm]]</nowiki>\n|current_occupation=Student at 60TH High\n}}"
    expect(fandomValues(fandomInfobox(page)!).occupation).toEqual(['Student at 60TH High'])
  })
})

describe('fandomValues, titres', () => {
  it('Titres_TraduitsSansLesSurnoms', () => {
    const page = "{{Character Infobox\n|gender = Male\n|titles = «The Black Swordsman»<br>Beater\n}}"
    expect(fandomValues(fandomInfobox(page)!).titles).toEqual(['Swordsman'])
  })
})

describe('pageSection', () => {
  const page = "Intro.\n== Alter Ego: Paprika ==\n{{Character Box\n|hair = Red\n}}\nShe guides dreams.\n=== Powers ===\nFlying.\n== Trivia ==\nOther."

  it('SectionEtSesSousSections', () => {
    expect(pageSection(page, 'Alter Ego: Paprika')).toBe('{{Character Box\n|hair = Red\n}}\nShe guides dreams.\n=== Powers ===\nFlying.')
  })

  it('SectionAbsente_Null', () => {
    expect(pageSection(page, 'Biography')).toBeNull()
  })
})

describe('sameName', () => {
  it('AutreTranscription_MemePerso', () => {
    expect(sameName('Kiyotaka Ayanokouji', 'Kiyotaka Ayanokōji')).toBe(true)
    expect(sameName('Pyoran', 'Pioran')).toBe(true)
    expect(sameName('Yi Zhou', 'Zhuo Yi')).toBe(true)
    expect(sameName('Matt Kuga', 'Matt Cugat')).toBe(true)
    expect(sameName('Mary', 'Marie')).toBe(true)
    expect(sameName('Ro Nny', 'Lo-Ny')).toBe(true)
  })

  it('AutrePersoQuiPartageUnMot_Ecarte', () => {
    expect(sameName('Ling Wang Ma', 'Wang Ling')).toBe(false)
    expect(sameName('Shin Sakai', 'Haruka Sakai')).toBe(false)
    expect(sameName('A-ko', 'Chu-Chu')).toBe(false)
    expect(sameName('Kai', 'Chi')).toBe(false)
  })
})

describe('introOccupations, intro dans l\'infobox', () => {
  it('ChampIntro_Lu', () => {
    const page = "{{Character\n|gender = Male\n|intro='''Kiyotaka''' is the main protagonist of the series. He is currently a third-year student of Advanced Nurturing High School.}}"
    expect(introOccupations(page).occupation).toEqual(['Pupil'])
  })
})

describe('fandomValues, mort', () => {
  it('Deceased_Note', () => {
    expect(fandomValues(fandomInfobox('{{Character Infobox\n|gender = Female\n|status = Deceased\n}}')!).deceased).toBe('deceased')
  })

  it('MortSelonLaVersion_PasNote', () => {
    expect(fandomValues(fandomInfobox('{{Character Infobox\n|gender = Male\n|status = Alive (resurrected)\n}}')!).deceased).toBeNull()
    expect(fandomValues(fandomInfobox('{{Character Infobox\n|gender = Male\n|status = Deceased (vampire), Unknown (demon)\n}}')!).deceased).toBeNull()
  })
})

describe('affiliation', () => {
  it('RoleSimple_Garde', () => {
    expect(affiliationOccupations('Student (formerly)')).toEqual(['Pupil'])
  })

  it('OrganisationPossessifOuNomPropre_Ecarte', () => {
    expect(affiliationOccupations('Demon Slayer Corps')).toBeNull()
    expect(affiliationOccupations("Souichirou Kuzuki's Servant")).toBeNull()
    expect(affiliationOccupations('Prince Bojji, Underworld Kingdom')).toBeNull()
  })
})

describe('fandomInfobox, spoilers repliés', () => {
  const SONIC = `{{Infobox character
|race = [[Humans|Human]]
|weapons = Ninja Equipment <br/>{{Hidden|Webcomic Spoiler|[[Legendary Demon Blades|Legendary Demon Blade]]}}
|occupation = Bodyguard <small>(Formerly)</small>
|affiliation = [[Hero Association]]<br/>{{Hidden|Webcomic Spoiler|[[Neo Heroes]]}}
}}`

  it('ArmeDansHidden_Lue', () => {
    expect(fandomValues(fandomInfobox(SONIC)!).weapon).toEqual(['Swordsman'])
  })

  it('AffiliationDansHidden_ResteEffacee', () => {
    expect(fandomInfobox(SONIC)!.affiliation).not.toContain('Neo Heroes')
  })

  it('OccupationDansHide_Lue', () => {
    const fields = fandomInfobox('{{Character\n|gender = Female\n|previous occupation = {{Hide|Laundry maid of the [[Heathfield Manor#Heathfield Household|Heathfield household]]}}\n}}')!
    expect(fields['previous occupation']).toContain('Laundry maid')
  })
})

describe('schoolOccupations', () => {
  it('Ecole_Eleve', () => {
    expect(schoolOccupations('Hyakkaou Private Academy')).toEqual(['Pupil'])
  })

  it('AncienneEcole_Rien', () => {
    expect(schoolOccupations('Umesato Junior High School (formerly)')).toBeNull()
    expect(schoolOccupations('Graduated from Ohashi High School')).toBeNull()
  })

  it('PlusieursEcoles_UneActuelleSuffit', () => {
    expect(schoolOccupations('Far East Devil High School (Graduate), Maijima Private High School')).toEqual(['Pupil'])
    expect(schoolOccupations('Umesato Junior High School (expelled), Criminal')).toBeNull()
  })
})

describe('infobox dans un modèle propre au perso', () => {
  it('trouve le modèle appelé par la page', () => {
    expect(infoboxTemplate('{{Lorraine Vivie Infobox|status=Alive}}\n\'\'\'Lorraine\'\'\' is a scholar.')).toBe('Template:Lorraine Vivie Infobox')
    expect(infoboxTemplate('{{Nihongo|Lorraine}} is a scholar.')).toBeNull()
  })
  it('lit ses champs, sans la doc', () => {
    const template = '{{#ifeq:{{{mode|infobox}}}|infobox|\n{{Char Box\n|species=Human\n|gender=Female\n|occupation=Scholar\n}}\n}}<noinclude>{{Char Box|gender=Example}}</noinclude>'
    expect(templateInfobox(template)).toMatchObject({ species: 'Human', gender: 'Female', occupation: 'Scholar' })
  })
  it('pas une infobox portable générique', () => {
    expect(templateInfobox('<infobox><data source="gender"><label>Gender</label></data></infobox><noinclude>{{InDepthCharacterInfobox|gender=Example}}</noinclude>')).toBeNull()
  })
})

describe('templateSpecies', () => {
  it('ModeleDuPeuple_Espece', () => {
    expect(templateSpecies('{{Parent Tab Template|tab1=Outline}}{{Hell character\n|Gender = Female\n}}')).toEqual(['Demon'])
    expect(templateSpecies('{{Target character\n|Gender = Female\n}}')).toEqual([])
  })
})

describe('translateOccupation, valeurs déjà traduites', () => {
  it('AncienMotFrancais_SonAnglais', () => {
    expect(translateOccupation('Collégien')).toBe('Middle schooler')
    expect(translateOccupation('Soldat')).toBe('Soldier')
  })
  it('NotreValeur_GardeeTelleQuelle', () => {
    expect(translateOccupation('Swordsman')).toBe('Swordsman')
    expect(translateOccupation('Miko')).toBe('Miko')
  })
  it('MotBrutDUneSource_PasseParLesRegles', () => {
    expect(translateOccupation('captain')).toBe('Captain')
    expect(translateOccupation('Advisor')).toBe('Assistant')
  })
  it('NomFrancais_PourLesReglesDuPixeldle', () => {
    expect(frenchOccupation('Psychiatrist')).toBe('psychiatre')
    expect(frenchOccupation('Student')).toBe('étudiant')
  })
})
