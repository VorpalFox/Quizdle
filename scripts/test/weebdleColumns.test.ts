import { describe, expect, it } from 'vitest'
import { animeSource, heightCm, parseHeight, parseSpecies } from '../anilist.js'
import { translateCharacterSpecies, translateSpeciesEntries } from '../translate.js'

describe('heightCm', () => {
  it('Centimetres', () => {
    expect(heightCm('173 cm (5\'8")')).toBe(173)
    expect(heightCm('195cm (6\'5", with "horn"), 184cm')).toBe(195)
  })

  it('PremiereTaille_AvantEllipse', () => {
    expect(heightCm('147 cm (4\' 10") (pre-timeskip), 163 cm (5\' 4") (post-timeskip)')).toBe(147)
  })

  it('MetresEtPieds', () => {
    expect(heightCm('1.72 m')).toBe(172)
    expect(heightCm('5\' 10½"')).toBe(179)
    expect(heightCm('4\'8"')).toBe(142)
  })

  it('NombreSeul_EnCm', () => {
    expect(heightCm('178 (5\' 10")')).toBe(178)
    expect(heightCm('around 152 (5\' 0")')).toBe(152)
  })

  it('PasUneTaille_Rien', () => {
    expect(heightCm('(850), (854)')).toBeNull()
    expect(heightCm('Unknown.')).toBeNull()
    expect(heightCm(null)).toBeNull()
    expect(heightCm('35px')).toBeNull()
  })

  it('DescriptionAniList', () => {
    expect(parseHeight('__Height:__ 174 cm\n__Race:__ Human')).toBe(174)
    expect(parseSpecies('__Height:__ 174 cm\n__Race:__ Human')).toBe('Human')
  })
})

describe('translateCharacterSpecies', () => {
  it('GrandesFamilles', () => {
    expect(translateCharacterSpecies('Human, Spiral').species).toEqual(['Humain'])
    expect(translateCharacterSpecies('Giftia').species).toEqual(['Androïde'])
    expect(translateCharacterSpecies('Beastman - Wolf').species).toEqual(['Homme-bête'])
    expect(translateCharacterSpecies('Sylph').species).toEqual(['Fée'])
  })

  it('AvantMarque_SeulementLeDebut', () => {
    expect(translateCharacterSpecies('Human (Formerly), Seraph (Inactive), Michaela, Vampire (Formerly), Demon').species).toEqual(['Humain', 'Vampire'])
    expect(translateCharacterSpecies('Part 1: Human, Part 2: Vampire').species).toEqual(['Humain'])
    expect(translateCharacterSpecies('Human (Former), Chimera Ant').species).toEqual(['Humain'])
    expect(translateCharacterSpecies('Human (until Episode 5), Shiki (as of Episode 5)').species).toEqual(['Humain'])
    expect(translateCharacterSpecies('Human, Zombie (Temporary)').species).toEqual(['Humain'])
  })

  it('ApresMarque_Retire', () => {
    expect(translateCharacterSpecies('Human, Elder Bairn by the end of the movie').species).toEqual(['Humain'])
    expect(translateCharacterSpecies('Human (11th Loop), Shadow (original Timeline)').species).toEqual(['Humain'])
  })

  it('Inconnue_MiseDeCote', () => {
    expect(translateCharacterSpecies('Nephilim')).toEqual({ species: [], unknown: ['Nephilim'] })
    expect(translateCharacterSpecies('Unknown')).toEqual({ species: [], unknown: [] })
  })

  it('WikidataEnFrancais', () => {
    expect(translateCharacterSpecies('être humain de fiction').species).toEqual(['Humain'])
  })

  it('Entrees_DepliÉes', () => {
    const entry = { id: '1', name: 'Tako', attributes: { species: ['Cat (formerly), Devilcat'] } }
    expect(translateSpeciesEntries([entry]).entries[0]!.attributes.species).toEqual(['Chat', 'Animal'])
  })
})

describe('animeSource', () => {
  it('Familles', () => {
    expect(animeSource('LIGHT_NOVEL')).toBe('Light novel')
    expect(animeSource('WEB_NOVEL')).toBe('Roman')
    expect(animeSource('OTHER')).toBeNull()
    expect(animeSource(null)).toBeNull()
  })
})
