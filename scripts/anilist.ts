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
export const SOURCES: Record<string, string> = {
  MANGA: 'Manga', LIGHT_NOVEL: 'Light novel', ORIGINAL: 'Original', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Jeu vidéo',
  NOVEL: 'Roman', WEB_NOVEL: 'Web novel', DOUJINSHI: 'Doujinshi', OTHER: 'Autre', GAME: 'Jeu',
}

export interface CharacterName {
  full: string
  native: string | null
  alternative: string[]
}

export const gender = (value: string | null) => value ? GENDERS[value] ?? 'Autre' : null
export const genres = (values: string[]) => values.map(genre => GENRES[genre] ?? genre)
export const source = (value: string | null) => value ? SOURCES[value] ?? value : null

// « JUJUTSU KAISEN Season 2 » → « JUJUTSU KAISEN », « Hunter x Hunter (2011) » → « Hunter x Hunter »
export function cleanTitle(title: string): string {
  return title
    .replace(/\s*\((TV|\d{4})\)$/i, '')
    .replace(/\s*(Season \d+|\d+(st|nd|rd|th) Season|(Second|Third|Final) Season|Part \d+)$/i, '')
    .trim()
}

// « 17-18 » → 17, « 1000+ » → 1000, « 17- » → 17
export function parseAge(age: string | null): number | null {
  const found = /\d+/.exec(age ?? '')
  return found ? Number(found[0]) : null
}

// Dans la description : « __Height:__ 170 cm (5'7") », ou « 1,65m »
export function parseHeight(description: string | null): number | null {
  const line = (description ?? '').split('\n').find(text => /height/i.test(text))
  if (!line)
    return null
  const cm = /(\d{2,3}(?:[.,]\d+)?)\s*cm/i.exec(line)
  if (cm)
    return Math.round(Number(cm[1]!.replace(',', '.')))
  const meters = /(\d[.,]\d{1,2})\s*m\b/i.exec(line)
  return meters ? Math.round(Number(meters[1]!.replace(',', '.')) * 100) : null
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
