// Génère data/weebdle.json (personnages du Weebdle) depuis AniList : les personnages des animes de data/recommendations.json.
// Usage : npm run fetch:weebdle. Les réponses d'AniList sont gardées dans .cache/weebdle/ (hors git) : si le script
// s'arrête en route, le relancer reprend où il en était. Pour tout retélécharger : supprimer .cache/weebdle/.
//
// 1. Récupérer tous les personnages de chaque anime de la liste
// 2. Attribuer chaque personnage à un seul anime (là où il est principal, sinon le 1er sorti)
// 3. Garder 4 à 20 personnages par anime (voir select)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import { aliases, anilist, cleanName, cleanTitle, DELAY_MS, gender, genres, parseAge, parseHeight, sleep, source, uniqueNameParts, type CharacterName } from './anilist.js'

const MAX_PER_ANIME = 20
const MIN_PER_ANIME = 4
// Pas de vrais personnages : on ne les garde jamais
const NOT_CHARACTERS = new Set(['narrator'])
const TOP_MAINS = 10
const MAX_MAINS = 16
// En dessous de ce nombre de places pour les secondaires, on les prend uniquement par popularité
const MIN_SLOTS_FOR_RANDOM = 8

const root = new URL('../', import.meta.url)
const cacheDir = new URL('.cache/weebdle/', root)

const QUERY = `query ($id: Int, $page: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english }
    startDate { year month day }
    genres
    source
    studios(isMain: true) { nodes { name } }
    characters(page: $page, perPage: 50, sort: [ROLE, FAVOURITES_DESC, ID]) {
      pageInfo { hasNextPage }
      edges {
        role
        node { id name { full native alternative } gender age description image { large } favourites }
      }
    }
  }
}`

type Role = 'MAIN' | 'SUPPORTING' | 'BACKGROUND'

interface Character {
  id: number
  name: CharacterName
  gender: string | null
  age: string | null
  description: string | null
  image: { large: string }
  favourites: number
}

interface Media {
  id: number
  title: { romaji: string, english: string | null }
  startDate: { year: number | null, month: number | null, day: number | null }
  genres: string[]
  source: string | null
  studios: { nodes: { name: string }[] }
  characters: { pageInfo: { hasNextPage: boolean }, edges: { role: Role, node: Character }[] }
}

interface Recommendation {
  anilistId: number
  title: string
  romaji: string
  format: string
  year: number
}

// Un anime de la liste, avec tous ses personnages
interface Anime {
  rec: Recommendation
  media: Omit<Media, 'characters'>
  cast: { role: Role, character: Character }[]
}

// --- 1. Tout récupérer ---

async function fetchAnime(rec: Recommendation): Promise<Anime> {
  const cacheFile = new URL(`${rec.anilistId}.json`, cacheDir)
  const cached = await readFile(cacheFile, 'utf8').catch(() => null)
  if (cached)
    return JSON.parse(cached) as Anime

  const cast: Anime['cast'] = []
  let media: Media | undefined
  for (let page = 1; ; page++) {
    const data = await anilist<{ Media: Media }>(QUERY, { id: rec.anilistId, page })
    media = data.Media
    cast.push(...media.characters.edges.filter(edge => edge.node).map(edge => ({ role: edge.role, character: edge.node })))
    await sleep(DELAY_MS)
    if (!media.characters.pageInfo.hasNextPage)
      break
  }
  const { characters: _, ...info } = media
  const anime: Anime = { rec, media: info, cast }
  await writeFile(cacheFile, JSON.stringify(anime))
  return anime
}

const recommendations = JSON.parse(await readFile(new URL('data/recommendations.json', root), 'utf8')) as Recommendation[]
await mkdir(cacheDir, { recursive: true })

const animes: Anime[] = []
const failed: string[] = []
for (const [index, rec] of recommendations.entries()) {
  process.stdout.write(`\r${index + 1}/${recommendations.length} ${rec.title.slice(0, 50).padEnd(50)}`)
  try {
    animes.push(await fetchAnime(rec))
  } catch (error) {
    failed.push(`${rec.title} (${rec.anilistId}) : ${(error as Error).message}`)
  }
}
console.log()

// --- 2. Attribuer chaque personnage à un seul anime ---

const date = (anime: Anime) => {
  const { year, month, day } = anime.media.startDate
  return [year ?? anime.rec.year, month ?? 99, day ?? 99, anime.rec.anilistId] as const
}
const releasedBefore = (a: Anime, b: Anime) => {
  const [da, db] = [date(a), date(b)]
  for (let i = 0; i < da.length; i++) {
    if (da[i] !== db[i])
      return da[i]! - db[i]!
  }
  return 0
}

// Tous les animes de la liste où apparaît chaque personnage (principal ou secondaire)
const appearances = new Map<number, { anime: Anime, role: Role, character: Character }[]>()
for (const anime of animes) {
  anime.cast = anime.cast
    .map(({ role, character }) => ({ role, character: { ...character, name: cleanName(character.name) } }))
    .filter(({ character }) => !NOT_CHARACTERS.has(normalize(character.name.full)))
  for (const { role, character } of anime.cast) {
    if (role !== 'BACKGROUND')
      appearances.set(character.id, [...appearances.get(character.id) ?? [], { anime, role, character }])
  }
}

interface Candidate { character: Character, role: Role }
const assigned = new Map<Anime, Candidate[]>(animes.map(anime => [anime, []]))
const duplicates: string[] = []
for (const list of appearances.values()) {
  const mains = list.filter(({ role }) => role === 'MAIN')
  const [chosen] = (mains.length > 0 ? mains : list).toSorted((a, b) => releasedBefore(a.anime, b.anime))
  const { character } = chosen!
  assigned.get(chosen!.anime)!.push({ character, role: chosen!.role })
  if (list.length > 1) {
    const others = list.filter(other => other !== chosen).map(other => `${other.anime.rec.title} (${other.role})`)
    duplicates.push(`${character.name.full} → ${chosen!.anime.rec.title} (${chosen!.role}), aussi dans ${others.join(', ')}`)
  }
}

// Les figurants (BACKGROUND) ne servent qu'à compléter un anime qui a moins de 4 personnages
const usedIds = new Set(appearances.keys())
const withBackground: string[] = []
for (const anime of animes) {
  const candidates = assigned.get(anime)!
  if (candidates.length >= MIN_PER_ANIME)
    continue
  const extras = anime.cast
    .filter(({ role, character }) => role === 'BACKGROUND' && !usedIds.has(character.id))
    .slice(0, MIN_PER_ANIME - candidates.length)
  for (const { character } of extras) {
    usedIds.add(character.id)
    candidates.push({ character, role: 'BACKGROUND' })
  }
  if (extras.length > 0)
    withBackground.push(`${anime.rec.title} : ${extras.map(({ character }) => character.name.full).join(', ')}`)
}

// --- 3. Choisir 4 à 20 personnages par anime ---

// Tirage reproductible : même graine (l'id AniList de l'anime) → mêmes personnages
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

const byPopularity = (a: Candidate, b: Candidate) => b.character.favourites - a.character.favourites || a.character.id - b.character.id
const roleRank: Record<Role, number> = { MAIN: 0, SUPPORTING: 1, BACKGROUND: 2 }
const byRoleThenPopularity = (a: Candidate, b: Candidate) => roleRank[a.role] - roleRank[b.role] || byPopularity(a, b)
const hasInfo = ({ character }: Candidate) => parseAge(character.age) !== null || parseHeight(character.description) !== null

// `slots` personnages parmi `pool` (trié par popularité) : moitié les plus populaires, moitié au sort parmi les autres
function mix(pool: Candidate[], slots: number, random: () => number, popularityOnly: boolean): Candidate[] {
  if (slots >= pool.length)
    return pool
  if (popularityOnly)
    return pool.slice(0, slots)
  const popular = Math.ceil(slots / 2)
  return [...pool.slice(0, popular), ...shuffle(pool.slice(popular), random).slice(0, slots - popular)]
}

function select(anime: Anime, candidates: Candidate[]): Candidate[] {
  const sorted = candidates.toSorted(byRoleThenPopularity)
  if (sorted.length <= MAX_PER_ANIME)
    return sorted

  // On écarte ceux qui n'ont ni âge ni taille, sauf s'il en faut pour arriver à 20
  const informed = sorted.filter(hasInfo)
  const pool = informed.length >= MAX_PER_ANIME
    ? informed
    : [...informed, ...sorted.filter(candidate => !hasInfo(candidate)).slice(0, MAX_PER_ANIME - informed.length)].toSorted(byRoleThenPopularity)
  if (pool.length <= MAX_PER_ANIME)
    return pool

  const random = mulberry32(anime.rec.anilistId)
  const mains = pool.filter(({ role }) => role === 'MAIN').toSorted(byPopularity)
  const supporting = pool.filter(({ role }) => role !== 'MAIN').toSorted(byPopularity)
  const chosenMains = mains.length < TOP_MAINS
    ? mains
    : [...mains.slice(0, TOP_MAINS), ...mix(mains.slice(TOP_MAINS), MAX_MAINS - TOP_MAINS, random, false)]
  const slots = MAX_PER_ANIME - chosenMains.length
  const chosen = [...chosenMains, ...mix(supporting, slots, random, slots < MIN_SLOTS_FOR_RANDOM)]

  // Pas assez de secondaires : on complète avec les principaux restants
  const leftovers = pool.filter(candidate => !chosen.includes(candidate))
  return [...chosen, ...leftovers.slice(0, MAX_PER_ANIME - chosen.length)].toSorted(byRoleThenPopularity)
}

const selections = animes.map(anime => ({ anime, chosen: select(anime, assigned.get(anime)!), total: assigned.get(anime)!.length }))

// --- Écriture ---

const uniqueParts = uniqueNameParts(selections.flatMap(({ chosen }) => chosen.map(({ character }) => character.name)))
const entries = selections.flatMap(({ anime, chosen }) => chosen.map(({ character }) => ({
  id: String(character.id),
  name: character.name.full,
  aliases: aliases(character.name, uniqueParts),
  image: character.image.large,
  attributes: {
    gender: gender(character.gender),
    age: parseAge(character.age),
    height: parseHeight(character.description),
    anime: cleanTitle(anime.rec.title),
    genres: genres(anime.media.genres),
    studio: anime.media.studios.nodes[0]?.name ?? null,
    year: anime.media.startDate.year ?? anime.rec.year,
    source: source(anime.media.source),
  },
})))

await writeFile(new URL('data/weebdle.json', root), `${JSON.stringify(entries, null, 1)}\n`)

// --- Récap ---

const lines: string[] = [`# Récap du Weebdle : ${entries.length} personnages, ${selections.length} animes`, '']
if (failed.length > 0)
  lines.push(`## Animes pas récupérés (${failed.length})`, ...failed.map(text => `- ${text}`), '')

lines.push('## Personnages par anime (gardés / attribués à l\'anime)', '')
for (const { anime, chosen, total } of selections) {
  const mains = chosen.filter(({ role }) => role === 'MAIN').length
  const flag = chosen.length < MIN_PER_ANIME ? '  ⚠️ moins de 4' : ''
  lines.push(`- ${anime.rec.title} : ${chosen.length} / ${total} (${mains} principaux)${flag}`)
}
lines.push('')
if (withBackground.length > 0)
  lines.push(`## Complétés avec des figurants (${withBackground.length})`, ...withBackground.map(text => `- ${text}`), '')

for (const [label, key] of [['âge', 'age'], ['taille', 'height'], ['sexe', 'gender']] as const) {
  const missing = entries.filter(entry => entry.attributes[key] === null)
  lines.push(`## Sans ${label} (${missing.length})`, ...missing.map(entry => `- ${entry.name} (${entry.attributes.anime}, id ${entry.id})`), '')
}

const keptIds = new Set(entries.map(entry => entry.id))
const keptDuplicates = duplicates.filter(text => entries.some(entry => text.startsWith(`${entry.name} →`) && keptIds.has(entry.id)))
lines.push(`## Personnages dans plusieurs animes de la liste (${keptDuplicates.length} gardés)`, ...keptDuplicates.map(text => `- ${text}`), '')

// Noms ou alias partagés par plusieurs personnages : la recherche prendra le premier
const owners = new Map<string, Set<string>>()
for (const entry of entries) {
  for (const key of new Set([entry.name, ...entry.aliases].map(normalize)))
    owners.set(key, (owners.get(key) ?? new Set()).add(`${entry.name} (${entry.attributes.anime})`))
}
const ambiguous = [...owners].filter(([key, names]) => key && names.size > 1)
lines.push(`## Noms partagés par plusieurs personnages (${ambiguous.length})`, ...ambiguous.map(([key, names]) => `- « ${key} » : ${[...names].join(', ')}`), '')

const recap = lines.join('\n')
await writeFile(new URL('weebdle-recap.md', cacheDir), recap)
console.log(recap)
console.log(`${entries.length} personnages écrits dans data/weebdle.json, récap dans .cache/weebdle/weebdle-recap.md`)
