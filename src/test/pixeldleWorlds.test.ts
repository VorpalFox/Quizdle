import { describe, expect, it } from 'vitest'
import type { Entry } from '../engine/types.js'
import { editEntry } from '../subjects/manual.js'
import { pixeldle } from '../subjects/pixeldle/index.js'
import { keepDefault } from '../subjects/pixeldle/worlds.js'

describe('keepDefault', () => {
  it('ChampVide_GardeLaValeurParDefaut', () => {
    expect(keepDefault(null, ['Inconnu'])).toEqual(['Inconnu'])
    expect(keepDefault([], ['Inconnu', 'Lost in the Galaxy'])).toEqual(['Inconnu'])
    expect(keepDefault(null, ['N/A'])).toEqual(['N/A'])
    expect(keepDefault(null, ['Hyrule'])).toBeNull()
  })

  it('VraieValeur_RemplaceLaValeurParDefaut', () => {
    expect(keepDefault(['Soldat'], ['Inconnu'])).toEqual(['Soldat'])
    expect(keepDefault(['Bruns'], ['N/A'])).toEqual(['Bruns'])
  })
})

describe('editEntry, tags ajoutés par le script', () => {
  const entry = (): Entry => ({
    id: 'x', name: 'X',
    attributes: { occupation: ['Garde', 'Magicien'], nationality: ['Inconnu', 'Lost in the Galaxy'] },
    added: { occupation: ['Magicien'], nationality: ['Lost in the Galaxy'] },
  })

  it('UneCorrectionNeRetirePasUnTag', () => {
    const edited = entry()
    editEntry(edited, { occupation: ['Soldat'], nationality: ['Palaven'] }, pixeldle.attributes)
    expect(edited.attributes.occupation).toEqual(['Soldat', 'Magicien'])
    expect(edited.attributes.nationality).toEqual(['Palaven', 'Lost in the Galaxy'])
  })

  it('ChampVide_ValeurParDefautPuisTags', () => {
    const edited = entry()
    editEntry(edited, { nationality: null }, pixeldle.attributes)
    expect(edited.attributes.nationality).toEqual(['Inconnu', 'Lost in the Galaxy'])
  })

  it('LesScriptsPassentLesCles_RemplacementSimple', () => {
    const edited = entry()
    editEntry(edited, { occupation: ['Soldat'] }, ['occupation', 'nationality'])
    expect(edited.attributes.occupation).toEqual(['Soldat', 'Magicien'])
  })
})
