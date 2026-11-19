import type { AttributeValue, Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

const withUnit = (unit: string) => (value: AttributeValue) =>
  typeof value === 'number' ? `${value.toLocaleString('fr-FR')} ${unit}` : '—'

// Personnages d'anime : données générées depuis AniList par npm run fetch:anime
export const anime: Subject = {
  // l'id sert aussi de nom de commande : /quiz animedle
  id: 'animedle',
  name: 'Animedle',
  description: 'Trouve le personnage d\'anime mystère',
  attributes: [
    { key: 'gender', label: 'Sexe', kind: 'exact' },
    { key: 'age', label: 'Âge', kind: 'number', format: withUnit('ans') },
    { key: 'height', label: 'Taille', kind: 'number', format: withUnit('cm') },
    { key: 'anime', label: 'Anime', kind: 'exact' },
    { key: 'genres', label: 'Genres', kind: 'set' },
    { key: 'studio', label: 'Studio', kind: 'exact' },
    { key: 'year', label: 'Année', kind: 'number' },
    { key: 'source', label: 'Source', kind: 'exact' },
  ],
  entries: loadEntries('anime.json'),
}
