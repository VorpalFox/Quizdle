import { describe, expect, it } from 'vitest'
import { keepWorlds } from '../subjects/pixeldle/worlds.js'

describe('keepWorlds', () => {
  it('CorrectionDesLieux_GardeLesMondesAjoutesParLeScript', () => {
    expect(keepWorlds(['Wasteland'], ['The Nether', 'Mythe de Cthulhu'])).toEqual(['Wasteland', 'Mythe de Cthulhu'])
    expect(keepWorlds(['Palaven'], ['Palaven', 'Lost in the Galaxy'])).toEqual(['Palaven', 'Lost in the Galaxy'])
    expect(keepWorlds(['Japan'], ['Japan', 'Monde réel'])).toEqual(['Japan', 'Monde réel'])
  })

  it('DejaAppliquee_RienNeChange', () => {
    const generated = ['Oakmont', 'United States', 'Monde réel', 'Mythe de Cthulhu']
    expect(keepWorlds(['Oakmont', 'United States'], generated)).toEqual(generated)
  })

  it('Inconnu_SeulementSansLieu', () => {
    expect(keepWorlds(null, ['Inconnu'])).toEqual(['Inconnu'])
    expect(keepWorlds(null, ['Inconnu', 'Lost in the Galaxy'])).toEqual(['Inconnu', 'Lost in the Galaxy'])
    expect(keepWorlds(['Hyrule'], ['Inconnu'])).toEqual(['Hyrule'])
    expect(keepWorlds(null, ['Hyrule'])).toBeNull()
  })
})
