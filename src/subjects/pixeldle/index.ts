import type { AttributeDef, Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

// Personnages de jeu vidéo : 5 indices sur le personnage, 4 sur son 1er jeu (Wikidata).
const attributes: readonly AttributeDef[] = [
  // Le personnage
  { key: 'gender', label: 'Sexe', kind: 'exact' },
  { key: 'species', label: 'Espèce', kind: 'set' },
  { key: 'nationality', label: 'Nationalité', kind: 'set' },
  { key: 'occupation', label: 'Occupation', kind: 'set' },
  { key: 'hair', label: 'Cheveux', kind: 'set' },
  // Son 1er jeu
  { key: 'franchise', label: 'Franchise', kind: 'exact' },
  { key: 'developer', label: 'Développeur', kind: 'exact' },
  { key: 'genres', label: 'Genres', kind: 'set' },
  { key: 'year', label: '1re apparition', kind: 'number' },
]

// Données générées depuis Wikidata par npm run fetch:pixeldle (voir TODO-Pixeldle.md), corrections à la main dans data/pixeldle-manual.json
export const pixeldle: Subject = {
  // l'id sert aussi de nom de commande : /quiz pixeldle
  id: 'pixeldle',
  name: 'Pixeldle',
  description: 'Trouve le personnage de jeu vidéo mystère',
  attributes,
  universeKey: 'franchise',
  entries: loadEntries('pixeldle.json', { subjectId: 'pixeldle', attributes }),
}
