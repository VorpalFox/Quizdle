// Outils AniList partagés par les scripts de l'Animedle (fetchAnime.ts) et du Weebdle (fetchWeebdle.ts)
import { normalize } from '../src/engine/search.js'

const API = 'https://graphql.anilist.co'
// AniList limite à 30 requêtes par minute en ce moment : on y va doucement
export const DELAY_MS = 2500
const MAX_ATTEMPTS = 6

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Une requête GraphQL, avec reprise sur 429 (trop de requêtes) et erreurs serveur
export async function anilist<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
    }).catch((error: unknown) => error as Error)
    const retryable = response instanceof Error || response.status === 429 || response.status >= 500
    if (!retryable && response.ok)
      return (await response.json() as { data: T }).data
    if (!retryable || attempt === MAX_ATTEMPTS) {
      const detail = response instanceof Error ? response.message : `${response.status} : ${await response.text()}`
      throw new Error(`AniList ${JSON.stringify(variables)} : ${detail}`)
    }
    const retryAfter = response instanceof Error ? NaN : Number(response.headers.get('retry-after'))
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? (retryAfter + 1) * 1000 : 10_000 * attempt
    process.stdout.write(`\n  ${response instanceof Error ? response.message : response.status}, nouvel essai dans ${Math.round(wait / 1000)} s\n`)
    await sleep(wait)
  }
}

export const GENDERS: Record<string, string> = { Male: 'Homme', Female: 'Femme' }
export const GENRES: Record<string, string> = {
  'Action': 'Action', 'Adventure': 'Aventure', 'Comedy': 'Comédie', 'Drama': 'Drame', 'Ecchi': 'Ecchi',
  'Fantasy': 'Fantasy', 'Horror': 'Horreur', 'Mahou Shoujo': 'Magical girl', 'Mecha': 'Mecha', 'Music': 'Musique',
  'Mystery': 'Mystère', 'Psychological': 'Psychologique', 'Romance': 'Romance', 'Sci-Fi': 'Science-fiction',
  'Slice of Life': 'Tranche de vie', 'Sports': 'Sport', 'Supernatural': 'Surnaturel', 'Thriller': 'Thriller', 'Hentai': 'Hentai',
}

export interface CharacterName {
  full: string
  native: string | null
  alternative: string[]
}

export const gender = (value: string | null) => value ? GENDERS[value] ?? 'Autre' : null
export const genres = (values: string[]) => values.map(genre => GENRES[genre] ?? genre)

// « JUJUTSU KAISEN Season 2 » → « JUJUTSU KAISEN », « Hunter x Hunter (2011) » → « Hunter x Hunter »
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*\((TV|\d{4})\)$/i, '')
    .replace(/\s*(Season \d+|\d+(st|nd|rd|th) Season|(Second|Third|Final) Season|Part \d+)$/i, '')
    .trim()
}

// Une ligne « __Occupation:__ Teacher » ou « **Hair Color:** Black » de la description AniList.
// Sans les spoilers (~!...!~), les liens et le gras.
export function descriptionField(description: string | null, names: string[]): string | null {
  const pattern = new RegExp(String.raw`^\s*(?:__|\*\*)?\s*(?:${names.join('|')})\s*:?\s*(?:__|\*\*)?\s*:?\s*(.+)$`, 'i')
  for (const line of (description ?? '').split('\n')) {
    const found = pattern.exec(line)
    if (!found)
      continue
    const value = found[1]!
      .replace(/~!.*?(!~|$)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/__|\*\*|<[^>]+>/g, '')
      .trim()
    if (value)
      return value
  }
  return null
}

// « 17-18 » → 17, « 1000+ » → 1000, « 17- » → 17. Sinon la ligne « Age: » de la description.
export function parseAge(age: string | null, description: string | null = null): number | null {
  const found = /\d+/.exec(age ?? '') ?? /^\d+/.exec(descriptionField(description, ['Age']) ?? '')
  return found ? Number(found[0]) : null
}

const MAX_OCCUPATION_LINE = 100

// « Jujutsu Sorcerer, Teacher » → ["Jujutsu Sorcerer", "Teacher"]. En anglais, comme AniList : à trier à la main.
export function parseOccupation(description: string | null): string[] | null {
  const value = descriptionField(description, ['Occupations?', 'Professions?', 'Jobs?', 'Positions?'])
  // Au-delà, ce n'est plus une liste de métiers mais un paragraphe (« Position: Center, ... is insanely strong »)
  if (!value || value.length > MAX_OCCUPATION_LINE)
    return null
  const list = value
    .replace(/~!|!~/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .split(/\s*(?:,|;|\/|\band\b|\bformerly\b|\bprevious(?:ly)?\b)\s*/i)
    .map(part => part.replace(/[.:!]+$/, '').trim())
    .filter(part => part.length > 1 && part.length <= 40)
    .map(part => part[0]!.toUpperCase() + part.slice(1))
  return list.length > 0 ? [...new Set(list)] : null
}

const HAIR_COLORS: [RegExp, string][] = [
  [/black|raven|ebony/i, 'Noirs'], [/white|snow/i, 'Blancs'], [/silver|platinum/i, 'Argentés'], [/gr[ae]y/i, 'Gris'],
  [/blond|golden|gold|yellow/i, 'Blonds'], [/brown|brunette|chestnut|auburn/i, 'Bruns'], [/orange|ginger/i, 'Roux'],
  [/\bred|crimson|scarlet/i, 'Rouges'], [/pink/i, 'Roses'], [/blue|cyan|teal|turquoise/i, 'Bleus'], [/green/i, 'Verts'],
  [/purple|violet|lavender|lilac/i, 'Violets'], [/bald/i, 'Chauve'],
]
const COLOR_WORDS = 'black|raven|ebony|white|snow|silver|platinum|gr[ae]y|blonde?|golden|gold|yellow|brown|brunette|chestnut|auburn|orange|ginger|red|crimson|scarlet|pink|blue|cyan|teal|turquoise|green|purple|violet|lavender|lilac'
// « black hair », « long silver hair », « black and white hair », « red-colored hair »
const HAIR_IN_TEXT = new RegExp(String.raw`\b((?:${COLOR_WORDS})(?:[- ](?:and|or)?[- ]?(?:${COLOR_WORDS}))*)(?:[- ]colou?red)?,?(?:\s+[a-z-]+)?\s+hair\b`, 'i')

const hairColors = (text: string) => HAIR_COLORS.filter(([pattern]) => pattern.test(text)).map(([, color]) => color)

// La couleur des cheveux : la ligne « Hair Color: » de la description, sinon la 1re « black hair » du texte.
// Rare sur AniList (quelques %) : le reste est à compléter à la main.
export function parseHair(description: string | null): string[] | null {
  const field = descriptionField(description, ['Hair Colou?rs?', 'Hair'])
  const fromField = field ? hairColors(field) : []
  if (fromField.length > 0)
    return fromField
  const found = HAIR_IN_TEXT.exec((description ?? '').replace(/~!.*?(!~|$)/gs, ''))
  const fromText = found ? hairColors(found[1]!) : []
  return fromText.length > 0 ? fromText : null
}

// Les noms acceptés : nom complet dans les deux ordres, et les variantes qui contiennent son nom
// (« Satoru Gojo », « Monkey D. Luffy »). Pas les surnoms (« Master », « Zero »...) : écrits dans le salon,
// ils seraient pris pour des propositions.
export function nameVariants(name: CharacterName): string[] {
  const parts = name.full.split(' ')
  const keys = new Set(parts.map(normalize))
  const variants = name.alternative.filter(alt => alt.split(/\s+/).some(word => keys.has(normalize(word))))
  const reversed = parts.length > 1 ? [[...parts].reverse().join(' ')] : []
  return [...reversed, ...variants, ...(name.native ? [name.native] : [])]
}

// Prénom ou nom seul (« Luffy », « Gojou ») : accepté s'il n'appartient qu'à un seul personnage de la liste
export function uniqueNameParts(names: CharacterName[]): (name: CharacterName) => string[] {
  const owners = new Map<string, number>()
  for (const name of names) {
    for (const part of new Set(name.full.split(' ').map(normalize)))
      owners.set(part, (owners.get(part) ?? 0) + 1)
  }
  return name => {
    const parts = name.full.split(' ')
    return parts.length > 1 ? parts.filter(part => owners.get(normalize(part)) === 1) : []
  }
}

// Un alias d'une ou deux lettres (« C. », « zi », ou « d » pour « モンキー・D・ルフィ ») serait reconnu dès qu'on écrit
// cette lettre dans le salon : on ne le garde pas. Le nom complet reste accepté (« L Lawliet », « C.C. »).
// Les noms en japonais (vides une fois normalisés) ne gênent pas la recherche.
const MIN_ALIAS_LENGTH = 3
const usableAlias = (alias: string) => {
  const key = normalize(alias)
  return key === '' || key.length >= MIN_ALIAS_LENGTH
}

export function aliases(name: CharacterName, uniqueParts: (name: CharacterName) => string[]): string[] {
  return [...new Set([...nameVariants(name), ...uniqueParts(name)])].filter(usableAlias)
}

// « Cú  Chulainn » → « Cú Chulainn »
export const cleanName = (name: CharacterName): CharacterName => ({ ...name, full: name.full.replace(/\s+/g, ' ').trim() })
