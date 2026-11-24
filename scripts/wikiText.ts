// Ce qu'on lit dans le texte d'une page de wiki, partagé par le Pixeldle et le Weebdle : les cheveux (« long blonde
// hair »), en sautant au besoin ce qui parle de la conception du personnage (Wikipédia), et les liens d'une page
// d'homonymie.
import { normalize } from '../src/engine/search.js'
import { HAIR_IN_TEXT, hairColors } from './anilist.js'

const MAX_HAIR_COLORS = 2

// Le texte lisible d'une page : sans commentaires, références, balises ni gras, les liens réduits à leur texte
export const plainText = (wikitext: string) => wikitext
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '')
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
  .replace(/'{2,}/g, '')
  .replace(/<[^>]+>/g, ' ')

// La section « Appearance » (ou « Design », « Description ») : là où la page décrit le physique
const APPEARANCE = /^==+\s*(?:physical\s+)?(?:appearance|design|description)\s*==+\s*$([\s\S]*?)(?=^==[^=]|(?![\s\S]))/im

// Ce que Wikipédia raconte de la conception du personnage, pas de ce qu'il est dans le jeu : « the original design »,
// « the novel redesigns him with long red hair », « an outfit was considered to have black hair »
export const DEVELOPMENT = /\b(?:original(?:ly)?|initial(?:ly)?|concepts?|early|considered|redesign\w*|prototypes?|novels?|films?|adaptations?|cosplay\w*|beta|corpse)\b/i
const HAIR_IN_TEXT_ALL = new RegExp(HAIR_IN_TEXT.source, 'gi')

// Les cheveux cités par la page (« long blonde hair ») : d'abord dans la section Appearance, sinon dans tout le texte.
// Sans les phrases qui correspondent à skip (DEVELOPMENT pour Wikipédia). Avec l'extrait, à relire dans le récap.
export function textHair(wikitext: string, skip?: RegExp): { colors: string[], excerpt: string } | null {
  const section = APPEARANCE.exec(wikitext)?.[1]
  for (const text of [section, wikitext]) {
    if (!text)
      continue
    const plain = plainText(text)
    for (const found of plain.matchAll(HAIR_IN_TEXT_ALL)) {
      const end = plain.indexOf('.', found.index + found[0].length)
      const sentence = plain.slice(plain.lastIndexOf('.', found.index) + 1, end < 0 ? undefined : end)
      if (skip?.test(sentence))
        continue
      const colors = hairColors(found[1]!).slice(0, MAX_HAIR_COLORS)
      if (colors.length > 0)
        return { colors, excerpt: plain.slice(Math.max(0, found.index - 60), found.index + found[0].length + 20).replace(/\s+/g, ' ').trim() }
    }
  }
  return null
}

// Une page d'homonymie (« Alena » sur le wiki Dragon Quest) : ses liens « Alena (…) », d'abord ceux dont la parenthèse
// passe prefer (la franchise, l'anime), puis « (character) », sans ceux qui correspondent à skip (les adaptations)
const MAX_DISAMBIGUATION_TITLES = 3
export const ADAPTATION = /manga|anime|film|movie|tv|series|comic|novel|book|card|item|weapon|location/i
export function disambiguationLinks(page: string, name: string, prefer: (qualifier: string) => boolean, skip: RegExp = ADAPTATION): string[] {
  if (!/\{\{\s*disambig|may refer to/i.test(page))
    return []
  const links = [...page.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)].map(match => match[1]!.trim().replace(/_/g, ' '))
  const rank = (qualifier: string) => prefer(qualifier) ? 0 : /character/i.test(qualifier) ? 1 : 2
  return [...new Set(links)]
    .map(title => ({ title, match: /^(.+?)\s*\(([^)]+)\)\s*$/.exec(title) }))
    .filter(({ match }) => match !== null && normalize(match[1]!) === normalize(name) && !skip.test(match[2]!))
    .map(({ title, match }) => ({ title, qualifier: match![2]! }))
    .sort((a, b) => rank(a.qualifier) - rank(b.qualifier))
    .map(({ title }) => title)
    .slice(0, MAX_DISAMBIGUATION_TITLES)
}

// L'âge de l'infobox : le 1er nombre (« 16 (Part I), 19 (Part II) » → 16, « 17-18 » → 17, « 1, 000+ » → 1000), sans
// ce qui est entre parenthèses (« Late 20s (1999) » : une date), la naissance (« Born circa 1929 »), une décennie
// (« 20s »), un âge en mois (« ~2 months old (Part 1), 50 (Part 2) » → 50)
const MAX_AGE = 1_000_000
const AGE = /(?<![\d/.-])(\d{1,3}(?:,\s?\d{3})+|\d+)(?![\d/]|s\b|\s*(?:months?|weeks?|days?|hours?)\b)/i
export function infoboxAge(value: string | null): number | null {
  const text = (value ?? '').replace(/\([^)]*\)/g, ' ').replace(/\bborn\b[^,]*,?/gi, ' ')
  const found = AGE.exec(text)
  const age = found ? Number(found[1]!.replace(/[,\s]/g, '')) : null
  return age !== null && age <= MAX_AGE ? age : null
}
