import type { Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

// Personnages de jeu vidéo : 5 indices sur le personnage, 4 sur son 1er jeu (Wikidata).
// Pour l'instant data/pixeldle.json n'a qu'une entrée factice : les vraies données viendront plus tard (voir TODO-Pixeldle.md).
export const pixeldle: Subject = {
  // l'id sert aussi de nom de commande : /quiz pixeldle
  id: 'pixeldle',
  name: 'Pixeldle',
  description: 'Trouve le personnage de jeu vidéo mystère',
  attributes: [
    // Le personnage
    { key: 'gender', label: 'Sexe', kind: 'exact' },
    { key: 'species', label: 'Espèce', kind: 'exact' },
    { key: 'nationality', label: 'Nationalité', kind: 'exact' },
    { key: 'occupation', label: 'Occupation', kind: 'set' },
    { key: 'hair', label: 'Cheveux', kind: 'set' },
    // Son 1er jeu
    { key: 'franchise', label: 'Franchise', kind: 'exact' },
    { key: 'developer', label: 'Développeur', kind: 'exact' },
    { key: 'genres', label: 'Genres', kind: 'set' },
    { key: 'year', label: '1re apparition', kind: 'number' },
  ],
  entries: loadEntries('pixeldle.json'),
}
