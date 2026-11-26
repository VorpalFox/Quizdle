// Ce qu'on lit dans le texte d'une page de wiki, partagé par le Pixeldle et le Weebdle : les cheveux (« long blonde
// hair »), en sautant au besoin ce qui parle de la conception du personnage (Wikipédia), et les liens d'une page
// d'homonymie.
import { normalize } from '../src/engine/search.js'
import { COLOR_WORDS, DARK_HAIR, DARK_HAIR_IN_TEXT, HAIR_IN_TEXT, hairColors } from './anilist.js'

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
const DARK_HAIR_IN_TEXT_ALL = new RegExp(DARK_HAIR_IN_TEXT.source, 'gi')
const BALD = /\bbald\b|\bhairless\b|shaved head|shaven head/gi
const BALD_HAIR = 'Bald'
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
// Les cheveux sont une liste : un perso devenu chauve garde aussi ses anciens cheveux (Saitama : Bald, Black, validé
// avec FX), la couleur actuelle d'abord. « Dark hair » (noirs) seulement si la page ne cite aucune vraie couleur. Sans
// les citations : ce que le perso dit, pas ce qu'il est (Gwendolin : « I like blue hair... and blue fire! »).
export function textHair(wikitext: string, skip?: RegExp): { colors: string[], excerpt: string } | null {
  const text = wikitext.replace(QUOTE_TEMPLATE, '')
  return hairIn(text, HAIR_IN_TEXT_ALL, skip) ?? subjectHair(text, skip) ?? hairIn(text, DARK_HAIR_IN_TEXT_ALL, skip)
}

// La couleur après le mot « hair », dans la section Appearance seulement : « Her hair is tied into two pigtails, with
// the left being black and the right being pink » (Zoe Rayne, Palworld), « His hair is purple with yellow tips ».
// La phrase s'arrête aux yeux, à la peau et aux parenthèses (« his hair is light blond and his eyes are light blue »,
// « purple (in the light novel it's often said her hair is black) »). La couleur doit finir la phrase ou être suivie
// d'un mot de cheveux (« yellow tips », « pink highlights », « gray in color ») : pas celle d'un accessoire ou d'autre
// chose (« a brown band », « two blue pins », « a blue tiara », « turquoise leaves », « smoky purple air »).
const HAIR_SUBJECT = /\b(?:her|his|their|its)\s+hair\s+(?:is|are|was|were)\b([^.!?]*)/gi
const END_OF_HAIR = /\(|\b(?:eyes?|skin)\b/i
const SUBJECT_COLOR = new RegExp(String.raw`\b(?:${COLOR_WORDS})\b(?=\s*(?:$|[,;:]|(?:-|\s)(?:and|or|but|with|in|colou?r(?:ed)?|tips?|streaks?|highlights?|dreadlocks|locks|strands|bangs|tint|tone|hue|shade|dyed|ends?)\b))`, 'gi')
function subjectHair(wikitext: string, skip?: RegExp): { colors: string[], excerpt: string } | null {
  const section = APPEARANCE.exec(wikitext)?.[1]
  if (!section)
    return null
  for (const found of plainText(section).matchAll(HAIR_SUBJECT)) {
    if (skip?.test(found[0]))
      continue
    const clause = found[1]!.split(END_OF_HAIR)[0]!
    const colors = [...new Set([...clause.matchAll(SUBJECT_COLOR)].flatMap(match => hairColors(match[0])))].slice(0, MAX_HAIR_COLORS)
    if (colors.length > 0)
      return { colors, excerpt: found[0].replace(/\s+/g, ' ').trim().slice(0, 100) }
  }
  return null
}
const QUOTE_TEMPLATE = /\{\{\s*(?:quote|cquote|quotation|dialogue)\b[^{}]*(?:\{\{[^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*\}\}[^{}]*)*\}\}/gi

function hairIn(wikitext: string, pattern: RegExp, skip?: RegExp): { colors: string[], excerpt: string } | null {
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
    for (const found of plain.matchAll(pattern)) {
      const end = plain.indexOf('.', found.index + found[0].length)
      const sentence = plain.slice(plain.lastIndexOf('.', found.index) + 1, end < 0 ? undefined : end)
      const colors = pattern === DARK_HAIR_IN_TEXT_ALL ? [DARK_HAIR] : hairColors(found[1]!)
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
