// Génère data/pixeldle.json (personnages du Pixeldle) depuis Wikidata : les personnages des franchises de
// data/pixeldle-franchises.json. Usage : npm run fetch:pixeldle. Les réponses de Wikidata sont gardées dans
// .cache/pixeldle/ (hors git) : si le script s'arrête en route, le relancer reprend où il en était.
//
// 1. Récupérer les jeux de chaque franchise et tous les personnages qui y sont reliés (pixeldleWikidata.ts)
// 2. Attribuer chaque personnage à une seule franchise
// 3. Garder 4 à 20 personnages par franchise (voir select)
// 4. Compléter avec l'infobox du wiki de la franchise (pixeldleEnrich.ts, wikis trouvés par pixeldleWikis.ts)
// 5. Ajouter des personnages depuis le wiki quand Wikidata en a moins de 4, ou si la franchise est réglée dans « wikis »
//    du manuel (pixeldleWikiCharacters.ts) : jusqu'à 12, ou « limit »
// 6. Le jeu de 1re apparition (année, studio, genres), les cheveux et l'occupation tirés du texte des pages.
//    En dernier recours, les cheveux et l'occupation de la page Wikipédia anglaise (sans ce qui parle de la conception).
//    Le jeu : celui que cite la page (infobox, modèle {{Games}}, puis introduction), sinon le 1er de la franchise.
//    Piège connu : un reboot au même titre que le 1er jeu (God of War, Tomb Raider), corrigé à la main.
//    FRANCHISE_DEVELOPERS force le studio, FRANCHISE_GENRES ajoute un genre à toute la franchise (pixeldleTranslate.ts).
// 7. Les corrections à la main (data/pixeldle-manual.json : defaults, puis edit), puis les valeurs finales :
//    espèce dépliée, occupations regroupées, et la nationalité vide remplie par Monde réel si la franchise s'y passe
//    (FRANCHISE_WORLDS, sinon les lieux des autres personnages). Unknown, None et N/A suivent la règle commune
//    (unknownValues.ts) : une case qu'on n'a pas réussi à remplir reste vide.
//    Les corrections encore une fois à la fin : une valeur retirée à la main ne revient pas.
//
// Les valeurs de Wikidata (espèce, genres, développeur...) sont ramenées à nos listes par pixeldleTranslate.ts. Celles
// qu'il ne sait pas traduire restent brutes et sont listées dans le récap (.cache/pixeldle/pixeldle-recap.md). Le récap
// liste aussi tout ce qui est deviné et à relire : années, cheveux et occupations tirés du texte, rôles des entités.
// Autres récaps : pixeldle-wikis.md (le wiki de chaque franchise), pixeldle-enrich.md (ce que les wikis ont rempli).
//
// Choix des personnages (décidés avec FX) :
// - Franchises : data/pixeldle-franchises.json, « top100 » (le top des franchises) ou « steam » (la liste de FX).
//   « games » : les jeux que Wikidata ne relie pas à la série (American McGee's Alice, Divinity: Original Sin 1).
// - Moins de 4 personnages : accepté pour les jeux qui n'ont que leur avatar (Deep Rock Galactic, Icarus…) ou
//   deux protagonistes (Green Hell, The Riftbreaker, The World Next Door).
// - Le protagoniste est toujours là. Muet ou personnalisable, c'est un avatar (un au plus par franchise, ajouté à la
//   main, id « avatar-<jeu> ») : son nom officiel (Dovahkiin, Tav…) sinon « Héros de <jeu> », le jeu en alias, et
//   « Player's choice » pour ce que le joueur choisit. Personnalisable mais nommé par le jeu (Shepard, V) : un vrai personnage.
// - Pas d'invités d'une autre licence (Sally Acorn, Raiden dans Unreal). Un personnage né dans un autre média de la
//   même licence est gardé s'il fait partie d'un jeu (J.D. Morrison, de l'anime DMC), comme les franchises tirées
//   d'un autre média (Batman: Arkham, Hogwarts Legacy, The Witcher…).
// - Pas de groupes, d'objets ni d'espèces (Necromorphs, Geth, Epoch), ni de versions d'un autre média (DmC, film).
// - Pokémon : seulement des humains, le Pokédle couvre les Pokémon. Une franchise par licence (Sons of the Forest
//   plutôt que The Forest). Unreal : pas les personnages des seuls Unreal Championship.
// - Meryl (Mother 4, un jeu de fans pas encore sorti) est gardée exprès : année « Futur », studio « Jeu de fans ».
// - Sundered : tout le casting est sur une page de son wiki (« Characters », une infobox par personnage) : réglé dans
//   « wikis » avec listPages.
// - Pistes abandonnées : les Fandom FR (presque vides), le wiki officiel de LoL (que du gameplay). Gamicus (wiki de
//   tous les jeux) a servi en dernier recours pour The World Next Door.
import { readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import type { Entry } from '../src/engine/types.js'
import { pixeldle } from '../src/subjects/pixeldle/index.js'
import { applyManual, finishManual, manualFile, readManual } from '../src/subjects/manual.js'
import { aliases, uniqueNameParts, type CharacterName } from './anilist.js'
import { wikidataGender, wikidataHair, wikidataOccupation } from './wikidata.js'
import { FRANCHISE_DEVELOPERS, FRANCHISE_GENRES, FRANCHISE_WORLDS, REAL_WORLD, expandSpecies, franchiseUniverses, franchiseWorld, hairOrNone, mergeOccupations, occupationOrChoice, translateDeveloper, translateGender, translateGenre, translateOccupation, translatePlace, translateSpecies, withWorld } from './pixeldleTranslate.js'
import { findWikis, wikisRecap } from './pixeldleWikis.js'
import { AFFILIATIONS, enrichFromWikis, NAME_TITLE } from './pixeldleEnrich.js'
import { fillUnknowns } from './unknownValues.js'
import { citedGame, DEVELOPMENT, fullPages, introAlignment, introFunction, introRoles, introText, pageGames, textHair, wikiCharacters, type WikiCharacter } from './pixeldleWikiCharacters.js'
import { fetchCharacters, fetchClasses, fetchEnglishLabels, fetchFandomWikiIds, fetchFranchises, fetchGames, fetchLabels, fetchNames, type Character, type Game } from './pixeldleWikidata.js'

const MAX_PER_FRANCHISE = 20
const MIN_PER_FRANCHISE = 4
// Une franchise sous 4 personnages est complétée jusqu'à ce nombre avec la catégorie « Characters » de son wiki
const WIKI_TARGET = 12
const TOP_MAINS = 10
const MAX_MAINS = 16
// En dessous de ce nombre de places pour les secondaires, on les prend uniquement par popularité
const MIN_SLOTS_FOR_RANDOM = 8
const IMAGE_WIDTH = 400

// Franchises tirées d'autres médias : leurs personnages venus d'une BD, d'un livre ou d'un film sont acceptés.
// Ailleurs, un personnage dont la 1re apparition n'est pas un jeu vidéo est un invité (Mickey dans Kingdom Hearts).
const MEDIA_FRANCHISES = new Set(['Batman: Arkham', 'Hogwarts Legacy', 'Alice: Madness Returns', 'Nancy Drew', 'Warhammer', 'Call of Cthulhu', 'The Witcher'])
// Pas les Pokémon eux-mêmes (c'est le Pokédle), sauf quelques emblématiques
const POKEMON_CLASS = /^(?:espèce de )?pokémon\b/i
const POKEMON_KEPT = new Set(['pikachu', 'mewtwo'])
const VIDEO_GAME_CHARACTER = 'Q1569167'
// Les franchises qui invitent des personnages d'autres univers. Là, un personnage d'un autre média sans 1re apparition
// connue est un invité (le Joker de DC dans Mortal Kombat est « personnage de bande dessinée »). Ailleurs, c'est
// souvent un personnage de jeu qui a eu un film ou un manga (Wario, Clank) : il est seulement signalé dans le récap.
const CROSSOVER_FRANCHISES = new Set(['Kingdom Hearts', 'Mortal Kombat', 'Soulcalibur', 'Tekken'])
const OTHER_MEDIA_CLASS = /^personnage (?:de bande dessinée|de comics|littéraire|de cinéma|de film|de série télévisée|de télévision|de théâtre|d'anime|de manga|de dessin animé|d'animation|Disney)|^character from Disney|^super-?(?:héros|vilain)/i
// Classes qui ne disent pas l'espèce : personnage de fiction, de jeu vidéo, d'animation, nommable, et toutes les
// « personnage de ... » (de Mario, de Donkey Kong, de bande dessinée, artistique...) ou « ... characters »
const GENERIC_CLASSES = new Set(['Q95074', VIDEO_GAME_CHARACTER, 'Q15711870', 'Q105221875'])
const GENERIC_CLASS_LABEL = /^personnage\b|\bcharacters?$/i

const root = new URL('../', import.meta.url)
const cacheDir = new URL('.cache/pixeldle/', root)

interface Franchise {
  title: string
  wikidataId: string
  source: string
  // Les jeux que Wikidata ne relie pas à la franchise
  games?: string[]
}

const manual = readManual(manualFile('pixeldle'))
const excludedIds = new Set(manual.exclude)
const editedIds = new Set(Object.keys(manual.edit))
const franchises = JSON.parse(await readFile(new URL('data/pixeldle-franchises.json', root), 'utf8')) as Franchise[]

// --- 1. Tout récupérer ---

const data = await fetchFranchises(franchises)
const classes = await fetchClasses(Object.values(data).flatMap(({ types }) => Object.values(types).flat()))

// Les personnages de chaque franchise, avec les jeux (ou la franchise) par lesquels ils y sont reliés
const linked = new Map<Franchise, Map<string, Set<string>>>()
for (const franchise of franchises) {
  const { links, types } = data[franchise.wikidataId]!
  const characters = new Map<string, Set<string>>()
  for (const { character, via } of links) {
    if ((types[character] ?? []).some(type => classes[type]?.character))
      characters.set(character, (characters.get(character) ?? new Set()).add(via))
  }
  linked.set(franchise, characters)
}

const characters = await fetchCharacters([...linked.values()].flatMap(map => [...map.keys()]))
const games = await fetchGames([
  ...Object.values(data).flatMap(({ games }) => games),
  ...Object.values(characters).flatMap(({ claims }) => claims.firstAppearance ?? []),
])
const labels = await fetchLabels([
  ...Object.values(characters).flatMap(({ claims }) => [claims.gender, claims.instanceOf, claims.nationality, claims.occupation, claims.hair, claims.firstAppearance].flat()),
  ...Object.values(games).flatMap(({ developers, genres }) => [...developers, ...genres]),
].filter((id): id is string => Boolean(id) && /^Q\d+$/.test(id!)))

// Les lieux de naissance et de résidence : en anglais
const englishLabels = await fetchEnglishLabels(Object.values(characters).flatMap(({ claims }) => [...claims.birthplace ?? [], ...claims.residence ?? []]).filter(id => /^Q\d+$/.test(id)))
const englishLabelsOf = (ids: string[] | undefined) => (ids ?? []).map(id => englishLabels[id] ?? null).filter((name): name is string => Boolean(name))

const label = (id: string) => labels[id] ?? null
const labelsOf = (ids: string[] | undefined) => (ids ?? []).map(label).filter((name): name is string => Boolean(name))
const nameOf = (character: Character) => character.labels.fr ?? character.labels.en ?? character.labels.mul ?? null
const franchiseGames = new Map(franchises.map(franchise => [franchise, new Set(data[franchise.wikidataId]!.games)]))
const byYear = (a: Game, b: Game) => (a.year ?? 9999) - (b.year ?? 9999) || b.sitelinks - a.sitelinks
const firstGameOf = (franchise: Franchise) => [...franchiseGames.get(franchise)!].map(id => games[id]!).filter(game => game.year).toSorted(byYear)[0]

// Ce qui est écarté avant l'attribution, pour le récap
const guests: string[] = []
const suspects: { id: string, text: string }[] = []
let pokemonSpecies = 0
let unnamed = 0

function accepted(id: string, franchise: Franchise): boolean {
  const character = characters[id]!
  const name = nameOf(character)
  if (!name) {
    unnamed++
    return false
  }
  if (excludedIds.has(id))
    return false
  if (labelsOf(character.claims.instanceOf).some(type => POKEMON_CLASS.test(type)) && !POKEMON_KEPT.has(normalize(name))) {
    pokemonSpecies++
    return false
  }
  // Invité : sa 1re apparition n'est ni un jeu, ni une œuvre de la franchise (Mickey au théâtre, Le Roi lion)
  const first = (character.claims.firstAppearance ?? []).map(game => games[game]).filter((game): game is Game => Boolean(game))
  const ofFranchise = (work: Game) => work.isGame || work.id === franchise.wikidataId || work.parents.includes(franchise.wikidataId)
    || franchiseGames.get(franchise)!.has(work.id)
  // … et sortie avant le 1er jeu de la franchise : une « 1re apparition » plus tardive est une adaptation, ou une erreur
  // de Wikidata (Knuckles « apparu » dans Sonic 2, le film)
  const franchiseYear = firstGameOf(franchise)?.year ?? Infinity
  const { instanceOf: types = [], franchise: franchiseClaims = [] } = character.claims
  if (MEDIA_FRANCHISES.has(franchise.title) || franchiseClaims.includes(franchise.wikidataId) || first.some(ofFranchise))
    return true
  if (first.length > 0 && first.every(work => work.year === null || work.year < franchiseYear)) {
    guests.push(`${name} (${franchise.title}) : 1re apparition dans ${first.map(game => `${label(game.id) ?? game.id} (${game.year ?? '?'})`).join(', ')}`)
    return false
  }
  const otherMedia = labelsOf(types).filter(type => OTHER_MEDIA_CLASS.test(type))
  // Un personnage de jeu vidéo qui a seulement eu un manga ou un anime (Riku, Roxas) n'est pas un invité
  const adaptationOnly = types.includes(VIDEO_GAME_CHARACTER) && otherMedia.every(type => /de manga|d'anime/.test(type))
  if (otherMedia.length > 0 && !adaptationOnly && CROSSOVER_FRANCHISES.has(franchise.title)) {
    guests.push(`${name} (${franchise.title}) : ${otherMedia.join(', ')}`)
    return false
  }
  if (otherMedia.length > 0 && first.length === 0 && !types.includes(VIDEO_GAME_CHARACTER))
    suspects.push({ id, text: `${name} (${franchise.title}, ${id}) : ${otherMedia.join(', ')}` })
  return true
}

// --- 2. Attribuer chaque personnage à une seule franchise ---

// Les jeux de la franchise par lesquels le personnage y est relié
const gamesIn = (id: string, franchise: Franchise) => [...linked.get(franchise)!.get(id) ?? []].filter(via => franchiseGames.get(franchise)!.has(via))

const appearances = new Map<string, Franchise[]>()
for (const franchise of franchises) {
  for (const id of linked.get(franchise)!.keys()) {
    if (accepted(id, franchise))
      appearances.set(id, [...appearances.get(id) ?? [], franchise])
  }
}

// 1re apparition, sinon la franchise que Wikidata lui donne (P8345), sinon là où il est dans le plus de jeux, sinon la 1re sortie
function attribute(id: string, list: Franchise[]): { franchise: Franchise, rule: string } {
  if (list.length === 1)
    return { franchise: list[0]!, rule: '' }
  const { claims } = characters[id]!
  const byFirst = list.filter(franchise => (claims.firstAppearance ?? []).some(game => franchiseGames.get(franchise)!.has(game)))
  if (byFirst.length === 1)
    return { franchise: byFirst[0]!, rule: '1re apparition' }
  const pool = byFirst.length > 1 ? byFirst : list
  const byClaim = pool.filter(franchise => (claims.franchise ?? []).includes(franchise.wikidataId))
  if (byClaim.length === 1)
    return { franchise: byClaim[0]!, rule: 'franchise Wikidata' }
  const counts = pool.map(franchise => ({ franchise, count: gamesIn(id, franchise).length }))
  const most = Math.max(...counts.map(({ count }) => count))
  const mostGames = counts.filter(({ count }) => count === most).map(({ franchise }) => franchise)
  if (mostGames.length === 1)
    return { franchise: mostGames[0]!, rule: `dans le plus de jeux (${most})` }
  const [earliest] = mostGames.toSorted((a, b) => (firstGameOf(a)?.year ?? 9999) - (firstGameOf(b)?.year ?? 9999))
  return { franchise: earliest!, rule: 'franchise sortie en premier' }
}

interface Candidate {
  id: string
  character: Character
  name: string
  main: boolean
}

const assigned = new Map<Franchise, Candidate[]>(franchises.map(franchise => [franchise, []]))
const duplicates = new Map<string, string>()
for (const [id, list] of appearances) {
  const { franchise, rule } = attribute(id, list)
  const character = characters[id]!
  assigned.get(franchise)!.push({ id, character, name: nameOf(character)!, main: false })
  if (list.length > 1)
    duplicates.set(id, `${nameOf(character)} → ${franchise.title} (${rule}), aussi dans ${list.filter(other => other !== franchise).map(other => other.title).join(', ')}`)
}

// Principal : présent dans au moins la moitié des jeux de la série qui ont des personnages reliés
const mainCounts = new Map<Franchise, number>()
for (const [franchise, candidates] of assigned) {
  const withCast = new Set(candidates.flatMap(({ id }) => gamesIn(id, franchise)))
  const threshold = Math.max(1, Math.ceil(withCast.size / 2))
  for (const candidate of candidates)
    candidate.main = withCast.size > 0 && gamesIn(candidate.id, franchise).length >= threshold
  mainCounts.set(franchise, candidates.filter(({ main }) => main).length)
}

// --- 3. Choisir 4 à 20 personnages par franchise ---

// Tirage reproductible et stable : chaque personnage a un rang « au sort » fixe, tiré de l'id de la franchise et du sien.
// Retirer un personnage ne rebat donc pas les cartes : seule sa place change de main.
function drawRank(seed: number, id: number): number {
  let t = (Math.imul(seed, 0x9E3779B1) ^ Math.imul(id, 0x85EBCA77)) + 0x6D2B79F5 | 0
  t = Math.imul(t ^ (t >>> 15), 1 | t)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const numericId = (id: string) => Number(id.slice(1))
const draw = (items: Candidate[], seed: number) => items.toSorted((a, b) => drawRank(seed, numericId(a.id)) - drawRank(seed, numericId(b.id)))
// À popularité égale, le plus petit QID d'abord : un élément créé tôt dans Wikidata est en général un personnage connu
const byPopularity = (a: Candidate, b: Candidate) => b.character.sitelinks - a.character.sitelinks || numericId(a.id) - numericId(b.id)

// Les franchises dont les personnages ont été créés d'un coup dans Wikidata, sans page Wikipédia (les légendes d'Apex,
// par ordre alphabétique) : le QID ne dit rien de leur popularité, on les départage au sort
const RANDOM_TIES = new Set(['Titanfall / Apex Legends'])
const byPopularityOrRandom = (seed: number) => (a: Candidate, b: Candidate) =>
  b.character.sitelinks - a.character.sitelinks || drawRank(seed, numericId(a.id)) - drawRank(seed, numericId(b.id))
const byMainThenPopularity = (a: Candidate, b: Candidate) => Number(b.main) - Number(a.main) || byPopularity(a, b)

// Les valeurs que les tables de traduction ne connaissent pas, par indice : gardées brutes, listées dans le récap
const untranslated = new Map<string, string[]>()
function translated<T>(attribute: string, raw: string, value: T | undefined): T | string {
  if (value !== undefined)
    return value
  untranslated.set(attribute, [...untranslated.get(attribute) ?? [], raw])
  return raw
}

// L'espèce : une espèce de fiction (Hylien), sinon la classe la plus parlante (« robot de fiction »), sans les classes
// générales ni celles qui ne sont pas des espèces (« deutéragoniste » : traduites par null)
function species(character: Character, record = false): string | null {
  const types = character.claims.instanceOf ?? []
  const telling = (type: string) => !GENERIC_CLASSES.has(type) && !GENERIC_CLASS_LABEL.test(label(type) ?? '') && translateSpecies(label(type) ?? '') !== null
  const best = types.find(type => classes[type]?.species && telling(type)) ?? types.find(type => classes[type]?.character && telling(type))
  if (!best)
    return null
  const name = label(best)!
  return record ? translated('species', name, translateSpecies(name)) : translateSpecies(name) ?? name
}

const hasInfo = ({ character }: Candidate) => wikidataGender(labelsOf(character.claims.gender)) !== null || species(character) !== null

// `slots` personnages parmi `pool` (trié par popularité) : moitié les plus populaires, moitié au sort parmi les autres
function mix(pool: Candidate[], slots: number, seed: number, popularityOnly: boolean): Candidate[] {
  if (slots >= pool.length)
    return pool
  if (popularityOnly)
    return pool.slice(0, slots)
  const popular = Math.ceil(slots / 2)
  return [...pool.slice(0, popular), ...draw(pool.slice(popular), seed).slice(0, slots - popular)]
}

// Les personnages ajoutés à la main (add) prennent des places du tirage : Titanfall / Apex Legends en a 4, Apex 16
const addedPerFranchise = new Map<string, number>()
for (const entry of manual.add)
  addedPerFranchise.set(String(entry.attributes.franchise), (addedPerFranchise.get(String(entry.attributes.franchise)) ?? 0) + 1)

// Les personnages corrigés à la main sont toujours gardés : ils prennent la place des derniers du tirage
function select(franchise: Franchise, candidates: Candidate[]): Candidate[] {
  const max = Math.max(0, MAX_PER_FRANCHISE - (addedPerFranchise.get(franchise.title) ?? 0))
  const pinned = candidates.filter(({ id }) => editedIds.has(id))
  const drawn = selectWithoutPinned(franchise, candidates, max).filter(candidate => !pinned.includes(candidate))
  return [...pinned, ...drawn].slice(0, Math.max(max, pinned.length)).toSorted(byMainThenPopularity)
}

function selectWithoutPinned(franchise: Franchise, candidates: Candidate[], max: number): Candidate[] {
  const random = RANDOM_TIES.has(franchise.title)
  const order = random ? byPopularityOrRandom(numericId(franchise.wikidataId)) : byPopularity
  const byMainThenOrder = (a: Candidate, b: Candidate) => Number(b.main) - Number(a.main) || order(a, b)
  const sorted = candidates.toSorted(byMainThenOrder)
  if (sorted.length <= max)
    return sorted

  // On écarte ceux qui n'ont ni sexe ni espèce, ou aucune page Wikipédia (« Roman's unborn child »), sauf s'il en faut pour arriver au maximum
  const informed = sorted.filter(candidate => hasInfo(candidate) && candidate.character.sitelinks > 0)
  const pool = informed.length >= max
    ? informed
    : [...informed, ...sorted.filter(candidate => !informed.includes(candidate)).slice(0, max - informed.length)].toSorted(byMainThenOrder)
  if (pool.length <= max)
    return pool

  const seed = numericId(franchise.wikidataId)
  const mains = pool.filter(({ main }) => main).toSorted(order)
  const secondary = pool.filter(({ main }) => !main).toSorted(order)
  const chosenMains = mains.length < TOP_MAINS
    ? mains
    : [...mains.slice(0, TOP_MAINS), ...mix(mains.slice(TOP_MAINS), MAX_MAINS - TOP_MAINS, seed, false)]
  const slots = max - chosenMains.length
  const chosen = [...chosenMains, ...mix(secondary, slots, seed, slots < MIN_SLOTS_FOR_RANDOM)]

  // Pas assez de secondaires : on complète avec les principaux restants
  const leftovers = pool.filter(candidate => !chosen.includes(candidate))
  return [...chosen, ...leftovers.slice(0, max - chosen.length)].toSorted(byMainThenOrder)
}

const selections = franchises.map(franchise => ({ franchise, chosen: select(franchise, assigned.get(franchise)!), total: assigned.get(franchise)!.length }))

// --- Écriture ---

// Le jeu du personnage selon Wikidata : sa 1re apparition (P4584), sinon le plus ancien de ses jeux dans la franchise
function knownGame(candidate: Candidate, franchise: Franchise): Game | undefined {
  const dated = (ids: string[]) => ids.map(id => games[id]).filter((game): game is Game => Boolean(game?.isGame && game.year)).toSorted(byYear)
  return dated(candidate.character.claims.firstAppearance ?? [])[0] ?? dated(gamesIn(candidate.id, franchise))[0]
}

// Le 1er jeu du personnage, sinon le 1er de la franchise
function firstGame(candidate: Candidate, franchise: Franchise): Game | undefined {
  return knownGame(candidate, franchise) ?? firstGameOf(franchise)
}

// Les personnages de Wikidata sans jeu connu, qui ont l'année du 1er jeu de leur franchise : à relire (récap)
const wikidataYearGuesses: string[] = []

// Un seul développeur : celui de ce jeu qui revient le plus dans la franchise (Nintendo plutôt que Nintendo EAD)
// Si ce jeu n'a pas de développeur sur Wikidata : celui qui revient le plus dans la franchise
function developer(game: Game | undefined, franchise: Franchise): string | null {
  if (FRANCHISE_DEVELOPERS[franchise.title])
    return FRANCHISE_DEVELOPERS[franchise.title]!
  const counts = new Map<string, number>()
  for (const id of franchiseGames.get(franchise)!) {
    for (const studio of games[id]?.developers ?? [])
      counts.set(studio, (counts.get(studio) ?? 0) + 1)
  }
  const studios = game?.developers.length ? game.developers : [...counts.keys()]
  const [main] = studios.filter(studio => label(studio)).toSorted((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
  return main ? translateDeveloper(label(main)!) : null
}

// Les genres du jeu, plus ceux que Wikidata oublie pour la franchise (FRANCHISE_GENRES)
function genresOf(game: Game | undefined, franchise: Franchise): string[] | null {
  return unique([...labelsOf(game?.genres).map(genre => translated('genres', genre, translateGenre(genre))), ...FRANCHISE_GENRES[franchise.title] ?? []])
}

// « http://commons.wikimedia.org/wiki/Special:FilePath/Mario.png » → la même en https, en 400 px de large
const imageUrl = (file: string | undefined) => file ? `${file.replace(/^http:/, 'https:')}?width=${IMAGE_WIDTH}` : undefined

const nameFor = (candidate: Candidate): CharacterName => {
  const { labels: names, aliases: alternative } = candidate.character
  return { full: candidate.name, native: null, alternative: [...alternative, ...[names.fr, names.en, names.mul].filter((name): name is string => Boolean(name))] }
}
const uniqueParts = uniqueNameParts(selections.flatMap(({ chosen }) => chosen.map(nameFor)))

// L'autre langue est acceptée telle quelle (« Princess Peach » pour Peach), même sans mot en commun
function acceptedNames(candidate: Candidate): string[] {
  const { fr, en, mul } = candidate.character.labels
  const other = [fr, en, mul].filter((name): name is string => Boolean(name) && normalize(name!).length >= 3)
  const key = normalize(candidate.name)
  const seen = new Set([key])
  return [...other, ...aliases(nameFor(candidate), uniqueParts)].filter(name => {
    const normalized = normalize(name)
    if (seen.has(normalized))
      return false
    seen.add(normalized)
    return true
  })
}

// Sans doublons ni valeurs retirées (null), null si plus rien
function unique(values: (string | null)[]): string[] | null {
  const list = [...new Set(values.filter((value): value is string => value !== null))]
  return list.length > 0 ? list : null
}

const generated: Entry[] = selections.flatMap(({ franchise, chosen }) => chosen.map(candidate => {
  const { claims } = candidate.character
  const game = firstGame(candidate, franchise)
  const genders = labelsOf(claims.gender)
  const otherGender = wikidataGender(genders) ? null : translateGender(genders)
  if (otherGender === undefined)
    untranslated.set('gender', [...untranslated.get('gender') ?? [], ...genders])
  const gender = wikidataGender(genders) ?? otherGender ?? null
  const genres = genresOf(game, franchise)
  const occupations = unique((wikidataOccupation(labelsOf(claims.occupation)) ?? []).map(name => translated('occupation', name, translateOccupation(name))))
  // Le lieu de naissance, de résidence, puis les pays : le champ est multiple, les wikis y ajoutent la ville et la région
  const nationality = unique([...englishLabelsOf(claims.birthplace), ...englishLabelsOf(claims.residence), ...labelsOf(claims.nationality)].flatMap(translatePlace))
  return {
    id: candidate.id,
    name: candidate.name,
    aliases: acceptedNames(candidate),
    ...(claims.image?.[0] ? { image: imageUrl(claims.image[0]) } : {}),
    attributes: {
      gender,
      species: species(candidate.character, true),
      nationality,
      occupation: occupations,
      hair: wikidataHair(labelsOf(claims.hair)),
      franchise: franchise.title,
      developer: developer(game, franchise),
      genres,
      year: game?.year ?? null,
    },
  }
}))

// --- Compléter avec les wikis de chaque franchise (Fandom, wiki.gg, indépendants : voir pixeldleWikis.ts) ---

const fandomIds = await fetchFandomWikiIds(franchises.flatMap(franchise => [franchise.wikidataId, ...franchiseGames.get(franchise)!]))
const wikis = await findWikis(franchises.map(franchise => ({
  title: franchise.title,
  wikidataWikis: [franchise.wikidataId, ...franchiseGames.get(franchise)!].flatMap(id => fandomIds[id] ?? []),
  characterLinks: [...linked.get(franchise)!.keys()].flatMap(id => characters[id]?.claims.fandom ?? []),
})))
const enriched = await enrichFromWikis(selections.flatMap(({ franchise, chosen }) => chosen.map(candidate => {
  const { labels: names, aliases: alternative } = candidate.character
  return {
    entry: generated.find(entry => entry.id === candidate.id)!,
    franchise: franchise.title,
    fandomLinks: candidate.character.claims.fandom ?? [],
    // Les wikis sont en anglais : le nom anglais d'abord
    names: [names.en, names.mul, candidate.name, ...alternative].filter((name): name is string => Boolean(name)),

  }
})), wikis)
for (const [key, list] of enriched.untranslated)
  untranslated.set(key, [...untranslated.get(key) ?? [], ...list])

// --- Compléter les franchises sous 4 personnages avec la catégorie « Characters » de leur wiki ---

const slug = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const wikiId = (franchise: Franchise, name: string) => `wiki-${slug(franchise.title)}-${slug(name)}`
const fromWikis: { franchise: Franchise, wiki: string, api: string, root: string | null, found: number, chosen: WikiCharacter[] }[] = []
const wikiUntranslated = new Map<string, string[]>()
const yearGuesses: string[] = []
const introYears: string[] = []
for (const franchise of franchises) {
  const inFranchise = [...enriched.entries, ...manual.add].filter(entry => entry.attributes.franchise === franchise.title && !excludedIds.has(entry.id))
  // Les ajouts à la main (add) prennent des places, mais ne dispensent pas du wiki : seul Wikidata compte ici.
  // Une franchise réglée dans « wikis » lit son wiki quoi qu'il arrive (Wikidata trop maigre : Hades, Nier...).
  if (inFranchise.length - manual.add.filter(entry => inFranchise.includes(entry)).length >= MIN_PER_FRANCHISE && !manual.wikis?.[franchise.title])
    continue
  const known = new Set(inFranchise.flatMap(entry => [entry.name, ...entry.aliases ?? []]))
  const chosen: WikiCharacter[] = []
  const settings = manual.wikis?.[franchise.title] ?? {}
  const target = settings.limit ?? WIKI_TARGET
  for (const wiki of wikis.get(franchise.title)?.order ?? []) {
    process.stdout.write(`\rPersonnages des wikis : ${franchise.title} (${wiki.id})`.padEnd(80))
    // Retiré à la main (exclude) : sa place revient au suivant
    const result = await wikiCharacters(wiki, target - inFranchise.length - chosen.length, known, wikiUntranslated, name => excludedIds.has(wikiId(franchise, name)), settings)
    chosen.push(...result.chosen)
    for (const { name } of result.chosen)
      known.add(name)
    fromWikis.push({ franchise, wiki: wiki.id.startsWith('http') ? new URL(wiki.url).host : wiki.id, api: wiki.api, ...result })
    if (inFranchise.length + chosen.length >= target)
      break
  }
}
console.log()
for (const [key, list] of wikiUntranslated)
  untranslated.set(key, [...untranslated.get(key) ?? [], ...list])

// Les noms des jeux des franchises, pour le jeu de 1re apparition cité par les pages des wikis
const gameNames = await fetchNames(franchises.flatMap(franchise => [...franchiseGames.get(franchise)!]))
const seriesGamesOf = (franchise: Franchise) => [...franchiseGames.get(franchise)!]
  .map(id => ({ names: gameNames[id] ?? [], year: games[id]?.isGame ? games[id]!.year : null, game: games[id] }))

// Les personnages de Wikidata sans jeu connu (ni 1re apparition ni jeu relié) : le jeu cité par leur page de wiki,
// son année, son studio, ses genres. Sinon le 1er jeu de la franchise reste, à relire (récap).
const candidates = new Map(selections.flatMap(({ franchise, chosen }) => chosen.map(candidate => [candidate.id, { franchise, candidate }] as const)))
const wikidataEntries = enriched.entries.map(entry => {
  const { franchise, candidate } = candidates.get(entry.id)!
  if (knownGame(candidate, franchise) || franchiseGames.get(franchise)!.size <= 1 || manual.edit[entry.id]?.year !== undefined)
    return entry
  const text = enriched.pageTexts.get(entry.id)
  const cited = text ? citedGame(pageGames(text), seriesGamesOf(franchise)) : null
  if (!cited) {
    wikidataYearGuesses.push(`${entry.name} (${franchise.title}, ${entry.id}) : ${entry.attributes.year ?? '?'}`)
    return entry
  }
  return { ...entry, attributes: { ...entry.attributes, year: cited.year, developer: developer(cited.game, franchise), genres: genresOf(cited.game, franchise) } }
})
const wikiNames = (character: WikiCharacter): CharacterName => ({ full: character.name, native: null, alternative: character.title === character.name ? [] : [character.title] })
const wikiUniqueParts = uniqueNameParts([...selections.flatMap(({ chosen }) => chosen.map(nameFor)), ...fromWikis.flatMap(({ chosen }) => chosen.map(wikiNames))])
const wikiEntries: Entry[] = fromWikis.flatMap(({ franchise, chosen }) => chosen.map(character => {
  const first = firstGameOf(franchise)
  // Le jeu cité par la page : son année, son studio, ses genres. Sinon le 1er jeu de la franchise : juste pour un jeu
  // unique, souvent trop tôt pour une série (Far Cry)
  const seriesGames = seriesGamesOf(franchise)
  const cited = citedGame(character.games, seriesGames)
  const game = cited?.game ?? first
  const year = cited?.year ?? null
  // L'année tirée de l'introduction de la page : à relire. Pas celles déjà corrigées à la main.
  const fixed = manual.edit[wikiId(franchise, character.name)]?.year !== undefined
  if (!fixed && cited && citedGame({ ...character.games, intro: [] }, seriesGames) === null)
    introYears.push(`${character.name} (${franchise.title}) : ${year} (1er jeu de la série : ${first?.year ?? '?'})`)
  if (!fixed && !cited && franchiseGames.get(franchise)!.size > 1)
    yearGuesses.push(`${character.name} (${franchise.title}) : ${first?.year ?? '?'}, 1er jeu de la franchise${character.games.first.length + character.games.all.length > 0 ? ` (jeux cités non reconnus : ${[...character.games.first, ...character.games.all].slice(0, 4).join(', ')})` : ''}`)
  return {
    id: wikiId(franchise, character.name),
    name: character.name,
    aliases: aliases(wikiNames(character), wikiUniqueParts).filter(alias => normalize(alias) !== normalize(character.name)),
    attributes: {
      gender: null, species: null, nationality: null, occupation: null, hair: null,
      ...character.values,
      franchise: franchise.title,
      developer: developer(game, franchise),
      genres: genresOf(game, franchise),
      year: year ?? game?.year ?? null,
    },
  }
}))

// Un personnage ajouté à la main sans développeur, genres, année ou attribut : ceux du 1er jeu de sa franchise, vide sinon
const completeAdded = (entry: Entry): Entry => {
  const franchise = franchises.find(({ title }) => title === entry.attributes.franchise)
  const game = franchise && firstGameOf(franchise)
  const defaults = franchise ? {
    developer: developer(game, franchise),
    genres: genresOf(game, franchise),
    year: game?.year ?? null,
  } : {}
  return { ...entry, attributes: { gender: null, species: null, nationality: null, occupation: null, hair: null, ...defaults, ...entry.attributes } }
}
// Les valeurs par défaut de la franchise pour les attributs vides (espèce « Humain »…), avant les corrections de « edit »
const withDefaults = (entry: Entry): Entry => {
  const defaults = manual.defaults?.[String(entry.attributes.franchise)]
  if (!defaults)
    return entry
  const empty = Object.entries(defaults).filter(([key]) => entry.attributes[key] === null || entry.attributes[key] === undefined)
  return { ...entry, attributes: { ...entry.attributes, ...Object.fromEntries(empty) } }
}
// Les cheveux que l'infobox ne donne pas : cherchés dans le texte de la page entière (« long blonde hair »), à relire.
// Pas ceux corrigés à la main.
// Un personnage d'une page qui en présente plusieurs (listPages) : son morceau de la page, pas la page entière
const sections = new Map(fromWikis.flatMap(({ franchise, chosen }) => chosen.flatMap(({ name, section }) => section ? [[wikiId(franchise, name), section] as const] : [])))
const pageRefs = new Map([...enriched.pageRefs, ...fromWikis.flatMap(({ franchise, api, chosen }) => chosen.filter(({ section }) => !section).map(({ name, title }) => [wikiId(franchise, name), { api, title }] as const))])
const hairless = [...wikidataEntries, ...wikiEntries].filter(entry => entry.attributes.hair === null && (pageRefs.has(entry.id) || sections.has(entry.id)) && !('hair' in (manual.edit[entry.id] ?? {})))
const textHairs = new Map<string, string[]>()
const hairExcerpts: string[] = []
const hairFromText = (entry: Entry, text: string | null | undefined) => {
  const found = text ? textHair(text) : null
  if (!found)
    return
  textHairs.set(entry.id, found.colors)
  hairExcerpts.push(`${entry.name} (${entry.attributes.franchise}) : ${found.colors.join(', ')} ← « ${found.excerpt} »`)
}
for (const entry of hairless.filter(entry => sections.has(entry.id)))
  hairFromText(entry, sections.get(entry.id))
const byApi = Map.groupBy(hairless.filter(entry => pageRefs.has(entry.id)), entry => pageRefs.get(entry.id)!.api)
let read = 0
for (const [api, group] of byApi) {
  process.stdout.write(`\rCheveux dans le texte : ${++read}/${byApi.size}`.padEnd(80))
  const pages = await fullPages(api, group.map(entry => pageRefs.get(entry.id)!.title))
  for (const entry of group)
    hairFromText(entry, pages[pageRefs.get(entry.id)!.title])
}
console.log()

// En dernier recours, la page Wikipédia anglaise du personnage (lien de Wikidata), quand le wiki de la franchise ne
// donne ni cheveux ni occupation (« Alena » y est une page d'homonymie, Jill Valentine n'a pas de couleur de cheveux) :
// ses cheveux, sans ce qui parle de sa conception (DEVELOPMENT), et son introduction pour l'occupation. À relire.
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'
const WIKIPEDIA = ' (Wikipédia)'
const enwikiOf = (entry: Entry) => candidates.get(entry.id)?.candidate.character.enwiki
const corrected = (entry: Entry, key: string) => key in (manual.edit[entry.id] ?? {})
const wikipediaHairless = wikidataEntries.filter(entry => entry.attributes.hair === null && !textHairs.has(entry.id) && enwikiOf(entry) && !corrected(entry, 'hair'))
const wikipediaJobless = wikidataEntries.filter(entry => !(entry.attributes.occupation as string[] | null)?.length && enwikiOf(entry) && !corrected(entry, 'occupation'))
process.stdout.write('Wikipédia en dernier recours…')
const wikipediaPages = await fullPages(WIKIPEDIA_API, [...new Set([...wikipediaHairless, ...wikipediaJobless].map(entry => enwikiOf(entry)!))])
console.log()
for (const entry of wikipediaHairless) {
  const text = wikipediaPages[enwikiOf(entry)!]
  const found = text ? textHair(text, DEVELOPMENT) : null
  if (!found)
    continue
  textHairs.set(entry.id, found.colors)
  hairExcerpts.push(`${entry.name} (${entry.attributes.franchise})${WIKIPEDIA} : ${found.colors.join(', ')} ← « ${found.excerpt} »`)
}
const wikipediaIntros = new Map(wikipediaJobless.flatMap(entry => {
  const text = wikipediaPages[enwikiOf(entry)!]
  return text ? [[entry.id, introText(text)] as const] : []
}))
const withTextHair = (entry: Entry): Entry => textHairs.has(entry.id) ? { ...entry, attributes: { ...entry.attributes, hair: textHairs.get(entry.id)! } } : entry

// L'occupation que l'infobox ne donne pas : tirée de l'introduction de la page (« X is a Vietnam veteran »), à relire.
// Pas celles corrigées à la main.
const MAX_INTRO_OCCUPATIONS = 2
const introsById = new Map([
  ...[...enriched.pageTexts].map(([id, text]) => [id, introText(text)] as const),
  ...fromWikis.flatMap(({ franchise, chosen }) => chosen.map(({ name, games }) => [wikiId(franchise, name), games.intro?.[0] ?? ''] as const)),
])
const occupationExcerpts: string[] = []
const entityRoles: string[] = []
// Les armes ajoutées à l'occupation, au plus
const MAX_WEAPONS = 2
const ENTITY_SPECIES = new Set(['Deity', 'Demon', 'Angel'])
const withIntroOccupation = (entry: Entry): Entry => {
  const empty = !(entry.attributes.occupation as string[] | null)?.length
  if (!empty || 'occupation' in (manual.edit[entry.id] ?? {}))
    return entry
  const fromIntro = (intro: string) => {
    const roles = introRoles(intro)
    return { roles, occupation: [...new Set(roles.map(translateOccupation).filter((name): name is string => Boolean(name)))].slice(0, MAX_INTRO_OCCUPATIONS) }
  }
  // L'introduction du wiki de la franchise, sinon celle de Wikipédia
  let { roles, occupation } = fromIntro(introsById.get(entry.id) ?? '')
  let source = ''
  if (occupation.length === 0 && wikipediaIntros.has(entry.id)) {
    ({ roles, occupation } = fromIntro(wikipediaIntros.get(entry.id)!))
    source = WIKIPEDIA
  }
  // Rien dans l'intro : le titre de noblesse du nom (« Lord Hammond »), en tout dernier recours
  const titled = (entry.attributes[NAME_TITLE] as string[] | null | undefined) ?? []
  if (occupation.length === 0 && titled.length > 0)
    return { ...entry, attributes: { ...entry.attributes, occupation: titled } }
  if (occupation.length === 0)
    return entry
  occupationExcerpts.push(`${entry.name} (${entry.attributes.franchise})${source} : ${occupation.join(', ')} ← « ${roles.join(' | ')} »`)
  return { ...entry, attributes: { ...entry.attributes, occupation } }
}

const manualApplied = applyManual([...wikidataEntries, ...wikiEntries].map(withDefaults).map(withTextHair).map(withIntroOccupation), { ...manual, add: manual.add.map(completeAdded) }, pixeldle.attributes.map(({ key }) => key))
const warnings = manualApplied.warnings
// À la fin, corrections comprises : l'espèce dépliée (Demi-elfe → Humain + Elfe, Renard → Renard + Animal), les occupations
// regroupées, N/A pour les cheveux d'un robot ou d'un animal
const finished = manualApplied.entries.map(entry => {
  const species = expandSpecies(entry.attributes.species)
  // Les armes s'ajoutent à l'occupation (Soldat + Tireur), puis l'attribut de travail disparaît
  const { weapon, [NAME_TITLE]: _title, ...attributes } = entry.attributes
  const known = mergeOccupations([...(attributes.occupation as string[] | null) ?? [], ...((weapon as string[] | undefined) ?? []).slice(0, MAX_WEAPONS)]) ?? null
  const occupation = known ?? functionRole(entry) ?? entityRole(entry, species)
  return { ...entry, attributes: { ...attributes, species, occupation: occupationOrChoice(occupation, species), hair: hairOrNone(attributes.hair, species) as string[] | null } }
})

// La nationalité vide : Monde réel si la franchise s'y passe, vide sinon, et les univers
// partagés (Lost in the Galaxy, Mythe de Cthulhu) pour tous, voir withWorld
const worlds = new Map([...Map.groupBy(finished, entry => String(entry.attributes.franchise))].map(([franchise, list]) => [franchise,
  franchise in FRANCHISE_WORLDS ? FRANCHISE_WORLDS[franchise]! : franchiseWorld(list.map(entry => entry.attributes.nationality as string[] | null))]))
// Les nationalités de chaque franchise, pour les affiliations (« Humanity/Albion » : Albion). Une affiliation qui n'en est
// pas une (faction, équipe, perso) n'est jamais prise. Une alliance (Daisy et le Royaume Champignon) se retire à la main.
const franchiseNations = new Map([...Map.groupBy(finished, entry => String(entry.attributes.franchise))].map(([franchise, list]) =>
  [franchise, new Set(list.flatMap(entry => (entry.attributes.nationality as string[] | null) ?? []))]))
const worldFills: string[] = []
const affiliationFills: string[] = []
const placed = finished.map(entry => {
  const { [AFFILIATIONS]: affiliations, ...attributes } = entry.attributes
  const franchise = String(entry.attributes.franchise)
  const own = (attributes.nationality as string[] | null) ?? []
  const added = ((affiliations as string[] | undefined) ?? []).filter(place => franchiseNations.get(franchise)!.has(place) && !own.includes(place))
  if (added.length > 0)
    affiliationFills.push(`${entry.name} (${franchise}) : ${own.length > 0 ? `${own.join(', ')} + ` : ''}${added.join(', ')}`)
  const places = added.length > 0 ? [...own, ...added] : attributes.nationality as string[] | null
  const nationality = withWorld(places, entry.attributes.species, worlds.get(franchise) ?? null, franchiseUniverses(franchise))
  if (!places?.length && nationality)
    worldFills.push(`${entry.name} (${franchise}) : ${nationality.join(', ')}`)
  return { ...entry, attributes: { ...attributes, nationality } }
})
// Unknown dans les cases restées vides que le wiki disait inconnues (fillUnknowns), puis les corrections encore une
// fois, à la fin : une valeur retirée à la main reste retirée (une arme redonnerait l'occupation)
const entries = finishManual(fillUnknowns(placed, pixeldle.attributes), manual, pixeldle.attributes.map(({ key }) => key))

// Sans métier : Compagnon ou Assistant quand l'introduction le dit (« Epona is Link's horse »), à relire dans le récap
function functionRole(entry: Entry): string[] | null {
  const role = introFunction(introsById.get(entry.id) ?? '', entry.name)
  if (!role)
    return null
  entityRoles.push(`${entry.name} (${entry.attributes.franchise}) : ${role}`)
  return [role]
}

// Un dieu, un démon ou un ange sans métier : Destructeur s'il est hostile, Protecteur s'il est du côté du joueur
// (d'après l'introduction de sa page), à relire dans le récap
function entityRole(entry: Entry, species: string[] | null): string[] | null {
  if (!species?.some(name => ENTITY_SPECIES.has(name)))
    return null
  const alignment = introAlignment(introsById.get(entry.id) ?? '')
  if (!alignment)
    return null
  const role = alignment === 'hostile' ? 'Destroyer' : 'Protector'
  entityRoles.push(`${entry.name} (${entry.attributes.franchise}) : ${role}`)
  return [role]
}
await writeFile(new URL('data/pixeldle.json', root), `${JSON.stringify(entries, null, 1)}\n`)

// --- Récap ---

const percent = (count: number) => `${Math.round(count / Math.max(entries.length, 1) * 100)} %`
const lines: string[] = [`# Récap du Pixeldle : ${entries.length} personnages, ${franchises.length} franchises`, '']
lines.push(`Corrections (data/pixeldle-manual.json) : ${manual.exclude.length} retirés, ${editedIds.size} corrigés, ${manual.add.length} ajoutés`, '')
if (warnings.length > 0)
  lines.push(`## ⚠️ Corrections qui ne collent pas (${warnings.length})`, ...warnings.map(text => `- ${text}`), '')

lines.push('## Remplissage', '')
for (const { key, label: name } of pixeldle.attributes) {
  const filled = entries.filter(entry => entry.attributes[key] !== null && entry.attributes[key] !== undefined).length
  lines.push(`- ${name} : ${percent(filled)}`)
}
lines.push('')
lines.push(`Écartés avant l'attribution : ${pokemonSpecies} espèces de Pokémon, ${unnamed} éléments sans nom FR ni EN, ${guests.length} invités venus d'un autre média`, '')

// Après les corrections à la main : les personnages ajoutés comptent
const namesIn = (franchise: Franchise) => entries.filter(entry => entry.attributes.franchise === franchise.title).map(({ name }) => name)
const few = franchises.map(franchise => ({ franchise, names: namesIn(franchise) })).filter(({ names }) => names.length < MIN_PER_FRANCHISE)
lines.push(`## Franchises avec moins de 4 personnages (${few.length})`, ...few.map(({ franchise, names }) => `- ${franchise.title} : ${names.length}${names.length > 0 ? ` (${names.join(', ')})` : ''}`), '')

lines.push(`## Ajoutés depuis les wikis (${wikiEntries.length}) : catégorie « Characters », les plus longues pages avec une infobox qui donne le sexe`, '',
  ...fromWikis.map(({ franchise, wiki, root, found, chosen }) => `- ${franchise.title} (${wiki}) : ${root ? `${found} pages dans Category:${root}` : 'pas de catégorie des personnages'}, ${chosen.length} gardés${chosen.length > 0 ? ` : ${chosen.map(({ name, title }) => name === title ? name : `${name} (« ${title} »)`).join(', ')}` : ''}`), '')

lines.push(`## Rôles d'après l'introduction : Compagnon, Assistant, et Destructeur ou Protecteur pour les dieux, démons et anges (${entityRoles.length}) : à relire`, ...entityRoles.map(text => `- ${text}`), '')
const worldNames = { real: REAL_WORLD, other: 'autre monde (vide)' }
lines.push(`## Monde des franchises (${worlds.size}) : FRANCHISE_WORLDS sinon les lieux des personnages, à relire`,
  ...[...worlds].map(([franchise, world]) => `- ${franchise} : ${world ? worldNames[world] : 'on ne sait pas'}${franchise in FRANCHISE_WORLDS ? ' (table)' : ''}${franchiseUniverses(franchise).map(universe => `, ${universe}`).join('')}`), '')
lines.push(`## Nationalité complétée par l'affiliation (${affiliationFills.length})`, ...affiliationFills.map(text => `- ${text}`), '')
lines.push(`## Nationalité vide remplie par le monde de la franchise (${worldFills.length})`, ...worldFills.map(text => `- ${text}`), '')
lines.push(`## Occupations tirées de l'introduction (${occupationExcerpts.length}) : à relire`, ...occupationExcerpts.map(text => `- ${text}`), '')
lines.push(`## Cheveux tirés du texte des pages (${hairExcerpts.length}) : à relire`, ...hairExcerpts.map(text => `- ${text}`), '')
lines.push(`## Ajoutés depuis les wikis, année devinée (${yearGuesses.length}) : aucun jeu reconnu dans l'infobox, 1er jeu de la série pris par défaut`, ...yearGuesses.map(text => `- ${text}`), '')
lines.push(`## Ajoutés depuis les wikis, année tirée de l'introduction (${introYears.length}) : le plus ancien jeu de la série cité, à relire`, ...introYears.map(text => `- ${text}`), '')
lines.push(`## Wikidata, année devinée (${wikidataYearGuesses.length}) : ni 1re apparition ni jeu relié, 1er jeu de la franchise pris par défaut`, ...wikidataYearGuesses.map(text => `- ${text}`), '')

lines.push('## Personnages par franchise (gardés / attribués, jeux de la série, principaux)', '')
for (const { franchise, total } of selections)
  lines.push(`- ${franchise.title} : ${namesIn(franchise).length} / ${total}, ${franchiseGames.get(franchise)!.size} jeux, ${mainCounts.get(franchise)} principaux${namesIn(franchise).length < MIN_PER_FRANCHISE ? '  ⚠️' : ''}`)
lines.push('')

// Les valeurs brutes de Wikidata, à ramener à nos listes (tables de traduction)
const frequencies = (list: string[]) => [...list.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<string, number>())]
  .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
for (const key of ['species', 'nationality', 'occupation', 'hair', 'developer', 'genres'] as const) {
  const values = entries.flatMap(entry => {
    const value = entry.attributes[key]
    return value === null || value === undefined ? [] : Array.isArray(value) ? value as string[] : [String(value)]
  })
  const list = frequencies(values)
  lines.push(`## Valeurs : ${pixeldle.attributes.find(attribute => attribute.key === key)!.label} (${list.length})`, ...list.map(([value, count]) => `- ${value} (${count})`), '')
}

// Les lieux par franchise : pour repérer deux écritures du même lieu (Koopa Kingdom / Royaume Koopa), qui ne se
// croiseraient pas dans le jeu
const placesByFranchise = new Map<string, string[]>()
for (const entry of entries) {
  const places = entry.attributes.nationality as string[] | null
  const franchise = String(entry.attributes.franchise)
  placesByFranchise.set(franchise, [...placesByFranchise.get(franchise) ?? [], ...places ?? []])
}
lines.push('## Lieux par franchise : deux écritures du même lieu ?', '', ...[...placesByFranchise].filter(([, places]) => places.length > 0)
  .map(([franchise, places]) => `- ${franchise} : ${frequencies(places).map(([place, count]) => `${place} (${count})`).join(', ')}`), '')
// Ce que les wikis ont apporté
lines.push('## Compléments des wikis', '', ...[...enriched.byWiki].toSorted((a, b) => b[1].found - a[1].found)
  .map(([wiki, { found, filled }]) => `- ${wiki} : ${found} pages trouvées${Object.keys(filled).length > 0 ? `, remplis : ${Object.entries(filled).map(([key, count]) => `${key} ${count}`).join(', ')}` : ''}`), '')
const fieldList = [...enriched.fieldNames].toSorted((a, b) => b[1] - a[1]).slice(0, 80)
lines.push('## Champs des infobox rencontrées (les 80 plus fréquents)', fieldList.map(([name, count]) => `${name} (${count})`).join(', '), '')
const enrichLines = [
  `# Ce que les wikis ont rempli (${enriched.details.length} personnages)`, '',
  `## À vérifier (${enriched.doubtful.length}) : peut-être la page d'un autre personnage (wiki partagé, ou alias), à corriger avec edit`, '',
  ...enriched.doubtful.map(text => `- ${text}`), '',
  '## Tout', '',
  ...enriched.details.map(text => `- ${text}`),
]
await writeFile(new URL('pixeldle-enrich.md', cacheDir), `${enrichLines.join('\n')}\n`)

// Ce que les tables de traduction (scripts/pixeldleTranslate.ts) ne connaissent pas : gardé brut
for (const [attribute, values] of untranslated) {
  const list = frequencies(values)
  const name = pixeldle.attributes.find(({ key }) => key === attribute)!.label
  lines.push(`## Pas traduits : ${name} (${list.length}), à ajouter dans pixeldleTranslate.ts`, ...list.map(([value, count]) => `- ${value} (${count})`), '')
}

for (const [name, key] of [['sexe', 'gender'], ['espèce', 'species'], ['année', 'year']] as const) {
  const missing = entries.filter(entry => entry.attributes[key] === null)
  const byFranchise = new Map<string, string[]>()
  for (const entry of missing)
    byFranchise.set(String(entry.attributes.franchise), [...byFranchise.get(String(entry.attributes.franchise)) ?? [], `${entry.name} (${entry.id})`])
  lines.push(`## Sans ${name} (${missing.length}, ${percent(missing.length)})`, ...[...byFranchise].map(([title, names]) => `- ${title} : ${names.join(', ')}`), '')
}

const keptIds = new Set(entries.map(entry => entry.id))
const keptDuplicates = [...duplicates].filter(([id]) => keptIds.has(id)).map(([, text]) => text)
lines.push(`## Personnages dans plusieurs franchises de la liste (${keptDuplicates.length} gardés)`, ...keptDuplicates.map(text => `- ${text}`), '')
lines.push(`## Invités écartés (${guests.length})`, ...guests.map(text => `- ${text}`), '')
const keptSuspects = suspects.filter(({ id }) => keptIds.has(id))
lines.push(`## Gardés, mais peut-être invités (${keptSuspects.length}) : personnage d'un autre média, à retirer avec exclude si c'est un invité`, ...keptSuspects.map(({ text }) => `- ${text}`), '')

// Noms ou alias partagés par plusieurs personnages : la recherche prendra le premier
const owners = new Map<string, Set<string>>()
for (const entry of entries) {
  for (const key of new Set([entry.name, ...entry.aliases ?? []].map(normalize)))
    owners.set(key, (owners.get(key) ?? new Set()).add(`${entry.name} (${entry.attributes.franchise})`))
}
const ambiguous = [...owners].filter(([key, names]) => key && names.size > 1)
lines.push(`## Noms partagés par plusieurs personnages (${ambiguous.length})`, ...ambiguous.map(([key, names]) => `- « ${key} » : ${[...names].join(', ')}`), '')

const recap = lines.join('\n')
await writeFile(new URL('pixeldle-recap.md', cacheDir), recap)
console.log(lines.slice(0, 20).join('\n'))
console.log(`\n${entries.length} personnages écrits dans data/pixeldle.json, récap complet dans .cache/pixeldle/pixeldle-recap.md`)

const kept = new Map(franchises.map(franchise => [franchise.title, entries.filter(entry => entry.attributes.franchise === franchise.title).length]))
await writeFile(new URL('pixeldle-wikis.md', cacheDir), wikisRecap(wikis, kept))
console.log('Wikis des franchises dans .cache/pixeldle/pixeldle-wikis.md')
