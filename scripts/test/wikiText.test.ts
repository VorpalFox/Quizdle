import { describe, expect, it } from 'vitest'
import { disambiguationLinks, infoboxAge, textHair } from '../wikiText.js'

describe('infoboxAge', () => {
  it('le 1er nombre, pas une décennie', () => {
    expect(infoboxAge('16 (Part I), 19 (Part II)')).toBe(16)
    expect(infoboxAge('17-18')).toBe(17)
    expect(infoboxAge('Over 1,000')).toBe(1000)
    expect(infoboxAge('Early 20s')).toBeNull()
    expect(infoboxAge('Unknown')).toBeNull()
    expect(infoboxAge('1, 000+')).toBe(1000)
    expect(infoboxAge('~102, 000')).toBe(102000)
    expect(infoboxAge('Late 20s (1999)')).toBeNull()
    expect(infoboxAge('Born circa 1929 ~ 1930, *14/15 (1944), *69/70 (1999)')).toBeNull()
    expect(infoboxAge('~2 months old (Part 1), 50 (Part 2)')).toBe(50)
    expect(infoboxAge(null)).toBeNull()
  })
})

describe('disambiguationLinks', () => {
  const rem = '{{Disambig}}\n*[[Rem (Re:Zero)]]\n*[[Rem (character)]]\n*[[Rem (song)]]\n*[[Ram]]'

  it("ceux qui passent prefer d'abord, puis « (character) », sans ceux de skip", () => {
    expect(disambiguationLinks(rem, 'Rem', qualifier => qualifier.includes('Zero'), /song/)).toEqual(['Rem (Re:Zero)', 'Rem (character)'])
  })

  it("rien si ce n'est pas une page d'homonymie", () => {
    expect(disambiguationLinks('{{Character|name = Rem}} [[Rem (Re:Zero)]]', 'Rem', () => true)).toEqual([])
  })
})

describe('textHair, chauve', () => {
  it('ChauveDansAppearance_ChauveEtAnciensCheveux', () => {
    const page = "Intro.\n==Appearance==\nSaitama is a bald, average-height man. His hairless head replaced his former short black hair.\n==Personality==\nCalm."
    expect(textHair(page)?.colors).toEqual(['Chauve', 'Noirs'])
  })

  it('CalvitieQuiCommence_PasChauve', () => {
    const page = "==Appearance==\nKano is depicted as a white male who appears to be going bald and has a five o'clock shadow.\n"
    expect(textHair(page)).toBeNull()
  })

  it('ChauveAvant_PasChauve', () => {
    const page = "==Appearance==\nHe has short brown hair. Before his death, Hinata had a shaved head shown in episode 4.\n"
    expect(textHair(page)?.colors).toEqual(['Bruns'])
  })

  it('AutreVersionDuPerso_PasChauve', () => {
    const page = "==Appearance==\nIn this future, he seems to have aged greatly. He is completely bald, outside of a gray beard.\nWhile completely bald, Kung Lao's revenant form has long sharp nails.\n"
    expect(textHair(page)).toBeNull()
  })

  it('AgeMur_ResteChauve', () => {
    const page = "==Appearance==\nSam is a middle-aged man with a shaved head.\n"
    expect(textHair(page)?.colors).toEqual(['Chauve'])
  })

  it('AnciensCheveux_GardesApresLesActuels', () => {
    const page = "==Appearance==\nHe used to have long red hair. Now he has short black hair.\n"
    expect(textHair(page)?.colors).toEqual(['Noirs', 'Rouges'])
  })
})
