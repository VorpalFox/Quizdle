import { describe, expect, it } from 'vitest'
import { animeSource, heightCm, parseHeight, parseOccupation, parseOccupationAtStart, parseSpecies } from '../anilist.js'
import { addedValues, familySpecies, translateCharacterSpecies, translateSpeciesEntries } from '../translate.js'
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
    // Une fée du folklore gardée précise, Fée s'ajoute au dépliage (translateSpeciesEntries)
    expect(translateCharacterSpecies('Sylph').species).toEqual(['Sylphe'])
    expect(translateSpeciesEntries([{ id: '1', name: 'X', attributes: { species: ['Sylph'] } }]).entries[0]!.attributes.species).toEqual(['Sylphe', 'Fée'])
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

describe('parseOccupationAtStart', () => {
  it('MetierSansVerbe_Lu', () => {
    expect(parseOccupationAtStart('A sergeant in the police force in a certain city.')).toEqual(['Sergeant'])
    // Pas dans parseOccupation : il compte pour choisir les persos
    expect(parseOccupation('A sergeant in the police force in a certain city.')).toBeNull()
  })

  it('LadyOuLord_PasUnMetier', () => {
    expect(parseOccupationAtStart('An elderly lady who sells flowers.')).toBeNull()
    expect(parseOccupationAtStart('A former drug lord.')).toBeNull()
    expect(parseOccupationAtStart('The hero of the first game.')).toBeNull()
    expect(parseOccupationAtStart('One of the Four Ramen Emperors of Tokyo.')).toBeNull()
  })

  it('UnDesSoldats_Lu', () => {
    expect(parseOccupationAtStart('One of the soldiers in Hamdo\'s army.')).toEqual(['Soldier'])
  })

  it('TousLesMetiersDuPerso_PasCeuxDesAutres', () => {
    expect(parseOccupation('She\'s a first-year student. She is the lead singer. Her father is the president.')).toEqual(['Student', 'Singer'])
    expect(parseOccupation('He often fights with Sharrkan, who is a swordsman.')).toBeNull()
  })

  it('ContractionShes_CommeIs', () => {
    expect(parseOccupation('She\'s the commanding officer of Hamdo\'s army.')).toEqual(['Officer'])
  })

})

describe('familySpecies', () => {
  const entry = (id: string, name: string, species: string[] | null) => ({ id, name, attributes: { anime: 'A', species } })

  it('SansEspece_CelleDeSaFamille', () => {
    const { entries } = familySpecies([entry('1', 'Seika Lamprogue', ['Humain', 'Démon']), entry('2', 'Blaise Lamprogue', ['Humain']), entry('3', 'Gly Lamprogue', null)])
    expect(entries[2]!.attributes.species).toEqual(['Humain'])
  })

  it('OmbreEtRaceALO_PasHeritees', () => {
    const { entries } = familySpecies([entry('1', 'Asako Kobayakawa', ['Ombre']), entry('2', 'Shiori Kobayakawa', null),
      entry('3', 'Kazuto Kirigaya', ['Humain', 'Spriggan', 'Fée']), entry('4', 'Midori Kirigaya', null)])
    expect(entries[1]!.attributes.species).toBeNull()
    expect(entries[3]!.attributes.species).toEqual(['Humain', 'Fée'])
  })

  it('PasUnNomDeFamille_Ignore', () => {
    const { entries } = familySpecies([entry('1', 'Miranjo no Haha', ['Humain']), entry('2', 'Kage Haha', null)])
    expect(entries[1]!.attributes.species).toBeNull()
  })
})

describe('addedValues', () => {
  it('ChampVide_Rempli', () => {
    expect(addedValues({ age: null, occupation: null }, { age: 17, occupation: ['Whatever job'] })).toEqual({ age: 17, occupation: ['Whatever job'] })
  })

  it('ChampAUneValeur_1reSourceGardee', () => {
    expect(addedValues({ gender: 'Homme', age: 17 }, { gender: 'Femme', age: 20 })).toEqual({})
  })

  it('ListesCumulees', () => {
    expect(addedValues({ occupation: ['Student'], hair: ['Noirs'], species: ['Human'] }, { occupation: ['Student', 'President'], hair: ['Bleus'], species: ['Vampire'] }))
      .toEqual({ occupation: ['Student', 'President'], hair: ['Noirs', 'Bleus'], species: ['Human', 'Vampire'] })
  })

  it('OccupationIntraduisibleDUneSourceSuivante_LaisseeDeCote', () => {
    expect(addedValues({ occupation: ['Student'] }, { occupation: ['Aub Alexandria\'s First Husband', 'Knight'] })).toEqual({ occupation: ['Student', 'Knight'] })
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
