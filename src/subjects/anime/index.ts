import type { AttributeDef, AttributeValue, Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

const withUnit = (unit: string) => (value: AttributeValue) =>
  typeof value === 'number' ? `${value.toLocaleString('fr-FR')} ${unit}` : '—'

// Indices d'un personnage d'anime : partagés par l'Animedle et le Weebdle
export const characterAttributes: readonly AttributeDef[] = [
  // Le personnage
  { key: 'gender', label: 'Sexe', kind: 'exact' },
  { key: 'age', label: 'Âge', kind: 'number', format: withUnit('ans') },
  { key: 'occupation', label: 'Occupation', kind: 'set' },
  { key: 'hair', label: 'Cheveux', kind: 'set' },
  // Son anime
  { key: 'anime', label: 'Anime', kind: 'exact' },
  { key: 'genres', label: 'Genres', kind: 'set' },
  { key: 'year', label: 'Année', kind: 'number' },
  { key: 'studio', label: 'Studio', kind: 'exact' },
]

// À l'Animedle, l'anime est l'univers du perso, la 1re série de sa franchise (JoJo plutôt que Diamond is Unbreakable).
// Même clé « anime » : les corrections à la main ne changent pas.
const animedleAttributes = characterAttributes.map(attribute => attribute.key === 'anime' ? { ...attribute, label: 'Univers' } : attribute)

// Personnages d'anime : données générées depuis AniList par npm run fetch:anime
export const anime: Subject = {
  // l'id sert aussi de nom de commande : /quiz animedle
  id: 'animedle',
  name: 'Animedle',
  description: 'Trouve le personnage d\'anime mystère',
  attributes: animedleAttributes,
  universeKey: 'anime',
  entries: loadEntries('anime.json', { subjectId: 'animedle', attributes: animedleAttributes }),
}
