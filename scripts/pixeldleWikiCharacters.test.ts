import { describe, expect, it } from 'vitest'
import { characterName, citedYear, introText, templateGames, isCharacterCategory, isCharacterPage, introRoles, pronounGender, sameCharacter, textHair } from './pixeldleWikiCharacters.js'

describe('pages des personnages', () => {
  it('retire la précision entre parenthèses du nom', () => {
    expect(characterName('Bayonetta (character)')).toBe('Bayonetta')
    expect(characterName('Sam B')).toBe('Sam B')
    expect(characterName('BE2:Man')).toBe('Man')
  })

  it('écarte les listes, les sous-pages et les versions anime', () => {
    expect(isCharacterPage('List of characters')).toBe(false)
    expect(isCharacterPage('Jinpei Jiba (anime)')).toBe(false)
    expect(isCharacterPage('Daud/Gallery')).toBe(false)
    expect(isCharacterPage('Daud')).toBe(true)
  })

  it('écarte les catégories d\'images et de doubleurs', () => {
    expect(isCharacterCategory('Category:Character images')).toBe(false)
    expect(isCharacterCategory('Category:Voice actors')).toBe(false)
    expect(isCharacterCategory('Category:Antagonists')).toBe(true)
  })
})

describe('pronounGender', () => {
  it('compte les pronoms du texte, sans les modèles', () => {
    expect(pronounGender("'''Henry''' is the main character. He lives in a tower. His wife is ill, so he left.")).toBe('Homme')
    expect(pronounGender("{{Quote|he said he was he}} '''Delilah''' is a lookout. She talks to Henry; her voice is all he hears. She drinks.")).toBe('Femme')
  })

  it('ne tranche pas sans assez de pronoms ou quand les deux se mélangent', () => {
    expect(pronounGender('The Employees are the workers of the company. They work.')).toBeNull()
    expect(pronounGender('He met her. She told him. He left her. She cried.')).toBeNull()
  })
})

describe('sameCharacter', () => {
  it('reconnaît un nom raccourci', () => {
    expect(sameCharacter('Rockwell', 'Edmund Rockwell')).toBe(true)
    expect(sameCharacter('Corvo Attano', 'corvo')).toBe(true)
    expect(sameCharacter('Tim LeBlanc', 'Eric LeBlanc')).toBe(false)
  })
})

describe('citedYear', () => {
  const games = [{ names: ['Far Cry'], year: 2004 }, { names: ['Far Cry 3'], year: 2012 }, { names: ['Far Cry 5'], year: 2018 }]
  it('prend la 1re apparition citée, sinon le plus ancien des jeux cités', () => {
    expect(citedYear({ first: ['Far Cry 5'], all: ['Far Cry 3', 'Far Cry 5'] }, games)).toBe(2018)
    expect(citedYear({ first: [], all: ['Far Cry 5', 'Far Cry 3'] }, games)).toBe(2012)
    expect(citedYear({ first: ['Returning Home'], all: [] }, games)).toBeNull()
  })

  it('trouve les titres collés, sans prendre « Far Cry » dans « Far Cry 3 » (sous-titre en dernier recours)', () => {
    expect(citedYear({ first: [], all: ['Far Cry 5 Far Cry 3'] }, games)).toBe(2012)
    expect(citedYear({ first: [], all: ['Far Cry 3: Blood Dragon'] }, games)).toBe(2012)
    expect(citedYear({ first: [], all: ['Far Cry Far Cry 5'] }, games)).toBe(2004)
  })

  it("reconnaît un titre dont l'apostrophe a sauté", () => {
    const edge = [{ names: ["Mirror's Edge"], year: 2008 }, { names: ["Mirror's Edge Catalyst"], year: 2016 }]
    expect(citedYear({ first: [], all: ['Mirrors Edge Catalyst'] }, edge)).toBe(2016)
    expect(citedYear({ first: [], all: ['Mirrors Edge'] }, edge)).toBe(2008)
  })
})

describe('pronounGender, groupes', () => {
  it('écarte un groupe dont le texte dit surtout « they »', () => {
    expect(pronounGender("'''Clockwork Soldiers''' are machines. They patrol. They were built by Jindosh, his finest work; he is proud of them and their power. He sells them.")).toBeNull()
  })
})

describe('introRoles', () => {
  it('CeQuIlEst_SansLaSuite', () => {
    expect(introRoles('William Overbeck is a Vietnam veteran who served in the Army.')).toEqual(['Vietnam veteran'])
    expect(introRoles('Marle is the princess of Guardia.')).toEqual(['princess of Guardia'])
  })

  it('RoleDHistoireOuFamille_Ignore', () => {
    expect(introRoles('Magolor is a major character in the Kirby franchise.')).toEqual([])
    expect(introRoles('Marcus is the son of Fox McCloud.')).toEqual([])
  })
})

describe('textHair', () => {
  it('SectionAppearance_Prioritaire', () => {
    const page = ['Her rival has [[Black|black]] hair.', '== Appearance ==', "She has long '''blonde hair''' tied in a ponytail.", '== Story ==', 'Text'].join('\n')
    expect(textHair(page)?.colors).toEqual(['Blonds'])
  })

  it('SansSection_ToutLeTexte', () => {
    expect(textHair('A tall man with short brown hair and a beard.')?.colors).toEqual(['Bruns'])
  })

  it('PasDeCheveux_Null', () => {
    expect(textHair('A robot made of steel.')).toBeNull()
  })
})

describe('introText', () => {
  it('TexteAvantLaPremiereSection_SansInfobox', () => {
    const page = '{{Character|name = Skorge}}\n\'\'\'Skorge\'\'\' is the secondary antagonist of [[Gears of War 2]].\n== Biography ==\nIn [[Gears of War 3]]...'
    expect(introText(page)).toBe('Skorge is the secondary antagonist of Gears of War 2.')
  })
})

describe('citedYear, introduction', () => {
  const games = [{ names: ['Gears of War'], year: 2006 }, { names: ['Gears of War 2'], year: 2008 }]
  it('InfoboxMuette_PlusAncienJeuDeLIntroduction', () => {
    expect(citedYear({ first: [], all: [], intro: ['Skorge is the secondary antagonist of Gears of War 2.'] }, games)).toBe(2008)
  })

  it('InfoboxCiteUnJeu_PasseAvantLIntroduction', () => {
    expect(citedYear({ first: ['Gears of War'], all: [], intro: ['... of Gears of War 2.'] }, games)).toBe(2006)
  })
})

describe('templateGames', () => {
  it('CodesDesJeux_SansRomans', () => {
    expect(templateGames('{{Games|GOW2|GOW3|ASPHO|QUICK}}\n{{Character')).toEqual(['GOW2', 'GOW3'])
    expect(templateGames('{{Games|III=y|VC=y|O=<small>model</small>}}')).toEqual(['III', 'VC'])
  })

  it('CodesTraduits_AnneeDuJeu', () => {
    const games = [{ names: ['Gears of War'], year: 2006 }, { names: ['Gears of War 2'], year: 2008 }]
    expect(citedYear({ first: [], all: templateGames('{{Games|GOW2|GOW3}}') }, games)).toBe(2008)
  })
})
