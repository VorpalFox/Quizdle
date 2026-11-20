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
    { key: 'habitat', label: 'Habitat', kind: 'exact' },
    { key: 'eggGroups', label: 'Groupes d\'œufs', kind: 'set' },
    { key: 'color', label: 'Couleur', kind: 'exact' },
    { key: 'stage', label: "Stade d'évolution", kind: 'number' },
    { key: 'height', label: 'Taille', kind: 'number', format: withUnit('m') },
    { key: 'weight', label: 'Poids', kind: 'number', format: withUnit('kg') },
    { key: 'generation', label: 'Génération', kind: 'number' },
  ],
  entries: loadEntries('pokemon.json'),
}
