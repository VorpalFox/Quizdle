import type { AttributeDef, AttributeValue, Subject } from '../../engine/types.js'
import { ANIME_SPOILER_WARNING, characterAttributes } from '../anime/index.js'
import { loadEntries } from '../loadEntries.js'

const formatHeight = (value: AttributeValue) => typeof value === 'number' ? `${value} cm` : value === null ? '—' : String(value)

// Les indices de l'Animedle, plus l'espèce, la taille et la source de l'anime : le Weebdle a beaucoup de persos peu
// connus, il lui faut des indices qui se croisent d'un anime à l'autre (comme l'espèce et la nationalité du Pixeldle)
const extra: Record<string, AttributeDef> = {
  species: { key: 'species', label: 'Espèce', kind: 'set' },
  height: { key: 'height', label: 'Taille', kind: 'number', format: formatHeight },
  source: { key: 'source', label: 'Source', kind: 'exact' },
}
// Chaque nouvel indice juste après celui-ci
const after: Record<string, string> = { gender: 'species', age: 'height', studio: 'source' }
export const weebdleAttributes: readonly AttributeDef[] = characterAttributes.flatMap(attribute =>
  after[attribute.key] ? [attribute, extra[after[attribute.key]!]!] : [attribute])

// Personnages des animes recommandés sur le serveur (data/recommendations.json), générés par npm run fetch:weebdle
export const weebdle: Subject = {
  // l'id sert aussi de nom de commande : /quiz weebdle
  id: 'weebdle',
  name: 'Weebdle',
  description: 'Trouve le personnage mystère, tiré des animes conseillés sur le serveur',
  attributes: weebdleAttributes,
  universeKey: 'anime',
  warning: ANIME_SPOILER_WARNING,
  entries: loadEntries('weebdle.json', { subjectId: 'weebdle', attributes: weebdleAttributes }),
}
