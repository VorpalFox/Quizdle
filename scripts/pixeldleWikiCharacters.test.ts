import { describe, expect, it } from 'vitest'
import { characterName, citedYear, isCharacterCategory, isCharacterPage, pronounGender, sameCharacter } from './pixeldleWikiCharacters.js'

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
