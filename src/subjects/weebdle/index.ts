import type { Subject } from '../../engine/types.js'
import { characterAttributes } from '../anime/index.js'
import { loadEntries } from '../loadEntries.js'

// Personnages des animes recommandés sur le serveur (data/recommendations.json).
// Pour l'instant data/weebdle.json n'a qu'une entrée factice : les vraies données viendront plus tard.
export const weebdle: Subject = {
  // l'id sert aussi de nom de commande : /quiz weebdle
  id: 'weebdle',
  name: 'Weebdle',
  description: 'Trouve le personnage mystère, tiré des animes conseillés sur le serveur',
  attributes: characterAttributes,
  universeKey: 'anime',
  entries: loadEntries('weebdle.json', { subjectId: 'weebdle', attributes: characterAttributes }),
}
