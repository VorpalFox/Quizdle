// Génère data/anime.json (personnages de l'Animedle) depuis AniList. Usage : npm run fetch:anime -- [nombre de personnages, 200 par défaut]
// On prend les personnages les plus mis en favoris : ceux que les fans connaissent.
// Les relations entre animes (pour l'univers) sont gardées dans .cache/anime/ (hors git).
//
// Les indices, comme au Weebdle :
// - Univers : la plus ancienne série de la franchise (Jotaro → JoJo's Bizarre Adventure). Genres, année et studio
//   viennent de la série où le personnage apparaît, pas de la 1re de l'univers.
// - Âge : le 1er nombre d'AniList (« 17-18 » → 17), sinon celui de l'infobox Fandom ou Wikipédia.
// - Sexe, occupation, cheveux : AniList (champ, sinon description), puis ce qui manque dans l'ordre : Wikidata
//   (wikidata.ts), Fandom (fandom.ts : l'infobox, pages d'homonymie suivies, puis les cheveux décrits dans le texte),
//   l'infobox Wikipédia (wikipedia.ts). Les occupations en anglais sont traduites à la fin (translate.ts).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { Entry } from '../src/engine/types.js'
import { characterAttributes } from '../src/subjects/anime/index.js'
import { aliases, anilist, cleanTitle, DELAY_MS, gender, genres, parseAge, parseHair, parseOccupation, parseWeapon, sleep, uniqueNameParts, type CharacterName } from './anilist.js'
import { applyManual, finishManual, manualFile, readManual } from '../src/subjects/manual.js'
import { finishOccupations, fixedOccupationIds, translateEntries } from './translate.js'
import { completeFromFandom } from './fandom.js'
import { completeFromWikidata } from './wikidata.js'
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
        edges { characterRole node { id format title { romaji english } startDate { year } genres studios(isMain: true) { nodes { name } } } }
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
  media: { edges: { characterRole: Role, node: Media }[] }
}

type Role = 'MAIN' | 'SUPPORTING' | 'BACKGROUND'

async function fetchPage(page: number, perPage: number): Promise<Character[]> {
  const data = await anilist<{ Page: { characters: Character[] } }>(QUERY, { page, perPage })
  return data.Page.characters
}

// Où le personnage a un rôle principal, seules les séries et les films comptent : les ONA, OVA et spéciaux sont souvent
// des courts dérivés ou des clips (« IRIS OUT » pour Reze)
const MAIN_ROLE_FORMATS = ['TV', 'TV_SHORT', 'MOVIE']

// La 1re série où le personnage apparaît : « Hunter x Hunter » plutôt que la version 2011, « JUJUTSU KAISEN » plutôt que la saison 2.
// D'abord une série ou un film où il a un rôle principal : un caméo ne compte pas (Saiki dans Assassination Classroom).
function mainAnime(character: Character): Media | undefined {
  const dated = character.media.edges.filter(edge => edge.node.startDate.year) // déjà triés par date de sortie
  const asMain = dated.filter(edge => edge.characterRole === 'MAIN').map(edge => edge.node)
  for (const format of MAIN_ROLE_FORMATS) {
    const found = asMain.find(media => media.format === format)
    if (found)
      return found
  }
  const all = dated.map(edge => edge.node)
  for (const format of FORMAT_PRIORITY) {
    const found = all.find(media => media.format === format)
    if (found)
      return found
  }
  return all[0]
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

// Une série, et celles de la même histoire (préquelles, suites, histoire principale d'un spin-off, versions alternatives)
interface Related {
  title: string
  format: string
  start: [number, number, number]
  family: number[]
}

interface RelationsResponse {
  Media: {
    format: string
    title: { romaji: string, english: string | null }
    startDate: { year: number | null, month: number | null, day: number | null }
    relations: { edges: { relationType: string, node: { id: number, type: string } }[] }
  }
}

// Les versions alternatives relient Fate/stay night aux films Heaven's Feel, et Fullmetal Alchemist à Brotherhood
const SAME_STORY = new Set(['PREQUEL', 'SEQUEL', 'PARENT', 'ALTERNATIVE'])
// Au cas où AniList boucle ou relie des franchises entières entre elles
const MAX_FRANCHISE_SIZE = 40
const relationsFile = new URL('../.cache/anime/relations.json', import.meta.url)
await mkdir(new URL('./', relationsFile), { recursive: true })
const relations = JSON.parse(await readFile(relationsFile, 'utf8').catch(() => '{}')) as Record<number, Related>

async function related(id: number): Promise<Related> {
  const cached = relations[id]
  // Une entrée de l'ancien cache (sans `family`) est récupérée de nouveau
  if (cached?.family)
    return cached
  const { Media: media } = await anilist<RelationsResponse>(RELATIONS_QUERY, { id })
  await sleep(DELAY_MS)
  const { year, month, day } = media.startDate
  const found: Related = {
    title: cleanTitle(media.title.english ?? media.title.romaji),
    format: media.format,
    start: [year ?? 9999, month ?? 99, day ?? 99],
    family: media.relations.edges.filter(edge => edge.node.type === 'ANIME' && SAME_STORY.has(edge.relationType)).map(edge => edge.node.id),
  }
  relations[id] = found
  await writeFile(relationsFile, JSON.stringify(relations))
  return found
}

// La racine de l'univers : la plus ancienne série TV, sinon série courte ou ONA, sinon n'importe quoi
const ROOT_FORMATS = [['TV'], ['TV_SHORT', 'ONA']]
const startedBefore = (a: Related, b: Related) => a.start[0] - b.start[0] || a.start[1] - b.start[1] || a.start[2] - b.start[2]

// On parcourt toute l'histoire (préquelles, suites, versions alternatives), puis on garde la plus ancienne série TV :
// Diamond is Unbreakable → JoJo's Bizarre Adventure, Dragon Ball Z → Dragon Ball, Heaven's Feel → Fate/stay night.
// La plus ancienne, pas le bout de la chaîne : Fate/Zero est la préquelle de Fate/stay night, mais sortie après.
async function franchise(id: number): Promise<string> {
  const seen = new Map<number, Related>()
  const queue = [id]
  while (queue.length > 0 && seen.size < MAX_FRANCHISE_SIZE) {
    const current = queue.shift()!
    if (seen.has(current))
      continue
    const media = await related(current)
    seen.set(current, media)
    queue.push(...media.family)
  }
  const all = [...seen.values()].toSorted(startedBefore)
  const root = ROOT_FORMATS.map(formats => all.find(media => formats.includes(media.format))).find(Boolean) ?? all[0]!
  return root.title
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
      weapon: parseWeapon(character.description),
      anime: universes.get(anime.id)!,
      genres: genres(anime.genres),
      year: anime.startDate.year,
      studio: anime.studios.nodes[0]?.name ?? null,
    },
  }
  return { entry, name: character.name, animeTitles: [anime.title.english ?? '', anime.title.romaji, universes.get(anime.id)!] }
})
// Ce qu'AniList n'a pas donné : depuis Wikidata (lien par l'ID AniList), puis les wikis Fandom, puis Wikipédia, puis tout en français.
// Les corrections à la main passent après.
const wikidata = await completeFromWikidata(targets.map(({ entry }) => entry))
const fandom = await completeFromFandom(targets.map((target, index) => ({ ...target, entry: wikidata.entries[index]! })))
const wiki = await completeFromWikipedia(targets.map((target, index) => ({ ...target, entry: fandom.entries[index]! })))
const translated = translateEntries(wiki.entries, fixedOccupationIds(manual.edit))
const attributeKeys = characterAttributes.map(({ key }) => key)
const manualApplied = applyManual(translated.entries, manual, attributeKeys)
const warnings = manualApplied.warnings
// À la fin, corrections comprises : les armes rejoignent l'occupation, tout est regroupé (finishOccupations), puis les
// corrections encore une fois : une famille ne remet pas une valeur retirée à la main
// Seulement les indices de l'Animedle, dans l'ordre (Wikidata et Fandom lisent aussi l'espèce et la taille du Weebdle)
const entries = finishManual(finishOccupations(manualApplied.entries), manual, attributeKeys)
  .map(entry => ({ ...entry, attributes: Object.fromEntries(attributeKeys.map(key => [key, entry.attributes[key] ?? null])) }))
const keptIds = new Set(kept.map(character => String(character.id)))
warnings.push(...manual.exclude.filter(id => !keptIds.has(id)).map(id => `exclude : l'id ${id} n'est pas dans les ${count} personnages récupérés`))

await writeFile(new URL('../data/anime.json', import.meta.url), `${JSON.stringify(entries, null, 1)}\n`)
console.log(`\n${entries.length} personnages écrits dans data/anime.json`)
console.log(`Corrections (data/anime-manual.json) : ${manual.exclude.length} retirés, ${Object.keys(manual.edit).length} corrigés, ${manual.add.length} ajoutés`)
for (const warning of warnings)
  console.log(`⚠️ ${warning}`)
console.log(`Complétés par Wikidata : ${wikidata.filled.length}`)
console.log(`Complétés par Fandom : ${fandom.filled.length}${fandom.noWiki.length > 0 ? ` (sans wiki : ${fandom.noWiki.join(', ')})` : ''}`)
console.log(`Complétés par Wikipédia : ${wiki.filled.length}`)
for (const line of wiki.filled)
  console.log(`  ${line}`)
console.log(`Occupations pas traduites (à ajouter dans scripts/translate.ts) : ${[...translated.untranslated].map(([value, count]) => `${value} (${count})`).join(', ') || 'aucune'}`)
// Ce qui manque, à compléter à la main
for (const [label, key] of [['sexe', 'gender'], ['âge', 'age'], ['occupation', 'occupation'], ['cheveux', 'hair']] as const) {
  const missing = entries.filter(entry => entry.attributes[key] === null)
  console.log(`Sans ${label} : ${missing.length} (${Math.round(missing.length / entries.length * 100)} %)`)
}
