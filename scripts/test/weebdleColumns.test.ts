import { describe, expect, it } from 'vitest'
import { animeSource, heightCm, parseHeight, parseSpecies } from '../anilist.js'
import { translateCharacterSpecies, translateSpeciesEntries } from '../translate.js'
import { introSpecies } from '../fandom.js'

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

  it('ToutesLesEspeces_MemePlusTard', () => {
    expect(translateCharacterSpecies('Human (Formerly), Seraph (Inactive), Michaela, Vampire (Formerly), Demon').species).toEqual(['Humain', 'Ange', 'Vampire', 'Démon'])
    expect(translateCharacterSpecies('Part 1: Human, Part 2: Vampire').species).toEqual(['Humain', 'Vampire'])
    expect(translateCharacterSpecies('Human (until Episode 5), Shiki (as of Episode 5)').species).toEqual(['Humain', 'Vampire'])
    expect(translateCharacterSpecies('Human, Elder Bairn by the end of the movie').species).toEqual(['Humain', 'Monstre'])
    expect(translateCharacterSpecies('Human (11th Loop), Shadow (original Timeline)').species).toEqual(['Humain', 'Ombre'])
  })

  it('Inconnue_MiseDeCote', () => {
    expect(translateCharacterSpecies('Most Possibly an Absolute Monad')).toEqual({ species: [], unknown: ['Most Possibly an Absolute Monad'] })
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

describe('introSpecies', () => {
  const page = (intro: string) => `{{Infobox character\n|gender = Female\n}}\n${intro}\n==Appearance==\nTall.`

  it('EspeceDeLIntro', () => {
    expect(introSpecies(page("'''Aqua''' is a goddess who was dragged to another world."))).toEqual(['goddess'])
    expect(introSpecies(page('Tuka is a young elf girl from the Coda village.'))).toEqual(['elf'])
  })

  it('PasUnMetier', () => {
    expect(introSpecies(page('Tanjiro is a Demon Slayer of the Demon Slayer Corps.'))).toEqual([])
    expect(introSpecies(page('Van Hellsing is a vampire hunter.'))).toEqual([])
    expect(introSpecies(page('Sumi is a servant of the Butterfly Mansion.'))).toEqual([])
  })

  it('CeQuIlDevient_Compte', () => {
    expect(introSpecies(page('Kyouko is a doctor. She later became a vampire.'))).toEqual(['vampire'])
  })

  it('EntreGuillemetsEtVraieForme_ToutesLesEspeces', () => {
    const guideau = 'Guideau is the main protagonist of the story. She is a young "human" who travels with Ashaf.\n\nGuideau\'s true form is that of a Beast and is the only natural enemy witches have.'
    expect(introSpecies(page(guideau))).toEqual(['human', 'Beast'])
  })

  it('AdjectifsSeparesParUneVirgule_EspeceLue', () => {
    expect(introSpecies(page('The Demon Sword Ashgan is a malevolent, cursed blade of mass destruction.'))).toEqual(['blade'])
  })

  it('CeQuIlPretendEtre_PasCompte', () => {
    expect(introSpecies(page('Alucard is disguised as a human.'))).toEqual([])
  })
})

describe('translateCharacterSpecies, anime', () => {
  it('HybrideEtParasite', () => {
    const expand = (raw: string) => translateSpeciesEntries([{ id: '1', name: 'X', attributes: { species: [raw] } }]).entries[0]!.attributes.species
    expect(expand('Human (formerly), Hybrid')).toEqual(['Humain', 'Démon'])
    expect(expand('Parasite')).toEqual(['Humain'])
  })
})
