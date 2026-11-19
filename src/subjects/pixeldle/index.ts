import type { Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

// Personnages de jeu vidéo. Les indices viennent surtout de leur 1er jeu (Wikidata).
// Pour l'instant data/pixeldle.json n'a qu'une entrée factice : les vraies données viendront plus tard (voir TODO-Pixeldle.md).
export const pixeldle: Subject = {
  // l'id sert aussi de nom de commande : /quiz pixeldle
  id: 'pixeldle',
  name: 'Pixeldle',
  description: 'Trouve le personnage de jeu vidéo mystère',
  attributes: [
    { key: 'gender', label: 'Sexe', kind: 'exact' },
    { key: 'species', label: 'Espèce', kind: 'exact' },
    { key: 'franchise', label: 'Franchise', kind: 'exact' },
    { key: 'year', label: '1re apparition', kind: 'number' },
    { key: 'developer', label: 'Développeur', kind: 'exact' },
    { key: 'genres', label: 'Genres', kind: 'set' },
    { key: 'platform', label: 'Plateforme', kind: 'exact' },
  ],
  entries: loadEntries('pixeldle.json'),
}
