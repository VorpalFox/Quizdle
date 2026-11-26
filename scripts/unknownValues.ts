// La règle commune des marques, tous les quiz (validée avec FX) :
//   - Unknown : la source dit en toutes lettres qu'on ne sait pas (« |age = Unknown »).
//   - None : la source dit en toutes lettres qu'il n'y en a pas (« |occupation = None »). Et un mort sans occupation.
//   - N/A : l'indice ne s'applique pas (les cheveux d'un robot ou d'un animal).
//   - Vide : on n'a juste pas trouvé l'info, à compléter à la main. Jamais maquillé en Unknown ou None.
// Unknown, pour tous les indices. Priorité la plus basse (validé avec FX) : n'importe quelle valeur d'une autre source passe
// devant, même une valeur déduite (Humain par défaut, Aucune pour un mort, l'arme dans l'occupation). Chaque source
// note donc seulement les clés concernées dans l'attribut de travail « unknown », et fillUnknowns remplit à la toute
// fin ce qui est resté vide.
import type { AttributeDef, AttributeValue, Entry } from '../src/engine/types.js'

export const UNKNOWN = 'Unknown'
export const UNKNOWN_KEYS = 'unknown'

// « Unknown », « Unknown. », « Unknown (never stated) », « Inconnu », « ? »
const UNKNOWN_VALUE = /^(?:unknown|inconnue?|\?+)\s*(?:\([^)]*\))?\s*[.!]?$/i
export const isUnknownValue = (value: string | null | undefined) => Boolean(value && UNKNOWN_VALUE.test(value.trim()))

// Les clés dont la valeur brute dit « inconnu »
export function unknownKeys(raw: Record<string, string | null | undefined>): string[] {
  return Object.entries(raw).filter(([, value]) => isUnknownValue(value)).map(([key]) => key)
}

// La marque de l'entrée complétée par ces clés, null si rien de neuf
export function addUnknowns(attributes: Readonly<Record<string, AttributeValue>>, keys: readonly string[]): string[] | null {
  const before = (attributes[UNKNOWN_KEYS] as readonly string[] | null | undefined) ?? []
  const added = keys.filter(key => !before.includes(key))
  return added.length > 0 ? [...before, ...added] : null
}

// À la fin, toutes les sources passées : « Inconnu » dans les cases restées vides que la source disait inconnues
// (une liste pour un indice « set »). La marque de travail disparaît.
export function fillUnknowns(entries: Entry[], attributes: readonly AttributeDef[]): Entry[] {
  return entries.map(entry => {
    const { [UNKNOWN_KEYS]: keys, ...rest } = entry.attributes
    const values: Record<string, AttributeValue> = rest
    for (const key of (keys as readonly string[] | null | undefined) ?? []) {
      const attribute = attributes.find(attribute => attribute.key === key)
      if (attribute && (values[key] === null || values[key] === undefined))
        values[key] = attribute.kind === 'set' ? [UNKNOWN] : UNKNOWN
    }
    return { ...entry, attributes: values }
  })
}
