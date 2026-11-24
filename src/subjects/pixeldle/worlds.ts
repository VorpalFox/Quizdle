import { NOT_APPLICABLE, type AttributeValue } from '../../engine/types.js'

// Les lieux que le script ajoute à la nationalité (scripts/pixeldleTranslate.ts, withWorld) : le monde de la franchise
// et ses univers partagés, pour que des personnages de franchises différentes se croisent
export const REAL_WORLD = 'Monde réel'
export const OTHER_WORLD = 'Inconnu'
export const SPACE = 'Lost in the Galaxy'
export const CTHULHU_MYTHOS = 'Mythe de Cthulhu'

// Les valeurs par défaut d'un champ vide (Inconnu, Aucune pour l'occupation d'un animal, N/A pour les cheveux d'un
// robot, Au choix pour un avatar) : remplacées par une correction qui donne une vraie valeur, gardées si elle vide le champ
const DEFAULTS = new Set([OTHER_WORLD, 'Aucune', NOT_APPLICABLE, 'Au choix'])
const asList = (value: AttributeValue) => Array.isArray(value) ? value.map(String) : value === null ? [] : [String(value)]

// Une correction à la main (edit du manuel, /quizdebug) qui vide le champ garde sa valeur par défaut, comme le script
// la remet à chaque génération : le bot, qui réapplique les corrections au chargement, retombe sur le fichier généré.
// Les tags ajoutés par le script à chaque personnage (l'occupation tirée de l'arme) sont gardés à part : Entry.added.
export function keepDefault(edited: AttributeValue, previous: AttributeValue): AttributeValue {
  if (asList(edited).length > 0)
    return edited
  const defaults = asList(previous).filter(value => DEFAULTS.has(value))
  return defaults.length > 0 ? defaults : edited
}

// La nationalité garde aussi les mondes ajoutés par le script, les mêmes pour tous : pas besoin de les noter un par un
const WORLDS = [REAL_WORLD, SPACE, CTHULHU_MYTHOS]
export function keepWorlds(edited: AttributeValue, previous: AttributeValue): AttributeValue {
  const places = asList(keepDefault(edited, previous))
  const kept = [...places, ...WORLDS.filter(world => asList(previous).includes(world) && !places.includes(world))]
  return kept.length > 0 ? kept : null
}
