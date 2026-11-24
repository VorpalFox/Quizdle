import { type AttributeDef, type AttributeValue, NOT_APPLICABLE, type Subject } from '../../engine/types.js'
import { loadEntries } from '../loadEntries.js'

const withUnit = (unit: string) => (value: AttributeValue) =>
  typeof value === 'number' ? `${value.toLocaleString('fr-FR')} ${unit}` : value === NOT_APPLICABLE ? value : '—'

// Aucun filtre anti-spoil (validé avec FX : un indice qui manque embrouille plus qu'il ne protège), seule la mort
// n'est jamais dite. Affiché au lancement de l'Animedle et du Weebdle.
export const ANIME_SPOILER_WARNING = 'Attention aux spoilers : les indices disent tout ce que les personnages sont dans l\'histoire, révélations comprises.'

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
  warning: ANIME_SPOILER_WARNING,
  entries: loadEntries('anime.json', { subjectId: 'animedle', attributes: animedleAttributes }),
}
