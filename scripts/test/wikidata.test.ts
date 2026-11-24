import { describe, expect, it } from 'vitest'
import { wikidataGender, wikidataHair, wikidataOccupation } from '../wikidata.js'

describe('wikidataGender', () => {
  it('MasculinFeminin_HommeFemme', () => {
    expect(wikidataGender(['masculin'])).toBe('Homme')
    expect(wikidataGender(['féminin'])).toBe('Femme')
    expect(wikidataGender(['non-binarité'])).toBeNull()
  })
})

describe('wikidataHair', () => {
  it('NomsFrEtEn_NosCouleurs', () => {
    expect(wikidataHair(['cheveux noirs'])).toEqual(['Noirs'])
    expect(wikidataHair(['cheveux châtains clairs', 'light blue hair'])).toEqual(['Bruns', 'Bleus'])
    expect(wikidataHair(['pourpre'])).toEqual(['Violets'])
  })
})

describe('wikidataOccupation', () => {
  it('FormesGenrees_PremiereForme', () => {
    expect(wikidataOccupation(['lycéen ou lycéenne'])).toEqual(['Lycéen'])
    expect(wikidataOccupation(['pratiquant ou pratiquante d\'arts martiaux'])).toEqual(['Pratiquant d\'arts martiaux'])
    expect(wikidataOccupation(['ninja de fiction', 'pirate'])).toEqual(['Ninja', 'Pirate'])
  })
})
