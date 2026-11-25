import { describe, expect, it } from 'vitest'
import type { Entry } from '../../src/engine/types.js'
import { characterAttributes } from '../../src/subjects/anime/index.js'
import { weebdleAttributes } from '../../src/subjects/weebdle/index.js'
import { anilistUnknowns, parseOccupation, parseSpecies } from '../anilist.js'
import { fandomInfobox, fandomUnknowns, fandomValues } from '../fandom.js'
import { addUnknowns, fillUnknowns, isUnknownValue } from '../unknownValues.js'

const entry = (attributes: Entry['attributes']): Entry => ({ id: '1', name: 'X', attributes })

describe('isUnknownValue', () => {
  it('InconnuEnToutesLettres', () => {
    expect(isUnknownValue('Unknown')).toBe(true)
    expect(isUnknownValue(' unknown. ')).toBe(true)
    expect(isUnknownValue('Unknown (never stated)')).toBe(true)
    expect(isUnknownValue('Inconnue')).toBe(true)
    expect(isUnknownValue('?')).toBe(true)
  })

  it('UneVraieValeur_PasInconnue', () => {
    expect(isUnknownValue(null)).toBe(false)
    expect(isUnknownValue('')).toBe(false)
    expect(isUnknownValue('Unknown, Student')).toBe(false)
    expect(isUnknownValue('17')).toBe(false)
  })
})

describe('Fandom, Unknown', () => {
  const infobox = fandomInfobox('{{Character\n|status = Alive\n|age =Unknown\n|gender = Male\n|occupation = Unknown\n|species = Unknown\n|height=158 cm\n}}')!

  it('MarqueSansValeur', () => {
    expect(fandomUnknowns(infobox)).toEqual(['occupation', 'age', 'species'])
    const values = fandomValues(infobox)
    expect(values.occupation).toBeNull()
    expect(values.species).toBeNull()
    expect(values.age).toBeNull()
    expect(values.height).toBe(158)
  })
})

describe('AniList, Unknown', () => {
  const description = '__Age:__ Unknown\n__Occupation:__ Unknown\n__Race:__ Unknown\n__Height:__ 170 cm'

  it('MarqueSansValeur', () => {
    expect(anilistUnknowns(null, description)).toEqual(['age', 'occupation', 'species'])
    expect(anilistUnknowns('17', description)).toEqual(['occupation', 'species'])
    expect(parseOccupation(description)).toBeNull()
    expect(parseSpecies(description)).toBeNull()
  })

  it('RienDInconnu_Null', () => {
    expect(anilistUnknowns('17', '__Height:__ 170 cm')).toBeNull()
  })
})

describe('addUnknowns', () => {
  it('ClesAjouteesSansDoublon', () => {
    expect(addUnknowns({ unknown: ['age'] }, ['age', 'hair'])).toEqual(['age', 'hair'])
    expect(addUnknowns({ unknown: ['age'] }, ['age'])).toBeNull()
    expect(addUnknowns({}, [])).toBeNull()
  })
})

describe('fillUnknowns', () => {
  it('CaseVide_Inconnu', () => {
    const [filled] = fillUnknowns([entry({ age: null, occupation: null, species: null, unknown: ['age', 'occupation', 'species'] })], weebdleAttributes)
    expect(filled!.attributes).toEqual({ age: 'Inconnu', occupation: ['Inconnu'], species: ['Inconnu'] })
  })

  it('UneAutreSourceADonne_ValeurGardee', () => {
    const [filled] = fillUnknowns([entry({ age: 17, species: ['Humain'], unknown: ['age', 'species'] })], weebdleAttributes)
    expect(filled!.attributes).toEqual({ age: 17, species: ['Humain'] })
  })

  it('IndicePasDuQuiz_Ignore', () => {
    const [filled] = fillUnknowns([entry({ species: null, unknown: ['species'] })], characterAttributes)
    expect(filled!.attributes).toEqual({ species: null })
  })
})
