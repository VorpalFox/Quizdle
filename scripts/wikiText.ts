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
const BALD = /\bbald\b|\bhairless\b|shaved head|shaven head/gi
const BALD_HAIR = 'Chauve'
// Pas chauve aujourd'hui : il commence à l'être (Kano : « appears to be going bald », Scorpion : « graying hair, which
// has begun to bald »), c'était avant (Hinata : « Before
// his death, Hinata had a shaved head »), ou c'est une autre version du perso (Kung Lao : « Kung Lao's revenant form »,
// Sub-Zero : « he seems to have aged greatly. He is completely bald »). Lu dans la phrase et celle d'avant.
const NOT_BALD_NOW = /\b(?:going|begun to|beginning to|starting to|started to) bald|\b(?:past|before|younger|used to|once|formerly|revenant|(?<!middle-)aged|future|alternate|zombie|undead|costumes?|variants?)\b|\bhad (?:a )?(?:shaved|shaven|bald)\b/i

// Le 1er « bald » qui décrit le perso tel qu'il est
function currentBald(plain: string): RegExpMatchArray | null {
  for (const found of plain.matchAll(BALD)) {
    const start = plain.lastIndexOf('.', plain.lastIndexOf('.', found.index) - 1) + 1
    const end = plain.indexOf('.', found.index + found[0].length)
    const context = plain.slice(Math.max(start, plain.lastIndexOf('\n', found.index) + 1), end < 0 ? undefined : end)
    if (!NOT_BALD_NOW.test(context))
      return found
  }
  return null
}
const FORMER_HAIR = /\b(?:former|formerly|used to|previously|once had)\b/i
const FORMER_WINDOW = 25

// Les cheveux cités par la page (« long blonde hair ») : d'abord dans la section Appearance, sinon dans tout le texte.
// Sans les phrases qui correspondent à skip (DEVELOPMENT pour Wikipédia). Avec l'extrait, à relire dans le récap.
// Les cheveux sont une liste : un perso devenu chauve garde aussi ses anciens cheveux (Saitama : Chauve, Noirs, validé
// avec FX), la couleur actuelle d'abord.
export function textHair(wikitext: string, skip?: RegExp): { colors: string[], excerpt: string } | null {
  const section = APPEARANCE.exec(wikitext)?.[1]
  const around = (plain: string, index: number, length: number) => plain.slice(Math.max(0, index - 60), index + length + 20).replace(/\s+/g, ' ').trim()
  for (const text of [section, wikitext]) {
    if (!text)
      continue
    const plain = plainText(text)
    // Chauve, seulement dans la section Appearance : ailleurs, « bald » peut décrire un autre perso
    const bald = text === section ? currentBald(plain) : null
    const current: string[] = bald ? [BALD_HAIR] : []
    const former: string[] = []
    let excerpt = bald ? around(plain, bald.index!, bald[0].length) : ''
    for (const found of plain.matchAll(HAIR_IN_TEXT_ALL)) {
      const end = plain.indexOf('.', found.index + found[0].length)
      const sentence = plain.slice(plain.lastIndexOf('.', found.index) + 1, end < 0 ? undefined : end)
      const colors = hairColors(found[1]!)
      if (skip?.test(sentence) || colors.length === 0)
        continue
      excerpt ||= around(plain, found.index, found[0].length)
      // Les anciens cheveux, annoncés juste avant (« which replaced his former short black hair », « She used to have
      // long brown hair ») : gardés après, on cherche encore la couleur actuelle. Pas « blue-grey hair (formerly
      // blue-black) » : la couleur actuelle vient d'abord.
      const before = plain.slice(Math.max(0, found.index - FORMER_WINDOW), found.index)
      if (FORMER_HAIR.test(before)) {
        former.push(...colors)
        continue
      }
      current.push(...colors)
      break
    }
    const all = [...new Set([...current, ...former])].slice(0, MAX_HAIR_COLORS)
    if (all.length > 0)
      return { colors: all, excerpt }
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
