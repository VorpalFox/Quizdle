import type { AttributeDef, AttributeValue, Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

// Un perso d'un jeu pas encore sorti (Meryl, de Mother 4) : plus récent que tous, affiché « Futur »
export const FUTURE_YEAR = 9999
const formatYear = (value: AttributeValue) => value === FUTURE_YEAR ? 'Future' : value === null ? '—' : String(value)

// Personnages de jeu vidéo : 5 indices sur le personnage, 4 sur son 1er jeu (Wikidata).
const attributes: readonly AttributeDef[] = [
  // Le personnage
  { key: 'gender', label: 'Gender', kind: 'exact' },
  { key: 'species', label: 'Species', kind: 'set' },
  { key: 'nationality', label: 'Nationality', kind: 'set' },
  { key: 'occupation', label: 'Occupation', kind: 'set' },
  { key: 'hair', label: 'Hair', kind: 'set' },
  // Son 1er jeu
  { key: 'franchise', label: 'Franchise', kind: 'exact' },
  { key: 'developer', label: 'Developer', kind: 'exact' },
  { key: 'genres', label: 'Genres', kind: 'set' },
  { key: 'year', label: 'First appearance', kind: 'number', format: formatYear },
]

// Données générées depuis Wikidata par npm run fetch:pixeldle (voir scripts/README.md), corrections à la main dans data/pixeldle-manual.json
export const pixeldle: Subject = {
  // l'id sert aussi de nom de commande : /quiz pixeldle
  id: 'pixeldle',
  name: 'Pixeldle',
  description: 'Trouve le personnage de jeu vidéo mystère',
  attributes,
  universeKey: 'franchise',
  entries: loadEntries('pixeldle.json', { subjectId: 'pixeldle', attributes }),
}
