import type { AttributeValue, Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

const withUnit = (unit: string) => (value: AttributeValue) =>
  typeof value === 'number' ? `${value.toLocaleString('fr-FR')} ${unit}` : '—'

export const pokemon: Subject = {
  // l'id sert aussi de nom de commande : /quiz pokedle
  id: 'pokedle',
  name: 'Pokédle',
  description: 'Trouve le Pokémon mystère',
  attributes: [
    { key: 'types', label: 'Types', kind: 'set' },
    // une liste : officiel jusqu'à la 3e génération, déduit (parfois plusieurs) au-delà
    { key: 'habitat', label: 'Habitat', kind: 'set' },
    { key: 'eggGroups', label: 'Egg groups', kind: 'set' },
    { key: 'color', label: 'Color', kind: 'exact' },
    { key: 'stage', label: 'Evolution stage', kind: 'number' },
    { key: 'height', label: 'Height', kind: 'number', format: withUnit('m') },
    { key: 'weight', label: 'Weight', kind: 'number', format: withUnit('kg') },
    { key: 'generation', label: 'Generation', kind: 'number' },
  ],
  entries: loadEntries('pokemon.json'),
}
