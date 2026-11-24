import type { AttributeValue } from '../../engine/types.js'

// Les lieux que le script ajoute à la nationalité (scripts/pixeldleTranslate.ts, withWorld) : le monde de la franchise
// et ses univers partagés, pour que des personnages de franchises différentes se croisent
export const REAL_WORLD = 'Monde réel'
export const OTHER_WORLD = 'Inconnu'
export const SPACE = 'Lost in the Galaxy'
export const CTHULHU_MYTHOS = 'Mythe de Cthulhu'

const ADDED = [REAL_WORLD, SPACE, CTHULHU_MYTHOS]
const asList = (value: AttributeValue) => Array.isArray(value) ? value.map(String) : value === null ? [] : [String(value)]

// Une nationalité corrigée à la main (edit du manuel, /quizdebug) garde les lieux ajoutés par le script, comme il le
// refait à chaque génération : le bot, qui réapplique les corrections au chargement, retombe sur le fichier généré.
// Inconnu (« d'un autre monde, lieu inconnu ») seulement s'il ne reste aucun lieu.
export function keepWorlds(edited: AttributeValue, previous: AttributeValue): AttributeValue {
  const places = asList(edited)
  const before = asList(previous)
  const located = places.some(place => place !== OTHER_WORLD && !ADDED.includes(place))
  const unknown = !located && (before.includes(OTHER_WORLD) || places.includes(OTHER_WORLD))
  const kept = [...unknown && !places.includes(OTHER_WORLD) ? [OTHER_WORLD] : [], ...places.filter(place => unknown || place !== OTHER_WORLD),
    ...ADDED.filter(world => before.includes(world) && !places.includes(world))]
  return kept.length > 0 ? kept : null
}
