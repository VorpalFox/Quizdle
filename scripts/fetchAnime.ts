// Génère data/anime.json (personnages de l'Animedle) depuis AniList. Usage : npm run fetch:anime -- [nombre de personnages, 200 par défaut]
// On prend les personnages les plus mis en favoris : ceux que les fans connaissent.
import { writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'

const API = 'https://graphql.anilist.co'
const count = Number(process.argv[2] ?? 200)
const PER_PAGE = 25
// AniList limite à 30 requêtes par minute en ce moment : on y va doucement
const DELAY_MS = 2500

const QUERY = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    characters(sort: FAVOURITES_DESC) {
      id
      name { full native alternative }
      gender
      age
      description
      image { large }
      media(type: ANIME, sort: START_DATE, perPage: 25) {
        nodes { format title { romaji english } startDate { year } genres source studios(isMain: true) { nodes { name } } }
      }
    }
  }
}`

const GENDERS: Record<string, string> = { Male: 'Homme', Female: 'Femme' }
const GENRES: Record<string, string> = {
  'Action': 'Action', 'Adventure': 'Aventure', 'Comedy': 'Comédie', 'Drama': 'Drame', 'Ecchi': 'Ecchi',
  'Fantasy': 'Fantasy', 'Horror': 'Horreur', 'Mahou Shoujo': 'Magical girl', 'Mecha': 'Mecha', 'Music': 'Musique',
  'Mystery': 'Mystère', 'Psychological': 'Psychologique', 'Romance': 'Romance', 'Sci-Fi': 'Science-fiction',
  'Slice of Life': 'Tranche de vie', 'Sports': 'Sport', 'Supernatural': 'Surnaturel', 'Thriller': 'Thriller', 'Hentai': 'Hentai',
}
const SOURCES: Record<string, string> = {
  MANGA: 'Manga', LIGHT_NOVEL: 'Light novel', ORIGINAL: 'Original', VISUAL_NOVEL: 'Visual novel', VIDEO_GAME: 'Jeu vidéo',
  NOVEL: 'Roman', WEB_NOVEL: 'Web novel', DOUJINSHI: 'Doujinshi', OTHER: 'Autre', GAME: 'Jeu',
}
// On préfère une série TV comme « anime du personnage », sinon un film ou autre
const FORMAT_PRIORITY = ['TV', 'ONA', 'TV_SHORT', 'MOVIE', 'OVA', 'SPECIAL']

interface Media {
  format: string
  title: { romaji: string, english: string | null }
  startDate: { year: number | null }
  genres: string[]
  source: string | null
  studios: { nodes: { name: string }[] }
}

interface Character {
  id: number
  name: { full: string, native: string | null, alternative: string[] }
  gender: string | null
  age: string | null
  description: string | null
  image: { large: string }
  media: { nodes: Media[] }
}

async function fetchPage(page: number, perPage: number): Promise<Character[]> {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { page, perPage } }),
  })
  if (!response.ok)
    throw new Error(`${response.status} sur la page ${page} : ${await response.text()}`)
  const json = await response.json() as { data: { Page: { characters: Character[] } } }
  return json.data.Page.characters
}

// La 1re série où le personnage apparaît : « Hunter x Hunter » plutôt que la version 2011, « JUJUTSU KAISEN » plutôt que la saison 2
function mainAnime(character: Character): Media | undefined {
  const dated = character.media.nodes.filter(media => media.startDate.year)
  for (const format of FORMAT_PRIORITY) {
    const found = dated.find(media => media.format === format) // déjà triés par date de sortie
    if (found)
      return found
  }
  return dated[0]
}

// « JUJUTSU KAISEN Season 2 » → « JUJUTSU KAISEN », « Hunter x Hunter (2011) » → « Hunter x Hunter »
function cleanTitle(media: Media): string {
  return (media.title.english ?? media.title.romaji)
    .replace(/\s*\((TV|\d{4})\)$/i, '')
    .replace(/\s*(Season \d+|\d+(st|nd|rd|th) Season|(Second|Third|Final) Season|Part \d+)$/i, '')
    .trim()
}

// « 17-18 » → 17, « 1000+ » → 1000, « 17- » → 17
function parseAge(age: string | null): number | null {
  const found = /\d+/.exec(age ?? '')
  return found ? Number(found[0]) : null
}

// Dans la description : « __Height:__ 170 cm (5'7") », ou « 1,65m »
function parseHeight(description: string | null): number | null {
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
function nameVariants(character: Character): string[] {
  const parts = character.name.full.split(' ')
  const keys = new Set(parts.map(normalize))
  const variants = character.name.alternative.filter(alt => alt.split(/\s+/).some(word => keys.has(normalize(word))))
  const reversed = parts.length > 1 ? [[...parts].reverse().join(' ')] : []
  return [...reversed, ...variants, ...(character.name.native ? [character.name.native] : [])]
}

const characters: Character[] = []
for (let page = 1; characters.length < count; page++) {
  const batch = await fetchPage(page, PER_PAGE)
  if (batch.length === 0)
    break
  characters.push(...batch)
  process.stdout.write(`\r${Math.min(characters.length, count)}/${count}`)
  await new Promise(resolve => setTimeout(resolve, DELAY_MS))
}

const kept = characters.slice(0, count).filter(character => mainAnime(character))

// Prénom ou nom seul (« Luffy », « Gojou ») : accepté s'il n'appartient qu'à un seul personnage
const partOwners = new Map<string, number>()
for (const character of kept) {
  for (const part of new Set(character.name.full.split(' ').map(normalize)))
    partOwners.set(part, (partOwners.get(part) ?? 0) + 1)
}

const entries = kept.map(character => {
  const anime = mainAnime(character)!
  const parts = character.name.full.split(' ')
  const uniqueParts = parts.length > 1 ? parts.filter(part => partOwners.get(normalize(part)) === 1) : []
  return {
    id: String(character.id),
    name: character.name.full,
    aliases: [...new Set([...nameVariants(character), ...uniqueParts])],
    image: character.image.large,
    attributes: {
      gender: character.gender ? GENDERS[character.gender] ?? 'Autre' : null,
      age: parseAge(character.age),
      height: parseHeight(character.description),
      anime: cleanTitle(anime),
      genres: anime.genres.map(genre => GENRES[genre] ?? genre),
      studio: anime.studios.nodes[0]?.name ?? null,
      year: anime.startDate.year,
      source: anime.source ? SOURCES[anime.source] ?? anime.source : null,
    },
  }
})

await writeFile(new URL('../data/anime.json', import.meta.url), `${JSON.stringify(entries, null, 1)}\n`)
console.log(`\n${entries.length} personnages écrits dans data/anime.json`)
