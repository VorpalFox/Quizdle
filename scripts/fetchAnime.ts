// Génère data/anime.json (personnages de l'Animedle) depuis AniList. Usage : npm run fetch:anime -- [nombre de personnages, 200 par défaut]
// On prend les personnages les plus mis en favoris : ceux que les fans connaissent.
import { writeFile } from 'node:fs/promises'
import { aliases, anilist, cleanTitle, DELAY_MS, gender, genres, parseAge, parseHeight, sleep, source, uniqueNameParts, type CharacterName } from './anilist.js'

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
        nodes { format title { romaji english } startDate { year } genres source studios(isMain: true) { nodes { name } } }
      }
    }
  }
}`

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
const uniqueParts = uniqueNameParts(kept.map(character => character.name))

const entries = kept.map(character => {
  const anime = mainAnime(character)!
  return {
    id: String(character.id),
    name: character.name.full,
    aliases: aliases(character.name, uniqueParts),
    image: character.image.large,
    attributes: {
      gender: gender(character.gender),
      age: parseAge(character.age),
      height: parseHeight(character.description),
      anime: cleanTitle(anime.title.english ?? anime.title.romaji),
      genres: genres(anime.genres),
      studio: anime.studios.nodes[0]?.name ?? null,
      year: anime.startDate.year,
      source: source(anime.source),
    },
  }
})

await writeFile(new URL('../data/anime.json', import.meta.url), `${JSON.stringify(entries, null, 1)}\n`)
console.log(`\n${entries.length} personnages écrits dans data/anime.json`)
