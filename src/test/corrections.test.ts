import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GameError } from '../engine/game.js'
import { type AttributeDef, type Entry, NOT_APPLICABLE, type Subject } from '../engine/types.js'
import { applyManual, applySetEdit, type Manual } from '../subjects/manual.js'
import { editAttribute, parseValue, removeEntry, resolveEntry } from '../bot/corrections.js'

const attributes: AttributeDef[] = [
  { key: 'gender', label: 'Sexe', kind: 'exact' },
  { key: 'age', label: 'Âge', kind: 'number' },
  { key: 'hair', label: 'Cheveux', kind: 'set' },
]
const [gender, age, hair] = attributes as [AttributeDef, AttributeDef, AttributeDef]

function makeSubject(): Subject {
  return {
    id: 'weebdle',
    name: 'Weebdle',
    description: '',
    attributes,
    entries: [
      { id: '27', name: 'Killua Zoldyck', attributes: { gender: 'Homme', age: 12, hair: null } },
      { id: '30', name: 'Gon Freecss', attributes: { gender: 'Homme', age: 12, hair: ['Noirs'] } },
      { id: '31', name: 'Biscuit Krueger', attributes: { gender: null, age: 57, hair: ['Blonds'] } },
    ],
  }
}

const readJson = (file: URL) => JSON.parse(readFileSync(file, 'utf8')) as Manual

describe('parseValue', () => {
  it('lit un nombre, une liste ou une valeur simple, et « - » pour vide', () => {
    expect(parseValue(age, '17')).toBe(17)
    expect(parseValue(hair, 'Blancs, Noirs')).toEqual(['Blancs', 'Noirs'])
    expect(parseValue(hair, 'Blancs/Blancs')).toEqual(['Blancs'])
    expect(parseValue(gender, ' Femme ')).toBe('Femme')
    expect(parseValue(age, '-')).toBeNull()
    expect(parseValue(hair, 'vide')).toBeNull()
  })

  it('lit « n/a » comme non applicable, même pour un nombre', () => {
    expect(parseValue(age, 'N/A')).toBe(NOT_APPLICABLE)
    expect(parseValue(hair, 'non applicable')).toEqual([NOT_APPLICABLE])
  })

  it('refuse un nombre qui n\'en est pas un', () => {
    expect(() => parseValue(age, 'douze')).toThrow(GameError)
  })
})

describe('corrections depuis Discord', () => {
  let dir: string
  let file: URL

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'quizdle-'))
    file = pathToFileURL(join(dir, 'weebdle-manual.json'))
  })

  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('edit écrit la correction et l\'applique sur place (réponse du jour et parties en cours comprises)', () => {
    const subject = makeSubject()
    const killua = subject.entries[0]!
    const { value, unseen } = editAttribute(subject, killua, hair, 'Blancs', file)

    expect(value).toEqual(['Blancs'])
    expect(killua.attributes.hair).toEqual(['Blancs'])
    expect(subject.entries[0]).toBe(killua)
    expect(unseen).toEqual(['Blancs']) // personne d'autre n'a les cheveux blancs
    expect(readJson(file).edit['27']).toEqual({ _nom: 'Killua Zoldyck', hair: { plus: ['Blancs'] } })

    editAttribute(subject, killua, age, '14', file)
    expect(readJson(file).edit['27']).toEqual({ _nom: 'Killua Zoldyck', hair: { plus: ['Blancs'] }, age: 14 })
  })

  it('edit d\'une liste : ajoute et retire sans toucher au reste, cumulé avec la correction déjà faite', () => {
    const subject = makeSubject()
    const killua = subject.entries[0]!
    editAttribute(subject, killua, hair, 'Blancs, Gris', file)
    const { value } = editAttribute(subject, killua, hair, 'Argentés, -Gris', file)

    expect(value).toEqual(['Blancs', 'Argentés'])
    expect(readJson(file).edit['27'].hair).toEqual({ plus: ['Blancs', 'Argentés'], moins: ['Gris'] })

    editAttribute(subject, killua, hair, '-', file)
    expect(killua.attributes.hair).toBeNull()
  })

  it('edit ne signale pas une valeur que d\'autres ont déjà', () => {
    const subject = makeSubject()
    expect(editAttribute(subject, subject.entries[0]!, hair, 'Noirs', file).unseen).toEqual([])
  })

  it('remove retire l\'entrée, l\'ajoute une seule fois à exclude, et dit si c\'était la réponse du jour', () => {
    const subject = makeSubject()
    const gon = resolveEntry(subject, 'gon freecss') // un nom tapé à la main, sans passer par l'autocomplétion
    const { redrawn } = removeEntry(subject, gon, { redrawIfTarget: (_, id) => id === '30' }, file)

    expect(redrawn).toBe(true)
    expect(subject.entries.map(entry => entry.id)).toEqual(['27', '31'])
    expect(readJson(file).exclude).toEqual(['30'])
    expect(() => resolveEntry(subject, '30')).toThrow(GameError)
  })
})

describe('applyManual', () => {
  const manual: Manual = {
    exclude: ['30'],
    edit: { 27: { _nom: 'Killua', hair: { plus: ['Blancs'] }, taille: 150 }, 999: { age: 1 } },
    add: [{ id: 'manuel-1', name: 'Perso Manuel', attributes: { gender: 'Femme', age: 20, hair: ['Roux'] } }],
  }

  it('retire, corrige, ajoute, et signale ce qui ne colle pas', () => {
    const original = makeSubject().entries as Entry[]
    const { entries, warnings } = applyManual(original, manual, attributes.map(({ key }) => key))

    expect(entries.map(entry => entry.id)).toEqual(['27', '31', 'manuel-1'])
    expect(entries[0]!.attributes.hair).toEqual(['Blancs'])
    expect(original[0]!.attributes.hair).toBeNull() // les entrées d'origine ne sont pas modifiées
    expect(warnings).toHaveLength(2) // l'id 999 inconnu, et « taille » qui n'est pas un attribut
  })

  it('ne change rien si on l\'applique deux fois (le bot repasse sur un fichier déjà corrigé par les scripts)', () => {
    const keys = attributes.map(({ key }) => key)
    const once = applyManual(makeSubject().entries as Entry[], manual, keys).entries
    expect(applyManual(once, manual, keys).entries).toEqual(once)
  })
})

describe('applySetEdit', () => {
  it('ajoute et retire sans toucher aux autres valeurs (les tags des scripts restent)', () => {
    expect(applySetEdit(['Garde', 'Magicien'], { plus: ['Soldat'], moins: ['Garde'] })).toEqual(['Magicien', 'Soldat'])
    expect(applySetEdit(['Japan', 'Monde réel'], { plus: ['France'] })).toEqual(['Japan', 'Monde réel', 'France'])
  })

  it('une vraie valeur ajoutée remplace Inconnu, Aucune, N/A', () => {
    expect(applySetEdit(['Inconnu', 'Lost in the Galaxy'], { plus: ['Palaven'] })).toEqual(['Lost in the Galaxy', 'Palaven'])
    expect(applySetEdit(['N/A'], { plus: ['Bruns'] })).toEqual(['Bruns'])
    expect(applySetEdit(['Inconnu'], { moins: ['Hyrule'] })).toEqual(['Inconnu'])
  })

  it('vide si tout est retiré, et rien ne change la 2e fois', () => {
    expect(applySetEdit(['Bruns'], { moins: ['Bruns'] })).toBeNull()
    const edit = { plus: ['Soldat'], moins: ['Garde'] }
    const once = applySetEdit(['Garde', 'Inconnu'], edit)
    expect(applySetEdit(once, edit)).toEqual(once)
  })
})
