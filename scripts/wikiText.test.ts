import { describe, expect, it } from 'vitest'
import { disambiguationLinks, infoboxAge } from './wikiText.js'

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
