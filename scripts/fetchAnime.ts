// Génère data/anime.json (personnages de l'Animedle) depuis AniList. Usage : npm run fetch:anime -- [nombre de personnages, 200 par défaut]
// On prend les personnages les plus mis en favoris : ceux que les fans connaissent.
// Les relations entre animes (pour l'univers) sont gardées dans .cache/anime/ (hors git).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { Entry } from '../src/engine/types.js'
import { characterAttributes } from '../src/subjects/anime/index.js'
import { aliases, anilist, cleanTitle, DELAY_MS, gender, genres, parseAge, parseHair, parseOccupation, sleep, uniqueNameParts, type CharacterName } from './anilist.js'
import { applyManual, manualFile, readManual } from '../src/subjects/manual.js'
import { fixedOccupationIds, translateEntries } from './translate.js'
import { completeFromWikipedia, type WikiTarget } from './wikipedia.js'

// Corrections à la main (data/anime-manual.json) : un personnage retiré n'est pas remplacé
const manual = readManual(manualFile('animedle'))

const count = Number(process.argv[2] ?? 200)
const PER_PAGE = 25

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
        nodes { id format title { romaji english } startDate { year } genres studios(isMain: true) { nodes { name } } }
      }
    }
  }
}`

// On préfère une série TV comme « anime du personnage », sinon un film ou autre
const FORMAT_PRIORITY = ['TV', 'ONA', 'TV_SHORT', 'MOVIE', 'OVA', 'SPECIAL']

interface Media {
  id: number
  format: string
  title: { romaji: string, english: string | null }
  startDate: { year: number | null }
  genres: string[]
  studios: { nodes: { name: string }[] }
}

interface Character {
  id: number
  name: CharacterName
  gender: string | null
  age: string | null
  description: string | null
  image: { large: string }
  media: { nodes: Media[] }
}

async function fetchPage(page: number, perPage: number): Promise<Character[]> {
  const data = await anilist<{ Page: { characters: Character[] } }>(QUERY, { page, perPage })
  return data.Page.characters
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

// --- Univers : la 1re série de la franchise ---

const RELATIONS_QUERY = `query ($id: Int) {
  Media(id: $id) {
    format
    title { romaji english }
    startDate { year month day }
    relations { edges { relationType node { id type } } }
  }
}`

// Une série, et celles dont elle découle (préquelles, histoire principale d'un spin-off)
interface Related {
  title: string
  format: string
  start: [number, number, number]
  parents: number[]
}

interface RelationsResponse {
  Media: {
    format: string
    title: { romaji: string, english: string | null }
    startDate: { year: number | null, month: number | null, day: number | null }
    relations: { edges: { relationType: string, node: { id: number, type: string } }[] }
  }
}

const UPSTREAM = new Set(['PREQUEL', 'PARENT'])
// Au cas où AniList boucle ou relie des franchises entières entre elles
const MAX_FRANCHISE_SIZE = 40
const relationsFile = new URL('../.cache/anime/relations.json', import.meta.url)
await mkdir(new URL('./', relationsFile), { recursive: true })
const relations = JSON.parse(await readFile(relationsFile, 'utf8').catch(() => '{}')) as Record<number, Related>

async function related(id: number): Promise<Related> {
  const cached = relations[id]
  if (cached)
    return cached
  const { Media: media } = await anilist<RelationsResponse>(RELATIONS_QUERY, { id })
  await sleep(DELAY_MS)
  const { year, month, day } = media.startDate
  const found: Related = {
    title: cleanTitle(media.title.english ?? media.title.romaji),
    format: media.format,
    start: [year ?? 9999, month ?? 99, day ?? 99],
    parents: media.relations.edges.filter(edge => edge.node.type === 'ANIME' && UPSTREAM.has(edge.relationType)).map(edge => edge.node.id),
  }
  relations[id] = found
  await writeFile(relationsFile, JSON.stringify(relations))
  return found
}

const SERIES_FORMATS = new Set(['TV', 'ONA', 'TV_SHORT'])
const startedBefore = (a: Related, b: Related) => a.start[0] - b.start[0] || a.start[1] - b.start[1] || a.start[2] - b.start[2]

// On remonte toutes les préquelles, puis on garde la série la plus ancienne (TV de préférence) : Diamond is Unbreakable
// → JoJo's Bizarre Adventure, Dragon Ball Z → Dragon Ball. La plus ancienne, pas le bout de la chaîne : Fate/Zero est
// la préquelle de Fate/stay night, mais sortie après.
async function franchise(id: number): Promise<string> {
  const seen = new Map<number, Related>()
  const queue = [id]
  while (queue.length > 0 && seen.size < MAX_FRANCHISE_SIZE) {
    const current = queue.shift()!
    if (seen.has(current))
      continue
    const media = await related(current)
    seen.set(current, media)
    queue.push(...media.parents)
  }
  const all = [...seen.values()].toSorted(startedBefore)
  return (all.find(media => SERIES_FORMATS.has(media.format)) ?? all[0]!).title
}

// --- Récupération ---

const characters: Character[] = []
for (let page = 1; characters.length < count; page++) {
  const batch = await fetchPage(page, PER_PAGE)
  if (batch.length === 0)
    break
  characters.push(...batch)
  process.stdout.write(`\r${Math.min(characters.length, count)}/${count}`)
  await sleep(DELAY_MS)
}

const kept = characters.slice(0, count).filter(character => mainAnime(character))
const universes = new Map<number, string>()
for (const [index, character] of kept.entries()) {
  const { id } = mainAnime(character)!
  process.stdout.write(`Univers : ${index + 1}/${kept.length}`)
  if (!universes.has(id))
    universes.set(id, await franchise(id))
}
console.log()
const uniqueParts = uniqueNameParts(kept.map(character => character.name))

const targets: WikiTarget[] = kept.map(character => {
  const anime = mainAnime(character)!
  const entry: Entry = {
    id: String(character.id),
    name: character.name.full,
    aliases: aliases(character.name, uniqueParts),
    image: character.image.large,
    attributes: {
      gender: gender(character.gender, character.description),
      age: parseAge(character.age, character.description),
      occupation: parseOccupation(character.description),
      hair: parseHair(character.description),
      anime: universes.get(anime.id)!,
      genres: genres(anime.genres),
      year: anime.startDate.year,
      studio: anime.studios.nodes[0]?.name ?? null,
    },
  }
  return { entry, name: character.name, animeTitles: [anime.title.english ?? '', anime.title.romaji, universes.get(anime.id)!] }
})
// Ce qu'AniList n'a pas donné : depuis Wikipédia, puis tout en français. Les corrections à la main passent après.
const wiki = await completeFromWikipedia(targets)
const translated = translateEntries(wiki.entries, fixedOccupationIds(manual.edit))
const { entries, warnings } = applyManual(translated.entries, manual, characterAttributes.map(({ key }) => key))
const keptIds = new Set(kept.map(character => String(character.id)))
warnings.push(...manual.exclude.filter(id => !keptIds.has(id)).map(id => `exclude : l'id ${id} n'est pas dans les ${count} personnages récupérés`))

await writeFile(new URL('../data/anime.json', import.meta.url), `${JSON.stringify(entries, null, 1)}\n`)
console.log(`\n${entries.length} personnages écrits dans data/anime.json`)
console.log(`Corrections (data/anime-manual.json) : ${manual.exclude.length} retirés, ${Object.keys(manual.edit).length} corrigés, ${manual.add.length} ajoutés`)
for (const warning of warnings)
  console.log(`⚠️ ${warning}`)
console.log(`Complétés par Wikipédia : ${wiki.filled.length}`)
for (const line of wiki.filled)
  console.log(`  ${line}`)
console.log(`Occupations pas traduites (à ajouter dans scripts/translate.ts) : ${[...translated.untranslated].map(([value, count]) => `${value} (${count})`).join(', ') || 'aucune'}`)
// Ce qui manque, à compléter à la main
for (const [label, key] of [['sexe', 'gender'], ['âge', 'age'], ['occupation', 'occupation'], ['cheveux', 'hair']] as const) {
  const missing = entries.filter(entry => entry.attributes[key] === null)
  console.log(`Sans ${label} : ${missing.length} (${Math.round(missing.length / entries.length * 100)} %)`)
}
