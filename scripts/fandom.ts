// Complète le sexe, les cheveux et l'occupation avec l'infobox des wikis Fandom (un wiki par anime, très fourni,
// même pour les personnages secondaires). Chaque wiki a l'API MediaWiki : <wiki>.fandom.com/api.php.
// 1. Le wiki de chaque anime : la table WIKIS, sinon deviné à partir du titre (vérifié : le wiki doit exister)
// 2. La page de chaque personnage : le lien direct de Wikidata (P6262) s'il existe, sinon son nom (les deux ordres,
//    sans voyelles longues) et ses alias, 50 titres par requête
// 3. Les champs de l'infobox : hair / Hair Color, occupation, gender, age... Une page d'homonymie : ses liens suivis.
// 4. Les cheveux que l'infobox ne donne pas : dans le texte de la page entière (section Appearance d'abord)
// Réponses gardées dans .cache/fandom/ (hors git) : supprimer le dossier pour tout retélécharger.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { gender as pronounGender, heightCm, sleep, splitOccupations, weaponList } from './anilist.js'
import { introRoles, introText, MAX_INTRO_SENTENCES } from './intro.js'
import { addedValues, exactSpecies, translateOccupation } from './translate.js'
import { addUnknowns, isUnknownValue, UNKNOWN_KEYS, unknownKeys } from './unknownValues.js'
import { cleanValue, pageTitles, shortVowels, wikiGender, wikiHair, type WikiTarget } from './wikipedia.js'
import { disambiguationLinks, infoboxAge, plainText, textHair } from './wikiText.js'

const USER_AGENT = 'quizdle-data/1.0'
const TITLES_PER_REQUEST = 50
const DELAY_MS = 500
const MAX_ATTEMPTS = 5
const MAX_CACHED_LENGTH = 20_000

// Les wikis qu'on ne devine pas à partir du titre (clé : titre normalisé de l'anime). Plusieurs : essayés dans l'ordre.
// null : pas de wiki utilisable.
const WIKIS: Record<string, string[] | null> = {
  [normalize('A Certain Scientific Railgun')]: ['toarumajutsunoindex'],
  [normalize('A Certain Magical Index')]: ['toarumajutsunoindex'],
  [normalize('Re:ZERO -Starting Life in Another World-')]: ['rezero'],
  [normalize('Kaguya-sama: Love is War')]: ['kaguyasama-wa-kokurasetai'],
  [normalize('That Time I Got Reincarnated as a Slime')]: ['tensura'],
  [normalize('Puella Magi Madoka Magica')]: ['madoka', 'puellamagimadokamagica'],
  [normalize('JoJo\'s Bizarre Adventure')]: ['jojo'],
  [normalize('JoJo\'s Bizarre Adventure (TV)')]: ['jojo'],
  [normalize('Fate/stay night')]: ['typemoon'],
  [normalize('Fate/stay night: Unlimited Blade Works')]: ['typemoon'],
  [normalize('Fate/Zero')]: ['typemoon'],
  [normalize('Toradora!')]: ['tora-dora'],
  [normalize('The Apothecary Diaries')]: ['kusuriya'],
  [normalize('The Rising of the Shield Hero')]: ['shield-hero', 'tate-no-yuusha-no-nariagari', 'the-rising-of-the-shield-hero'],
  [normalize('Danganronpa 3: The End of Hope’s Peak High School - Future Arc')]: ['danganronpa'],
  [normalize('Classroom of the Elite')]: ['you-zitsu', 'classroom-of-the-elite'],
  [normalize('Darwin\'s Game')]: ['darwins-game', 'darwinsgame'],
  [normalize('Devilman Crybaby')]: ['devilman'],
  [normalize('Grimgar of Fantasy and Ash')]: ['grimgar'],
  [normalize('Hellsing Ultimate')]: ['hellsing'],
  [normalize('Is It Wrong to Try to Pick Up Girls in a Dungeon?')]: ['danmachi'],
  [normalize('Mekakucity Actors')]: ['kagerou-project', 'kagerouproject'],
  [normalize('Ouran High School Host Club')]: ['ouran', 'ouranhighschoolhostclub'],
  [normalize('Paradise Kiss')]: ['parakiss'],
  [normalize('Rascal Does Not Dream of Bunny Girl Senpai')]: ['aobuta', 'seishun-buta-yarou'],
  [normalize('Revolutionary Girl Utena')]: ['utena', 'revolutionarygirlutena'],
  [normalize('Trapped in a Dating Sim: The World of Otome Games Is Tough for Mobs')]: ['mobuseka'],
  [normalize('Tsubasa RESERVoir CHRoNiCLE')]: ['tsubasa', 'clamp'],
  [normalize('Uncle from Another World')]: ['isekai-ojisan', 'uncle-from-another-world'],
  [normalize('Vivy -Fluorite Eye\'s Song-')]: ['vivy', 'vivy-fluorite-eyes-song'],
  [normalize('BNA')]: ['brand-new-animal'],
  [normalize('Battle Game in 5 Seconds')]: ['battle-in-5-seconds-after-meeting'],
  [normalize('Chivalry of a Failed Knight')]: ['rakudai-kishi'],
  [normalize('The Unwanted Undead Adventurer')]: ['the-unwanted-immortal-adventurer'],
  [normalize('The Witch and the Beast')]: ['witchandthebeast'],
  [normalize('I\'m the Villainess, So I\'m Taming the Final Boss')]: ['im-the-villainess-so-im-taming-the-final-boss', 'akuyaku-reijou'],
  [normalize('Smoking Behind the Supermarket with You')]: ['yanisuu'],
  // Le wiki de Satoshi Kon : tous ses films, donc les persos de Paprika aussi
  [normalize('Paprika')]: ['satoshikon'],
  // Animedle
  [normalize('Attack on Titan')]: ['attackontitan', 'shingekinokyojin'],
  [normalize('Mob Psycho 100')]: ['mob-psycho-100', 'mobpsycho100'],
  [normalize('Frieren: Beyond Journey’s End')]: ['frieren'],
  [normalize('Fullmetal Alchemist')]: ['fma', 'fullmetalalchemist'],
  // Pas fullmetal-alchemist-brotherhood : une galerie d'images, sans infobox
  [normalize('Fullmetal Alchemist: Brotherhood')]: ['fma'],
  [normalize('Demon Slayer: Kimetsu no Yaiba')]: ['kimetsu-no-yaiba', 'demonslayer'],
  [normalize('My Dress-Up Darling')]: ['sono-bisque-doll-wa-koi-wo-suru', 'my-dress-up-darling'],
  [normalize('My Hero Academia')]: ['bokunoheroacademia', 'myheroacademia'],
  [normalize('KONOSUBA -God\'s blessing on this wonderful world!')]: ['konosuba'],
  [normalize('Bungo Stray Dogs')]: ['bungostraydogs'],
  [normalize('The Quintessential Quintuplets')]: ['5hanayome', 'gotoubun-no-hanayome'],
  [normalize('Dr. STONE')]: ['dr-stone', 'drstone'],
  [normalize('One-Punch Man')]: ['onepunchman'],
  [normalize('Neon Genesis Evangelion')]: ['evangelion'],
  [normalize('Bakemonogatari')]: ['bakemonogatari'],
  [normalize('HAIKYU!!')]: ['haikyuu'],
  [normalize('My Teen Romantic Comedy SNAFU')]: ['oregairu', 'yahari-ore-no-seishun-love-comedy-wa-machigatteiru'],
  [normalize('OSHI NO KO')]: ['oshi-no-ko', 'oshinoko'],
  [normalize('A Silent Voice')]: ['koenokatachi', 'a-silent-voice'],
  [normalize('Mushoku Tensei: Jobless Reincarnation')]: ['mushokutensei'],
  [normalize('Monster')]: ['obluda'],
  // Wiki en français seulement : <wiki>/<langue>
  [normalize('Assassination Classroom')]: ['assassination-classroom/fr'],
  [normalize('86 EIGHTY-SIX')]: ['86-eighty-six', 'eighty-six'],
  [normalize('Land of the Lustrous')]: ['houseki-no-kuni'],
  [normalize('The Promised Neverland')]: ['yakusokunoneverland'],
  [normalize('Rent-a-Girlfriend')]: ['kanojo-okarishimasu'],
  [normalize('Your lie in April')]: ['shigatsu-wa-kimi-no-uso'],
  [normalize('Cyberpunk: Edgerunners')]: ['cyberpunk'],
  [normalize('Toilet-bound Hanako-kun')]: ['hanako-kun'],
  [normalize('The Legend of Luoxiaohei')]: ['the-legend-of-luo-xiaohei', 'luoxiaohei'],
  [normalize('Serial Experiments Lain')]: ['lain'],
  [normalize('NANA')]: ['nana-anime', 'nana'],
  [normalize('Komi Can’t Communicate')]: ['komi-san', 'komisan'],
  [normalize('Love, Chunibyo & Other Delusions')]: ['chunibyo'],
  [normalize('The Seven Deadly Sins')]: ['nanatsu-no-taizai'],
  [normalize('GTO: Great Teacher Onizuka')]: ['gto', 'great-teacher-onizuka'],
  [normalize('DAN DA DAN')]: ['dandadan'],
  [normalize('Solo Leveling')]: ['solo-leveling', 'sololeveling'],
  [normalize('Black Lagoon')]: ['lagooncompany'],
  [normalize('The World God Only Knows')]: ['kaminomi'],
}

// Les champs de l'infobox, selon les wikis (anglais, et français pour les wikis en /fr)
const FIELDS = {
  gender: ['gender', 'sex', 'sexe', 'genre'],
  // Dans l'ordre : le métier actuel d'abord, l'ancien (« previous occupation ») en dernier recours. Le grade militaire
  // (Youjo Senki, 86) sans métier : Officer, Soldier… Pas « rank » tout court, ailleurs c'est un classement (One Punch Man).
  occupation: ['occupation', 'current occupation', 'occupations', 'occupation(s)', 'profession', 'professions', 'profession(s)', 'job', 'jobs', 'job(s)',
    'métier', 'activité', 'fonction', 'unioccupation', 'hsoccupation', 'position', 'postion', 'military rank', 'previous occupation', 'former occupation', 'f. occupation'],
  hair: ['hair', 'hair color', 'hair colour', 'haircolor', 'hair_color', 'hair colors', 'cheveux', 'couleur de cheveux', 'couleur des cheveux'],
  age: ['age', 'âge', 'ages'],
  // L'espèce brute, traduite à la fin (translateSpeciesEntries) ; la taille en cm (Weebdle seulement)
  // classification : DARLING in the FRANXX, Index ; type : Fate (« Servant, Human, Magus »), ailleurs souvent autre chose
  // (le type de Nen à Hunter x Hunter), mis de côté comme tout ce qui n'est pas une espèce connue
  species: ['species', 'race', 'races', 'species/race', 'espèce', 'classification', 'kind', 'type'],
  height: ['height', 'heights', 'taille'],
  // L'arme rejoint l'occupation à la fin (finishOccupations)
  weapon: ['weapon', 'weapons', 'weapon(s)', 'armament', 'armaments', 'arme', 'armes', 'equipment', 'equipment/s'],
  // Les titres (« Red King », « The Black Swordsman ») : ajoutés à l'occupation à la fin aussi, ceux qu'on sait traduire
  titles: ['titles', 'title(s)', 'epithet', 'epithets'],
  // Mort : « Aucune » comme occupation s'il n'en a pas d'autre (finishOccupations). Jamais affiché tel quel : un spoil.
  deceased: ['status', 'vital status'],
  // La famille de sang liée (« [[Mabel Crane]] (Sister) ») : son espèce, faute de nom de famille commun (familySpecies)
  relatives: ['relatives', 'relative', 'family', 'relations'],
} as const
type Key = keyof typeof FIELDS

const cacheDir = new URL('../.cache/fandom/', import.meta.url)
const cacheFile = (name: string) => new URL(`${name}.json`, cacheDir)

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const text = await readFile(cacheFile(name), 'utf8').catch(() => null)
  return text ? JSON.parse(text) as T : fallback
}

const writeJson = (name: string, value: unknown) => writeFile(cacheFile(name), JSON.stringify(value))

// Une requête à l'API d'un wiki, avec reprise quand Fandom nous freine. null : le wiki n'existe pas.
async function api(wiki: string, params: Record<string, string>): Promise<any | null> {
  // « assassination-classroom/fr » : le wiki en français est sous fandom.com/fr
  const [host, language] = wiki.split('/')
  const url = `https://${host}.fandom.com${language ? `/${language}` : ''}/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual' }).catch(() => null)
    // Un wiki qui n'existe pas : redirection vers la page « pas trouvé », ou nom de domaine inconnu
    if (!response || (response.status >= 300 && response.status < 400) || response.status === 404)
      return null
    const text = await response.text()
    if (response.ok && text.startsWith('{'))
      return JSON.parse(text)
    if (attempt === MAX_ATTEMPTS)
      throw new Error(`Fandom ${wiki} : ${response.status} ${text.slice(0, 200)}`)
    const wait = 15_000 * attempt
    process.stdout.write(`\n  Fandom (${wiki}) nous freine, nouvel essai dans ${wait / 1000} s\n`)
    await sleep(wait)
  }
}

// --- 1. Le wiki de chaque anime ---

// « Fullmetal Alchemist: Brotherhood » → fullmetal-alchemist-brotherhood, fullmetalalchemistbrotherhood, fullmetal-alchemist...
function guesses(titles: string[]): string[] {
  const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const short = (text: string) => text.split(/[:!?\-–]| season| the movie/i)[0]!
  return [...new Set(titles.filter(Boolean).flatMap(title => [title, short(title)]).map(slug)
    .flatMap(name => [name, name.replace(/-/g, '')]).filter(name => name.length >= 3 && name.length <= 50))]
}

async function findWiki(anime: string, titles: string[], wikis: Record<string, string | null>): Promise<string | null> {
  const key = normalize(anime)
  const listed = WIKIS[key]
  // Le wiki du cache, sauf s'il n'est plus dans la liste écrite à la main (FMA Brotherhood, passé sur fma : le cache
  // gardait l'ancien wiki trouvé au hasard)
  if (key in wikis && (listed === undefined || (listed === null ? wikis[key] === null : listed.includes(wikis[key]!))))
    return wikis[key]!
  const candidates = listed === null ? [] : listed ?? guesses([anime, ...titles])
  let found: string | null = null
  for (const candidate of candidates) {
    const info = await api(candidate, { action: 'query', meta: 'siteinfo' })
    if (info?.query?.general) {
      found = candidate
      break
    }
  }
  wikis[key] = found
  await writeJson('wikis', wikis)
  return found
}

// --- 2. Les pages des personnages ---

// Le lien direct de Wikidata vers l'article Fandom (« naruto:Gaara »), par id AniList
async function wikidataArticles(): Promise<Record<string, string>> {
  const cached = await readJson<Record<string, string> | null>('wikidata-articles', null)
  if (cached)
    return cached
  const query = 'SELECT ?anilist ?article WHERE { ?item wdt:P11736 ?anilist ; wdt:P6262 ?article }'
  const response = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' } })
  const json = await response.json() as { results: { bindings: { anilist: { value: string }, article: { value: string } }[] } }
  const articles = Object.fromEntries(json.results.bindings.map(binding => [binding.anilist.value, binding.article.value]))
  await writeJson('wikidata-articles', articles)
  return articles
}

// Les titres à essayer : le lien Wikidata, puis le nom et les alias en lettres latines
// Avec les voyelles longues en macron aussi, comme beaucoup de wikis (« Shima Toratarō », « Tokita Kōsaku »)
// Les alias que portent plusieurs persos d'un même anime (le nom de famille, gardé en alias même partagé) : pas des
// titres de page à essayer. La page « Jahad » est celle du roi, pas d'Anaak Jahad ; « Daigo », celle du père de
// Tahoumaru Daigo. Sans page à son nom, la recherche du wiki le trouve (« Anak Zahard »).
const aliasKey = (anime: unknown, alias: string) => `${anime}|${normalize(alias)}`
export function sharedAliases(entries: Entry[]): Set<string> {
  const owners = new Map<string, number>()
  for (const entry of entries)
    for (const key of new Set((entry.aliases ?? []).map(alias => aliasKey(entry.attributes.anime, alias))))
      owners.set(key, (owners.get(key) ?? 0) + 1)
  return new Set([...owners].filter(([, count]) => count > 1).map(([key]) => key))
}

export function characterTitles(target: WikiTarget, article: string | undefined, shared: Set<string> = new Set()): string[] {
  const aliases = (target.entry.aliases ?? []).filter(alias => /[a-z]/i.test(alias) && alias.length >= 3
    && !shared.has(aliasKey(target.entry.attributes.anime, alias)))
  const names = pageTitles(target.name)
  const macrons = names.map(title => title.replace(/ou/g, 'ō').replace(/uu/g, 'ū').replace(/oo/g, 'ō')).filter(title => !names.includes(title))
  // Les alias aussi sans voyelles longues (« Tahoumaru » → « Tahomaru », Dororo)
  const shortAliases = aliases.map(shortVowels).filter(alias => alias.length >= 3)
  return [...new Set([...(article ? [article.replace(/_/g, ' ')] : []), ...names, ...macrons, ...aliases, ...shortAliases])]
    .filter(title => !/[#<>[\]{}|]/.test(title))
}

// Pas de page au nom du perso : la recherche du wiki, quand AniList et le wiki ne l'appellent pas pareil (« Pyoran »
// → « Pioran », « Kansatsu-sha » → « The Beholder » sur le wiki de To Your Eternity). Sans les sous-pages (« Pioran/Plot »)
// ni les épisodes ou chapitres ; le résultat ne compte que s'il a une infobox de perso (voir completeFromFandom).
const SEARCH_RESULTS = 3
async function searchTitles(wiki: string, names: string[]): Promise<Record<string, string[]>> {
  const name = `search-${wiki.replace('/', '-')}`
  const cache = await readJson<Record<string, string[]>>(name, {})
  const missing = [...new Set(names)].filter(query => !(query in cache))
  for (const query of missing) {
    const data = await api(wiki, { action: 'query', list: 'search', srsearch: query, srlimit: String(SEARCH_RESULTS) })
    cache[query] = (data?.query?.search ?? []).map(({ title }: { title: string }) => title).filter((title: string) => !title.includes('/') && !NOT_THE_ANIME.test(title))
    await writeJson(name, cache)
    await sleep(DELAY_MS)
  }
  return cache
}

// Le titre trouvé par la recherche est bien ce perso : chaque mot de son nom AniList s'y retrouve, à une faute de
// transcription près (« Pyoran » / « Pioran », « Barazaki » / « Baragasaki », « Ayanokouji » / « Ayanokōji »), c et k
// (pas le « ch » : « Chi » n'est pas « Kai »), y et i pareils (« Matt Kuga » / « Matt Cugat », « Mary » / « Marie » sur le wiki de The Witch and the Beast),
// r et l aussi, le japonais ne les distingue pas (« Ro Nny » / « Lo-Ny »), b et v pareil (« Laybelle » / « Rayveil »,
// Uncle from Another World), hu et fu (フ : « Furr » / « Huel », The Witch and the Beast ; pas chu, shu ni zhu). Sans le suffixe de politesse du nom AniList (« Sawae-san » / « Sawae »).
// Écarte les autres persos qui partagent un mot (« Ling Wang Ma », sa mère, n'est pas « Wang Ling »).
const HONORIFICS = new Set(['san', 'chan', 'kun', 'sama', 'dono', 'senpai'])
export function sameName(name: string, title: string): boolean {
  const words = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/ii/g, 'i').replace(/(?<![csz])hu/g, 'fu').replace(/c(?!h)/g, 'k').replace(/y/g, 'i').replace(/l/g, 'r').replace(/v/g, 'b')
    .replace(/['’.]/g, '').split(/[^a-z0-9]+/).filter(Boolean)
  const titleWords = words(title)
  // Le nom collé, dans un ordre ou l'autre, découpé autrement (« Shabei Yi » / « Yisha Bei » à Immortal King)
  const nameWords = words(name).filter((word, index) => index === 0 || !HONORIFICS.has(word))
  if (nameWords.length > 1 && [nameWords, nameWords.toReversed()].some(order => distance(order.join(''), titleWords.join('')) <= 1))
    return true
  const candidates = [...titleWords, titleWords.join('')]
  return nameWords.every(word => candidates.some(candidate => distance(word, candidate) <= (word.length >= 5 ? 2 : word.length >= 3 ? 1 : 0)))
}

// Tous les mots de ces noms dans le titre, tels quels (« Angela-Ann » dans « Angela Ann Huel »)
const plainWords = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().split(/[^a-z0-9'’]+/).filter(Boolean)
const hasWords = (title: string, names: string) => plainWords(names).every(word => plainWords(title).includes(word))
// Un nom japonais sans espaces ni séparateurs (« 坂井 進 », « クロード・ジャンヌ・エルメイア »)
const compact = (text: string) => text.replace(/[\s・=＝·]/g, '')

// Le nom en gras qui ouvre l'intro, sans les liens ('''[[Shuzo Matsutani]]''' → « Shuzo Matsutani »). Seulement en tête
// du 1er paragraphe, après l'infobox et les images : pas « These two were Bols' wife, '''Kije''' » (une page à deux persos)
export function introName(text: string): string | null {
  const intro = text.split('\n').map(line => line.trim()).find(line => line && !/^(\{\{|\||\}\}|\[\[(File|Image):)/i.test(line))
  const bold = intro?.match(/^'''(.+?)'''/)?.[1]
  return bold ? bold.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim() || null : null
}

export const latinName =(name: string) => name.replace(/\s*\([^)]*[^\x00-\x7F][^)]*\)/g, '').trim()

// Distance d'édition, une inversion de deux lettres comptant pour une (« Zhou » / « Zhuo »)
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1)
    }
  }
  return d[a.length]![b.length]!
}

type Pages = Record<string, string | null>

// Le début (section 0) de ces pages, en suivant les redirections, depuis le cache ou par lots de 50
async function fetchPages(wiki: string, titles: string[]): Promise<Pages> {
  const cache = await readJson<Pages>(`pages-${wiki.replace('/', '-')}`, {})
  const missing = [...new Set(titles)].filter(title => !(title in cache))
  for (let i = 0; i < missing.length; i += TITLES_PER_REQUEST) {
    const batch = missing.slice(i, i + TITLES_PER_REQUEST)
    const data = await api(wiki, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', rvsection: '0', redirects: '1', titles: batch.join('|') })
    const renamed = new Map<string, string>([...data?.query?.normalized ?? [], ...data?.query?.redirects ?? []].map(({ from, to }: { from: string, to: string }) => [from, to]))
    const pages = new Map<string, string | null>((data?.query?.pages ?? []).map((page: any) => [page.title, page.revisions?.[0]?.slots?.main?.content ?? null]))
    for (const title of batch) {
      let current = title
      for (let hops = 0; renamed.has(current) && hops < 3; hops++)
        current = renamed.get(current)!
      cache[title] = pages.get(current)?.slice(0, MAX_CACHED_LENGTH) ?? null
    }
    await writeJson(`pages-${wiki.replace('/', '-')}`, cache)
    await sleep(DELAY_MS)
  }
  return cache
}

// La page entière (pour les cheveux décrits dans le texte), depuis le cache ou par lots de 50
const MAX_FULL_LENGTH = 60_000
async function fetchFullPages(wiki: string, titles: string[]): Promise<Pages> {
  const name = `full-${wiki.replace('/', '-')}`
  const cache = await readJson<Pages>(name, {})
  const missing = [...new Set(titles)].filter(title => !(title in cache))
  for (let i = 0; i < missing.length; i += TITLES_PER_REQUEST) {
    const batch = missing.slice(i, i + TITLES_PER_REQUEST)
    const data = await api(wiki, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: batch.join('|') })
    const renamed = new Map<string, string>([...data?.query?.normalized ?? [], ...data?.query?.redirects ?? []].map(({ from, to }: { from: string, to: string }) => [from, to]))
    const pages = new Map<string, string | null>((data?.query?.pages ?? []).map((page: any) => [page.title, page.revisions?.[0]?.slots?.main?.content ?? null]))
    for (const title of batch) {
      let current = title
      for (let hops = 0; renamed.has(current) && hops < 3; hops++)
        current = renamed.get(current)!
      cache[title] = pages.get(current)?.slice(0, MAX_FULL_LENGTH) ?? null
    }
    await writeJson(name, cache)
    await sleep(DELAY_MS)
  }
  return cache
}

// Le texte d'une section (« == Alter Ego: Paprika == »), jusqu'au titre suivant de même niveau ou plus haut. null si
// la section n'existe pas.
export function pageSection(wikitext: string, section: string): string | null {
  const wanted = normalize(section)
  const headings = [...wikitext.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)]
  const index = headings.findIndex(match => normalize(match[2]!) === wanted)
  if (index < 0)
    return null
  const start = headings[index]!
  const level = start[1]!.length
  const end = headings.slice(index + 1).find(match => match[1]!.length <= level)
  return wikitext.slice(start.index! + start[0].length, end?.index ?? wikitext.length).trim()
}

// Les liens d'une page d'homonymie à ne pas suivre : pas le personnage de l'anime (film, jeu, chanson, épisode…)
const NOT_THE_ANIME = /film|movie|novel|book|card|item|weapon|location|game|song|episode|chapter|arc|album|disambiguation/i
const DISAMBIGUATION = /\{\{\s*disambig|may (?:also )?refer to/i

// --- 3. L'infobox ---

// Les champs du 1er modèle de la page qui ressemble à une infobox de personnage : {{Character Infobox, {{Infobox character...,
// mais aussi les noms maison ({{Human| sur le wiki de Death Note}}), reconnus à leurs champs (gender, occupation...)
export function fandomInfobox(wikitext: string): Record<string, string> | null {
  // Sans les <nowiki> : leur « ]] » fermerait le modèle trop tôt (Wang Ling, wiki d'Immortal King)
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '').replace(/<nowiki>[\s\S]*?<\/nowiki>/gi, '')
  for (const match of text.matchAll(/\{\{\s*[^|{}\n]+/g)) {
    const fields = templateFields(text, match.index!)
    if (INFOBOX_FIELDS.some(name => fields[name]))
      return fields
  }
  return null
}
// Le modèle d'infobox que la page appelle (« Template:Lorraine Vivie Infobox »), quand son nom le dit
export function infoboxTemplate(wikitext: string): string | null {
  const name = wikitext.match(/\{\{\s*([^|{}\n#:]*infobox[^|{}\n#:]*)/i)?.[1]?.trim()
  return name ? `Template:${name}` : null
}

// Les champs d'un modèle propre au perso. Pas un modèle générique : une infobox portable (<infobox>) n'a que des
// paramètres, et sa doc (<noinclude>) un exemple (« occupation = Example », wiki de The Elusive Samurai)
export function templateInfobox(wikitext: string): Record<string, string> | null {
  return /<infobox/i.test(wikitext) ? null : fandomInfobox(wikitext.replace(/<noinclude>[\s\S]*?(?:<\/noinclude>|$)/gi, ''))
}

// Pas la taille : les onglets en haut de page ({{Tabs|height = 35px|tab1 = Overview}}) ont aussi un champ « height »
// Ni les champs d'espèce trop courants dans d'autres modèles ({{Quote|type = …}})
const NOT_INFOBOX_ONLY = new Set(['type', 'kind', 'classification'])
const INFOBOX_FIELDS: readonly string[] = Object.entries(FIELDS).flatMap(([key, names]) => key === 'height' ? [] : names.filter(name => !NOT_INFOBOX_ONLY.has(name)))

// Les champs « | clé = valeur » d'un modèle, en ne coupant que sur les « | » de son 1er niveau
export function templateFields(text: string, start: number): Record<string, string> {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (let i = start; i < text.length; i++) {
    const pair = text.slice(i, i + 2)
    if (pair === '{{' || pair === '[[') {
      depth++
      current += pair
      i++
    } else if (pair === '}}' || pair === ']]') {
      depth--
      if (depth === 0) {
        parts.push(current)
        break
      }
      current += pair
      i++
    } else if (text[i] === '|' && depth === 1) {
      parts.push(current)
      current = ''
    } else {
      current += text[i]
    }
  }
  const fields: Record<string, string> = {}
  for (const part of parts.slice(1)) {
    const equal = part.indexOf('=')
    if (equal < 0)
      continue
    const key = part.slice(0, equal).trim().toLowerCase().replace(/_/g, ' ')
    const raw = part.slice(equal + 1)
    const value = cleanValue(UNHIDDEN_FIELDS.has(key) ? unhide(raw) : raw)
    if (value)
      fields[key] = value
  }
  return fields
}

// Le contenu des spoilers repliés ({{Hidden|Webcomic Spoiler|…}}, {{Hide|…}}) est lu pour l'occupation, l'arme, les
// titres et l'espèce : un indice vaut mieux qu'un spoil évité (Sonic : « Legendary Demon Blade »). Seule la mort n'est
// jamais dite : le statut reste sans ses spoilers, comme l'affiliation (Satoru chez les Neo Heroes).
const UNHIDDEN_FIELDS = new Set([...FIELDS.occupation, ...FIELDS.weapon, ...FIELDS.titles, ...FIELDS.species].map(name => name.replace(/_/g, ' ')))
const HIDDEN = /\{\{\s*(?:hidden|hide)\s*\|/gi

// {{Hidden|titre|contenu}} → contenu, {{Hide|contenu}} → contenu
export function unhide(text: string): string {
  let result = ''
  let last = 0
  for (const match of text.matchAll(HIDDEN)) {
    if (match.index! < last)
      continue
    // Les arguments du modèle, coupés sur les « | » de son 1er niveau, jusqu'à son « }} »
    const args = ['']
    let depth = 1
    let i = match.index! + match[0].length
    for (; i < text.length && depth > 0; i++) {
      const pair = text.slice(i, i + 2)
      if (pair === '{{' || pair === '[[') {
        depth++
        args[args.length - 1] += pair
        i++
      } else if (pair === '}}' || pair === ']]') {
        depth--
        if (depth > 0)
          args[args.length - 1] += pair
        i++
      } else if (text[i] === '|' && depth === 1) {
        args.push('')
      } else {
        args[args.length - 1] += text[i]
      }
    }
    result += text.slice(last, match.index) + args[args.length - 1]
    last = i
  }
  return result + text.slice(last)
}

const field = (fields: Record<string, string>, names: readonly string[]) =>
  names.map(name => fields[name.replace(/_/g, ' ')]).find(value => value !== undefined) ?? null

// Le champ et ses suites numérotées (« Job », « Job 2 » sur le wiki de The World God Only Knows)
function numberedField(fields: Record<string, string>, names: readonly string[]): string | null {
  const name = names.map(name => name.replace(/_/g, ' ')).find(name => fields[name] !== undefined)
  if (name === undefined)
    return null
  const values = [fields[name]!, ...Array.from({ length: 9 }, (_, index) => fields[`${name} ${index + 2}`]).filter(value => value !== undefined)]
  return values.filter(value => value.trim()).join(', ') || fields[name]!
}

// L'occupation de l'infobox n'est que le grade (« Military Rank ») : l'intro s'ajoute quand même, elle dit le rôle
// (Wilibald Koenig, Youjo Senki : « 3rd Company commander » → Leader en plus d'Officer)
const RANK_FIELD = 'military rank'
export const rankOnly = (fields: Record<string, string>) =>
  fields[RANK_FIELD] !== undefined && FIELDS.occupation.every(name => name === RANK_FIELD || fields[name.replace(/_/g, ' ')] === undefined)

// « Unknown » ne remplit rien : c'est la marque de fandomUnknowns, une autre source peut encore donner la valeur
const known = (value: string | null) => isUnknownValue(value) ? null : value
const rawList = (value: string | null) => value ? [value] : null

// Le grade du champ « rank » (wiki de FMA : « Master Sergeant », « Lieutenant Colonel ») : seulement un vrai grade
// militaire, « rank » est un classement ailleurs (« S-Class Rank 1 », One Punch Man). Le dernier mot de grade, le vrai
// (« Lieutenant Colonel » → Colonel, « Master Sergeant » → Sergeant, pas Master → Leader)
const MILITARY_RANK = /\b(?:private|corporal|sergeant|lieutenant|captain|major|colonel|general|admiral|commodore|ensign)\b/gi
export function militaryRanks(value: string | null): string[] | null {
  const ranks = (value ?? '').split(/\s*,\s*/).flatMap(part => part.replace(/\([^)]*\)/g, '').match(MILITARY_RANK)?.slice(-1) ?? [])
  return ranks.length > 0 ? [...new Set(ranks.map(rank => rank[0]!.toUpperCase() + rank.slice(1).toLowerCase()))] : null
}

// La version de l'anime quand l'infobox en donne plusieurs (« Purple fading to pink (light novel), Reddish Pink (anime) »,
// Stephanie Dola) : on joue sur l'anime. Les autres versions (roman, manga, jeu) partent, le reste ne bouge pas.
const OTHER_MEDIA = /\((?:light novel|ln|novels?|web novel|manga|games?|visual novel)\)/i
export function animeVersion(value: string | null): string | null {
  if (!value || !/\(anime\)/i.test(value))
    return value
  return value.split(/(?<=\))\s*,\s*/).filter(part => !OTHER_MEDIA.test(part)).join(', ')
}

export function fandomValues(fields: Record<string, string>): Record<Key, AttributeValue> {
  return {
    gender: wikiGender(field(fields, FIELDS.gender)),
    occupation: mergedLists(splitOccupations(known(numberedField(fields, FIELDS.occupation)) ?? ''), militaryRanks(fields.rank ?? null)),
    hair: wikiHair(animeVersion(field(fields, FIELDS.hair))),
    age: infoboxAge(field(fields, FIELDS.age)),
    species: mergedLists(rawList(known(field(fields, FIELDS.species))), statusSpecies(field(fields, FIELDS.deceased))),
    height: heightCm(field(fields, FIELDS.height)),
    weapon: weaponList(field(fields, FIELDS.weapon)),
    titles: mergedLists(titleOccupations(field(fields, FIELDS.titles)), nobleTitles(fields.title ?? null)),
    deceased: isDeceased(field(fields, FIELDS.deceased)) ? DECEASED : null,
    relatives: bloodRelatives(field(fields, FIELDS.relatives)),
  }
}

// Le sexe d'après les pronoms de la page, comme pour la description AniList. Pas quand « they » l'emporte sur « he » et
// « she » réunis : un perso non binaire (Hange, Attack on Titan), pas à deviner.
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length
export function pageGender(text: string): string | null {
  const they = count(text, /\b(?:they|them|their|theirs|themselves|themself)\b/gi)
  const gendered = count(text, /\b(?:he|him|his|himself|she|her|hers|herself)\b/gi)
  return they > gendered ? null : pronounGender(null, text)
}

// La famille de sang du champ, déjà nettoyé (« Blaise Lamprogue (father), Grey Lamprogue (younger brother) »). Pas les
// conjoints, ni les liens adoptifs, par alliance ou les demi-frères : leur espèce peut être une autre (Seika,
// « Adoptive younger brother » de Luft). Un nom qui n'est pas un perso du quiz (« Unknown Priestess ») ne trouvera personne.
const BLOOD_RELATIVE = /\b(?:brothers?|sisters?|siblings?|twins?|father|mother|parents?|sons?|daughters?|child(?:ren)?|grand\w*|uncle|aunt|cousins?|nephew|niece)\b/i
// Ni le parrain ou le filleul (« Santana (his attempted god-child) », Stroheim)
const NOT_BLOOD = /adopt|step|foster|in[- ]law|half|surrogate|sworn|god/i
export function bloodRelatives(value: string | null): string[] | null {
  const names = (value ?? '').split(/\s*(?:,|;|\n)\s*/)
    .map(part => part.match(/^(.+?)\s*\(([^)]*)\)/))
    .filter((match): match is RegExpMatchArray => match !== null && BLOOD_RELATIVE.test(match[2]!) && !NOT_BLOOD.test(match[2]!))
    .map(match => match[1]!.trim())
  return names.length > 0 ? [...new Set(names)] : null
}

// Les indices que l'infobox dit inconnus en toutes lettres (« |age = Unknown ») : « Inconnu » à la fin, si aucune
// autre source n'a mieux (unknownValues.ts)
const UNKNOWN_FIELDS = ['gender', 'occupation', 'hair', 'age', 'species', 'height'] as const
export const fandomUnknowns = (fields: Record<string, string>) =>
  unknownKeys(Object.fromEntries(UNKNOWN_FIELDS.map(key => [key, field(fields, FIELDS[key])])))

// Mort sans ambiguïté : « Deceased », « Killed in action », mais pas « Alive (resurrected) », « Active, Deceased »
// ni « Deceased (vampire), Unknown (demon) » (selon la version ou la saison)
export const DECEASED = 'deceased'
const isDeceased = (status: string | null) =>
  Boolean(status && /\b(?:deceased|dead|killed|died)\b/i.test(status) && !/\b(?:alive|living|active|resurrect\w*|reincarnated|revived|unknown)\b/i.test(status))

// L'affiliation, quand l'infobox n'a pas d'occupation (« Student (formerly) » sur le wiki de Gleipnir) : seulement un
// rôle simple qu'on sait traduire. Pas les organisations (« Demon Slayer Corps » pour Nezuko, un démon), les
// possessifs (« Souichirou Kuzuki's Servant ») ni les noms propres (« Prince Bojji » pour Gigan, son serviteur).
const AFFILIATION_FIELDS = ['affiliation', 'affiliations', 'current affiliation']
const NOT_A_ROLE = /'s\b|’s\b|\b(?:corps|army|military|force|forces|federation|kingdom|empire|family|group|shop|association|guild|academy|school|order|organization|agency|club|society|team|party|clan|house|church|government|council|division|squad|unit|company|tribe|faction|alliance|union|league)\b/i
const PROPER_NAME = /^\S+\s+[A-Z]/
export function affiliationOccupations(value: string | null): string[] | null {
  const roles = (value ?? '').split(/\s*(?:,|;|\n|<br\s*\/?>)\s*/).map(item => item.replace(/\s*\([^)]*\)/g, '').trim())
    .filter(item => item && !NOT_A_ROLE.test(item) && !PROPER_NAME.test(item))
  return titleOccupations(roles.join(', ') || null)
}

// L'école de l'infobox, même avec une occupation (Ryota Suzui : « school = Hyakkaou Private Academy ») : élève.
// Pas une ancienne école (« (formerly) », « graduated »). Ni « class » (« 1-D », mais aussi « Warrior », « S-Class »), ni
// « grade » (« A+ », « Grade 1 »), ni « year » : trop d'autres sens.
const SCHOOL_FIELDS = ['school', 'schools', 'école']
// Ceux qui travaillent à l'école : son champ ne fait pas d'eux des élèves
const SCHOOL_STAFF = new Set(['Teacher', 'Principal', 'Instructor', 'Doctor', 'Servant', 'Guardian', 'Employee'])
const SCHOOL_NAME = /school|academy|universit|college|institut|gakuen|gakuin|lyc[ée]e/i
const FORMER_SCHOOL =/\b(?:former(?:ly)?|graduated?|alumn\w*|dropped out|expelled)\b/i
export function schoolOccupations(value: string | null): string[] | null {
  // Chaque école à part : « Far East Devil High School (Graduate), Maijima Private High School » (Elucia) va encore à la 2e
  // (seulement ce qui ressemble à une école : pas « Criminal » dans « Umesato Junior High School (expelled), Criminal », Araya)
  const parts = (value ?? '').split(/\s*(?:,|;|\n|<br\s*\/?>)\s*/i).filter(part => part.trim())
  const schools = parts.filter(part => SCHOOL_NAME.test(part))
  const current = (schools.length > 0 ? schools : parts).some(school => !FORMER_SCHOOL.test(school))
  return current ? titleOccupations('Student') : null
}

// Les titres traduits en occupations. Un titre qu'on ne sait pas traduire (« Symbol of Evil ») est laissé de côté,
// pas gardé en anglais : ce sont des surnoms, pas des métiers à corriger.
function titleOccupations(value: string | null): string[] | null {
  const found = (splitOccupations(value ?? '') ?? []).map(title => translateOccupation(title.replace(/[«»"]/g, '').trim())).filter((name): name is string => Boolean(name))
  return found.length > 0 ? [...new Set(found)] : null
}

// Le champ « title » tout court : ailleurs souvent un rôle ou un surnom (Leader à des élèves de Code Geass), donc
// seulement les titres de noblesse (« Princess », Elga dans Uncle from Another World)
const NOBLE_TITLES = new Set(['King', 'Queen', 'Prince', 'Princess', 'Emperor', 'Empress', 'Monarch', 'Count', 'Noble', 'Royalty'])
export function nobleTitles(value: string | null): string[] | null {
  const found = (titleOccupations(value) ?? []).filter(title => NOBLE_TITLES.has(title))
  return found.length > 0 ? found : null
}

// L'espèce que dit le statut, le mot du wiki : un esprit (« Spirit », les Shrine Spirits de Mieruko-chan), un fantôme
// (« Deceased (appears as ghost) ») ou un mort-vivant (« Alive (Undead) », Sunako dans Shiki). Pas un spoil : on le
// voit comme ça à l'écran.
export function statusSpecies(value: string | null): string[] | null {
  if (!value)
    return null
  if (/\bundead\b/i.test(value))
    return ['Undead']
  if (/^\s*spirit\s*$/i.test(value))
    return ['Spirit']
  return /\bghost\b/i.test(value) ? ['Ghost'] : null
}

const mergedLists = (a: string[] | null, b: string[] | null) => a || b ? [...new Set([...a ?? [], ...b ?? []])] : null

// --- L'introduction ---

const MAX_INTRO_OCCUPATIONS = 2

// Sans occupation dans l'infobox : ce que dit l'introduction de la page (« Tatsumi is a young swordsman » → Épéiste),
// comme au Pixeldle. Chaque rôle est traduit tout de suite, en retirant les adjectifs de tête s'il le faut (« young
// swordsman » → « swordsman ») : un rôle intraduisible est laissé de côté, pas gardé en anglais. Moins sûr que
// l'infobox, donc listé dans le récap pour relecture. Certains wikis rangent l'intro dans l'infobox (« |intro= » sur
// celui de Classroom of the Elite) : retirée avec elle par introText, on la prend dans le champ.
export function introOccupations(wikitext: string): { roles: string[], occupation: string[] } {
  return roleOccupations(introRoles(fandomInfobox(wikitext)?.intro ?? introText(wikitext)))
}

// Rien dans l'intro (« X is a side character ») : le début des sections qui racontent le perso, avec les mêmes règles
// (« == History == Muderev is the mightest warrior of the ogre race », The Reincarnation of the Strongest Exorcist).
// La 1re section qui donne un métier, dans cet ordre. Lu sur la page entière, déjà téléchargée pour les cheveux.
const STORY_SECTIONS = ['Background', 'History', 'Biography', 'Overview', 'Personality']
// Plus loin que l'intro, seulement les phrases dont le perso est le sujet (son nom, ou il / elle) et le rôle un nom avec
// son article (« Muderev is the mightest warrior ») : pas « Fremy was born when the commander… », ni un adjectif
// (« He is well respected among staff and students »). Le rôle s'arrête au « of » ou au possessif (« the ultimate fate of
// all Magical girls », « Kenjirou's students »), et pas de rôle qui commence par « her », « other »… (« her idol group »).
// Inconnu et Aucune n'en sortent pas : rien ne le dit du perso.
const SUBJECT_FIRST = /^\p{Lu}[\p{L}'’.-]*(?:\s+(?:\p{Lu}[\p{L}'’.-]*|von|van|de|du|no|of|the))*\s+(?:is|was|serves as|served as|works as|worked as)\s+(?:(?:also|currently|now|still)\s+)?(?:a|an|the|one of the)\s/u
const NOT_A_HEAD = /^(?:her|his|their|its|my|our|other|all|some|many|most|each|every)\b/i
const headRole = (role: string) => role.split(/\s+of\s+|['’]s\b/)[0]!.trim()
export function sectionOccupations(wikitext: string): { roles: string[], occupation: string[] } {
  for (const name of STORY_SECTIONS) {
    const section = pageSection(wikitext, name)
    if (!section)
      continue
    // Sans les titres des sous-sections (« === Early life === »), sinon introText s'arrêterait au 1er
    const sentences = introText(section.replace(/^={2,6}.*={2,6}\s*$/gm, '')).split(/(?<=[.!?])\s+/).filter(sentence => SUBJECT_FIRST.test(sentence))
    const found = roleOccupations(introRoles(sentences.join(' ')).map(headRole).filter(role => role && !NOT_A_HEAD.test(role)))
    const occupation = found.occupation.filter(value => !NO_REAL_OCCUPATION.has(value))
    if (occupation.length > 0)
      return { roles: found.roles, occupation }
  }
  return { roles: [], occupation: [] }
}
const NO_REAL_OCCUPATION = new Set(['Unknown', 'None'])

// Les rôles traduits, en retirant les adjectifs de tête s'il le faut (« young swordsman » → « swordsman »)
function roleOccupations(roles: string[]): { roles: string[], occupation: string[] } {
  const occupation = roles.flatMap(role => {
    const words = role.split(/\s+/)
    for (let start = 0; start < words.length; start++) {
      // « a proper young lady » : une dame, pas « Lady », le titre de noblesse
      if (start > 0 && /^lady$/i.test(words.slice(start).join(' ')))
        break
      const french = translateOccupation(words.slice(start).join(' '))
      if (french !== undefined)
        return french ? [french] : []
    }
    return []
  })
  return { roles, occupation: [...new Set(occupation)].slice(0, MAX_INTRO_OCCUPATIONS) }
}

// Les espèces dites par l'introduction, quand l'infobox n'en a pas : « Aqua is a goddess who… » → goddess, « a young
// elf girl » → elf. Le dernier mot du rôle (sans « girl », « man »…), puis les deux derniers, et seulement un nom
// d'espèce exact : « a Demon Slayer » n'est pas un démon. Mots-clés pris partout dans l'intro : 32 % de justes
// seulement (« Seraph of the End », « Shadow Garden »…), contre 3 phrases en « is a … » : 77 %.
// Ce qu'il devient compte aussi (« she later became a vampire »), et toutes les phrases : Guideau est « a young
// "human" » dont « true form is that of a Beast ». Un indice vaut mieux qu'un spoil évité. Pas ce qu'il fait semblant
// d'être (« disguised as a human »). Rendu en anglais, traduit à la fin comme les autres (translateSpeciesEntries).
const SPECIES_SENTENCES = 3
// Ni une image (Pip Bernadotte « was a dog of war »)
const NOT_THE_START = /\b(?:disguised|disguises|posing|poses|pretends?|pretending|believed|thought to be|claims?|mistaken|dogs? of war|lone wolf|black sheep|guinea pig|social butterfly|night owl)\b/i
const GENERIC_NOUN = /\s+(?:girl|boy|man|men|woman|women|child|children|kid|teen|teenager|lady|maiden|youth|being|creature|person|individual|female|male|princess|prince|king|queen|lord|knight|warrior|hybrid)$/i
const SPECIES_ROLE = /\b(?:is|was|became|becomes|turned into|turns into)\s+(?:(?:a|an|the|one of the|also|that of)\s+)+([^.;:()"]+)/i
const END_OF_SPECIES = /\s(?:who|that|which|whose|in|from|for|with|at|on|to|by|of|and|but|named|known|living|born)\b.*$/i
// Une espèce de Fate seulement : ailleurs un domestique (les servantes du Domaine des Papillons de Demon Slayer)
const NOT_SPECIES_IN_INTRO = new Set(['servant'])
// Les wikis qui ont un modèle d'infobox par peuple, sans champ espèce : le nom du modèle la donne (en anglais, traduite
// ensuite comme les autres). The World God Only Knows : {{Hell character}} pour les démons de l'Enfer (Elucia, Dokurou).
const TEMPLATE_SPECIES: [RegExp, string][] = [
  [/\{\{\s*Hell[ _]character\s*[|\n}]/i, 'Demon'],
]
export function templateSpecies(wikitext: string): string[] {
  return TEMPLATE_SPECIES.filter(([pattern]) => pattern.test(wikitext)).map(([, species]) => species)
}

export function introSpecies(wikitext: string): string[] {
  const intro = (fandomInfobox(wikitext)?.intro ?? introText(wikitext)).replace(/["“”]/g, '')
  // « ., » : la fin d'un paragraphe, recollé au suivant par cleanValue
  const found = intro.split(/(?<=[.!?]),?\s+/).slice(0, SPECIES_SENTENCES).map(sentence => {
    if (NOT_THE_START.test(sentence))
      return null
    const role = SPECIES_ROLE.exec(sentence)?.[1]?.replace(END_OF_SPECIES, '').trim()
    // Des adjectifs séparés par une virgule (« a malevolent, cursed blade ») : le 1er morceau qui donne une espèce
    return role?.split(/\s*,\s*/).map(speciesHead).find(Boolean) ?? null
  })
  return [...new Set(found.filter((head): head is string => head !== null))]
}

// L'espèce d'un morceau de rôle : son dernier mot (sans « girl », « man »…), puis ses deux derniers
function speciesHead(part: string): string | null {
  let role = part
  for (let previous = ''; previous !== role;) {
    previous = role
    role = role.replace(GENERIC_NOUN, '')
  }
  const words = role.split(/\s+/)
  return [1, 2].map(length => words.length >= length ? words.slice(-length).join(' ') : '')
    .find(head => head && !NOT_SPECIES_IN_INTRO.has(head.toLowerCase()) && exactSpecies(head)) ?? null
}

// --- Complément ---

const isEmpty = (value: AttributeValue | undefined) => value === null || value === undefined

// L'infobox de perso d'une page déjà téléchargée, avec celle de son modèle s'il en a un (déjà téléchargé aussi)
function pageInfobox(pages: Pages, title: string): Record<string, string> | null {
  const template = pages[title] && infoboxTemplate(pages[title]!)
  // Ceux de la page par-dessus ceux du modèle ({{Lorraine Vivie Infobox|status=Alive}}), sans les paramètres ({{{gender|}}})
  const fields = { ...template && pages[template] ? templateInfobox(pages[template]!) : null, ...fandomInfobox(pages[title]!) }
  const read = Object.entries(fields).filter(([, value]) => !value.includes('{{{'))
  return read.length > 0 && INFOBOX_FIELDS.some(name => fields[name] && !fields[name].includes('{{{')) ? Object.fromEntries(read) : null
}

// Le wiki du lien Wikidata, s'il est lisible : en anglais ou en français, comme Wikipédia (« fr.ccsakura » → « ccsakura/fr »,
// la forme qu'attend l'API). null pour une autre langue (« ru.fma », « zh.kimetsu-no-yaiba », « es.doblaje »).
export function readableWiki(wiki: string): string | null {
  const [, language, name] = wiki.match(/^([a-z]{2}(?:-[a-z]+)?)\.(.+)$/) ?? []
  if (language)
    return language === 'fr' ? `${name}/fr` : null
  const suffix = wiki.split('/')[1]
  return !suffix || suffix === 'fr' ? wiki : null
}

// Remplit les champs vides avec Fandom. Renvoie les entrées complétées, le détail, et les animes sans wiki.
export async function completeFromFandom(targets: WikiTarget[]): Promise<{ entries: Entry[], filled: string[], noWiki: string[] }> {
  await mkdir(cacheDir, { recursive: true })
  const wikis = await readJson<Record<string, string | null>>('wikis', {})
  const articles = await wikidataArticles()

  // Les personnages de chaque wiki, avec les titres à essayer
  const byWiki = new Map<string, { target: WikiTarget, titles: string[] }[]>()
  const noWiki = new Set<string>()
  const shared = sharedAliases(targets.map(({ entry }) => entry))
  // Le lien Wikidata vers un autre wiki que celui de l'anime (lgbtqia-characters pour Nanachi, villains, isekai…) : un
  // repli, lu après le wiki de l'anime
  const fallbacks: { target: WikiTarget, wiki: string, title: string }[] = []
  // Tous les persos : même complets, Fandom ajoute à leurs listes (addedValues)
  for (const target of targets) {
    const anime = String(target.entry.attributes.anime ?? '')
    const [articleWiki, ...articleTitle] = articles[target.entry.id]?.split(':') ?? []
    // Le wiki de l'anime d'abord ; le lien Wikidata ne donne la page que s'il pointe sur ce wiki
    const wiki = await findWiki(anime, target.animeTitles, wikis)
    const fallback = articleWiki && articleWiki !== wiki ? readableWiki(articleWiki) : null
    if (fallback && fallback !== wiki)
      fallbacks.push({ target, wiki: fallback, title: articleTitle.join(':') })
    if (!wiki) {
      noWiki.add(anime)
      continue
    }
    // La page imposée à la main (« fandom » des corrections) : seulement elle, ni homonymie ni recherche
    const article = articleWiki === wiki ? articleTitle.join(':') : undefined
    const titles = target.fandomPage ? [target.fandomPage] : characterTitles(target, article, shared)
    byWiki.set(wiki, [...byWiki.get(wiki) ?? [], { target, titles }])
  }
  // Les titres de page à demander à l'API : pas ceux avec une section, lus dans la page entière
  const plain = (titles: string[]) => titles.filter(title => !title.includes('#'))

  const filled: string[] = []
  const completed = new Map<Entry, Entry>()
  let done = 0
  for (const [wiki, characters] of byWiki) {
    process.stdout.write(`\rFandom : ${++done}/${byWiki.size} wikis (${wiki})`.padEnd(70))
    const firstPages = await fetchPages(wiki, plain(characters.flatMap(({ titles }) => titles)))
    // Pas d'infobox, mais une page d'homonymie (« Rem ») : ses liens « Rem (…) », ceux qui citent l'anime d'abord
    for (const character of characters) {
      if (character.target.fandomPage || character.titles.some(title => firstPages[title] && fandomInfobox(firstPages[title]!)))
        continue
      const prefer = (qualifier: string) => character.target.animeTitles.some(title => title && normalize(qualifier).includes(normalize(title)))
      character.titles = [...character.titles, ...character.titles.flatMap(title => firstPages[title] ? disambiguationLinks(firstPages[title]!, title, prefer, NOT_THE_ANIME) : [])]
    }
    let pages = await fetchPages(wiki, plain(characters.flatMap(({ titles }) => titles)))
    // Une section imposée à la main (« Chiba Atsuko#Alter Ego: Paprika ») : son texte, tiré de la page entière
    const sectioned = [...new Set(characters.flatMap(({ titles }) => titles.filter(title => title.includes('#'))))]
    if (sectioned.length > 0) {
      const wholePages = await fetchFullPages(wiki, sectioned.map(title => title.split('#')[0]!))
      pages = { ...pages, ...Object.fromEntries(sectioned.map(title => {
        const [page, section] = title.split('#') as [string, string]
        return [title, wholePages[page] ? pageSection(wholePages[page]!, section) : null]
      })) }
    }
    // Aucune page à son nom : les résultats de la recherche du wiki
    const lost = characters.filter(({ target, titles }) => !target.fandomPage && !titles.some(title => pages[title]))
    const results = lost.length > 0 ? await searchTitles(wiki, lost.map(({ target }) => target.entry.name)) : {}
    // Le 1er résultat seulement (plus bas, c'est souvent un autre perso qui le cite), et s'il porte bien son nom : en
    // titre, ou en gras au début de la page (« Shu » commence par '''Shuzo Matsutani''', Now and Then, Here and There)
    const firstResults = lost.flatMap(({ target }) => (results[target.entry.name] ?? []).slice(0, 1))
    if (firstResults.length > 0)
      pages = { ...pages, ...await fetchPages(wiki, firstResults) }
    const named = (name: string, title: string) => {
      const bold = pages[title] ? introName(pages[title]!) : null
      return sameName(name, title) || (bold !== null && sameName(name, bold))
    }
    const searched = new Map(lost.map(({ target }) => [target, (results[target.entry.name] ?? []).slice(0, 1).filter(title => named(target.entry.name, title))]))
    // Et ses autres noms AniList (« Kansatsu-sha » → « The Beholder », « Upa » → « Oopa ») : des surnoms qu'on ne garde
    // pas en alias (le salon les prendrait pour des propositions). Retenus seulement si la page a une infobox de perso.
    // Sans le japonais entre parenthèses (« Tsundere Elf (ツンデレエルフ) » → « Tsundere Elf », Elga dans Uncle from Another World)
    const others = new Map(lost.map(({ target }) => [target, target.name.alternative.map(latinName).filter(alt => /[a-z]/i.test(alt) && !/[#<>[\]{}|]/.test(alt))]))
    // Rien à son nom complet : la recherche du prénom seul (« Angela-Ann Furr » → « Angela Ann Huel », le wiki n'a pas
    // « Furr » ; « Douman Ashida » → « Douman Ashiya »). Le prénom tel quel dans le titre, le reste à une faute près
    // (sameName), et une infobox de perso exigée comme pour les autres noms : pas « Shin Sekai Year Zero » pour Shin
    // Sakai, ni « Wang Zhen » pour Zheng Liang.
    const givenNames = new Map(lost.flatMap(({ target }) => {
      const given = target.entry.name.split(/\s+/)[0]!
      return searched.get(target)!.length === 0 && given !== target.entry.name ? [[target, given] as const] : []
    }))
    const givenResults = givenNames.size > 0 ? await searchTitles(wiki, [...givenNames.values()]) : {}
    for (const [target, given] of givenNames)
      others.get(target)!.push(...(givenResults[given] ?? []).filter(title => hasWords(title, given) && sameName(target.entry.name, title)))
    // Toujours rien : la recherche du nom japonais (悪鬼 → « Messiah », 藤堂鏡志朗 → « Kyoshiro Tohdoh »). Le 1er résultat
    // qui l'écrit dans son début (infobox, intro) : ailleurs dans la page, c'est souvent un autre perso qui le cite
    // (« Chaos Creator » pour Rimuru) ou un épisode. Après ses autres noms, infobox exigée comme eux : la page de ses
    // fans écrit aussi 超合金クロビカリ, mais « Superalloy Darkshine » passe avant.
    const natives = new Map(lost.flatMap(({ target }) => {
      const native = target.name.native?.trim()
      return native && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(native) && searched.get(target)!.length === 0
        ? [[target, native] as const] : []
    }))
    const nativeResults = natives.size > 0 ? await searchTitles(wiki, [...natives.values()]) : {}
    if (lost.length > 0)
      pages = { ...pages, ...await fetchPages(wiki, [...searched.values(), ...others.values(), ...Object.values(nativeResults)].flat()) }
    for (const [target, native] of natives) {
      const title = (nativeResults[native] ?? []).find(title => pages[title] && compact(pages[title]!).includes(compact(native)))
      if (title)
        others.get(target)!.push(title)
    }
    // Une infobox propre au perso ({{Lorraine Vivie Infobox}}, wiki de The Unwanted Undead Adventurer) : ses champs
    // sont dans la page du modèle
    const templates = Object.values(pages).flatMap(text => text && infoboxTemplate(text) ? [infoboxTemplate(text)!] : [])
    if (templates.length > 0)
      pages = { ...pages, ...await fetchPages(wiki, templates) }
    const infoboxOf = (title: string) => pageInfobox(pages, title)
    // La page de chaque personnage : la 1re qui a une infobox, sinon la 1re page à son nom qui n'est pas une page
    // d'homonymie (infobox dans un modèle maison, {{Saten Ruiko}} sur le wiki de Railgun) : son texte sert encore
    // pour l'occupation de l'intro et les cheveux. Un résultat de recherche aussi, sans infobox : il porte déjà son nom
    // (sameName), et certains wikis n'en ont aucune (LaLa-Ru, wiki de Now and Then, Here and There).
    const found = characters.flatMap(({ target, titles }) => {
      const candidates = [...titles, ...searched.get(target) ?? []]
      const title = [...candidates, ...others.get(target) ?? []].find(title => pages[title] && infoboxOf(title))
      if (title)
        return [{ target, title, values: fandomValues(infoboxOf(title)!), unknowns: fandomUnknowns(infoboxOf(title)!) }]
      const bare = candidates.find(title => pages[title] && !DISAMBIGUATION.test(pages[title]!))
      return bare ? [{ target, title: bare, values: fandomValues({}), unknowns: [] }] : []
    })
    // Les replis de Fandom ne dépendent que de son infobox, pas des autres sources : leurs valeurs s'ajoutent (addedValues)
    // Les cheveux que l'infobox ne donne pas : cherchés dans le texte de la page entière (section Appearance d'abord).
    // Et l'occupation, sans infobox ni intro qui en parle : le début des sections du perso (sectionOccupations).
    const intros = new Map(found.map(({ target, title, values }) => [target, isEmpty(values.occupation) || rankOnly(infoboxOf(title) ?? {}) ? introOccupations(pages[title]!) : null]))
    const hairless = found.filter(({ values }) => isEmpty(values.hair))
    const silent = found.filter(({ target, title }) => intros.get(target)?.occupation.length === 0 && !title.includes('#'))
    // Et le sexe, que ni AniList ni l'infobox ne donnent : les pronoms de la page (Hamdo, Abelia, les persos de BNA)
    // Pas si l'infobox le dit inconnu en toutes lettres (Mirai no Akuma) : la page ne se contredit pas
    const genderless = found.filter(({ target, values, unknowns }) => isEmpty(values.gender) && isEmpty(target.entry.attributes.gender) && !unknowns.includes('gender'))
    const wanted = [...hairless, ...silent, ...genderless]
    const full = wanted.length > 0 ? await fetchFullPages(wiki, plain(wanted.map(({ title }) => title))) : {}
    const textHairs = new Map(hairless.flatMap(({ target, title }) => {
      // Une section imposée : son texte seulement, pas toute la page (Paprika n'a pas les cheveux d'Atsuko)
      const text = title.includes('#') ? pages[title] : full[title]
      const hair = text ? textHair(text) : null
      return hair ? [[target, hair] as const] : []
    }))
    for (const { target, title, values, unknowns } of found) {
      const own: Record<string, AttributeValue> = { ...values }
      const hair = textHairs.get(target)
      if (hair)
        own.hair = hair.colors
      // Au moins deux fois plus de « he » que de « she » sur la page (ou l'inverse), comme pour la description AniList
      const pageText = genderless.some(item => item.target === target) ? full[title] ?? pages[title] : null
      const textGender = pageText ? pageGender(plainText(pageText)) : null
      if (textGender)
        own.gender = textGender
      // Sans occupation dans l'infobox : le rôle de l'affiliation (« Student (formerly) ») et ce que dit l'introduction,
      // les deux ensemble (Shuichi Kagaya : élève et tueur). Et élève s'il a une école, même avec un métier (Kanon, The
      // World God Only Knows : idole et lycéenne), sauf s'il y travaille (professeur, directeur…)
      const jobless = isEmpty(values.occupation)
      const infobox = infoboxOf(title) ?? {}
      const affiliation = jobless ? affiliationOccupations(field(infobox, AFFILIATION_FIELDS)) : null
      const intro = intros.get(target) ?? null
      const story = intro?.occupation.length === 0 && full[title] ? sectionOccupations(full[title]!) : null
      const jobs = (Array.isArray(values.occupation) ? values.occupation : []).map(String)
      const staff = jobs.some(job => SCHOOL_STAFF.has(translateOccupation(job) ?? ''))
      const school = staff ? null : schoolOccupations(field(infobox, SCHOOL_FIELDS))
      const occupation = [...new Set([...jobs, ...affiliation ?? [], ...intro?.occupation ?? [], ...story?.occupation ?? [], ...school ?? []])]
      if (occupation.length > jobs.length)
        own.occupation = occupation
      // Sans espèce dans l'infobox : celle que dit son modèle ({{Hell character}}), sinon l'introduction (« Aqua is a goddess »)
      const template = templateSpecies(pages[title]!)
      const species = !isEmpty(values.species) ? [] : template.length > 0 ? template : introSpecies(pages[title]!)
      if (species.length > 0)
        own.species = species
      const added = addedValues(target.entry.attributes, own)
      const unknown = addUnknowns(target.entry.attributes, unknowns)
      if (unknown)
        added[UNKNOWN_KEYS] = unknown
      if (Object.keys(added).length === 0)
        continue
      completed.set(target.entry, { ...target.entry, attributes: { ...target.entry.attributes, ...added } })
      const page = target.name.full === title ? '' : `, page « ${title} »`
      filled.push(`${target.entry.name} (${wiki}${page}) : ${Object.entries(added).map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ')}${hair ? ` (cheveux du texte : « ${hair.excerpt} »)` : ''}${textGender ? ' (sexe des pronoms de la page)' : ''}${affiliation ? ' (occupation de l\'affiliation)' : ''}${school ? ' (élève : école de l\'infobox)' : ''}${species.length > 0 ? ' (espèce de l\'intro)' : ''}${intro?.occupation.length ? ` (occupation de l'intro : « ${intro.roles.join(' | ')} »)` : ''}${story?.occupation.length ? ` (occupation d'une section : « ${story.roles.join(' | ')} »)` : ''}`)
    }
  }

  // Le repli, comme Wikipédia : l'infobox seulement (ni intro, ni recherche), qui remplit ce qui est resté vide et
  // s'ajoute aux listes (addedValues). Plus les cheveux du texte s'il n'en a toujours pas : la page vient de Wikidata,
  // c'est bien la sienne (Fai sur le wiki de xxxHOLiC, Chii sur celui du cosplay)
  const fallbackWikis = [...new Set(fallbacks.map(({ wiki }) => wiki))]
  for (const wiki of fallbackWikis) {
    process.stdout.write(`\rFandom (repli) : ${fallbackWikis.indexOf(wiki) + 1}/${fallbackWikis.length} wikis (${wiki})`.padEnd(70))
    // Le titre de Wikidata, puis son nom complet si la page a été renommée (« Fai_D._Flowright » → « Fai D. Flourite » sur
    // xxxHOLiC). Pas ses alias : sur un wiki générique, « Rem » ou « Chii » peut être n'importe qui
    const candidates = fallbacks.filter(fallback => fallback.wiki === wiki)
      .map(fallback => ({ ...fallback, titles: [...new Set([fallback.title.replace(/_/g, ' '), ...pageTitles(fallback.target.name)])] }))
    let pages = await fetchPages(wiki, plain(candidates.flatMap(({ titles }) => titles)))
    const characters = candidates.flatMap(({ target, titles }) => {
      const title = titles.find(title => pages[title] && !DISAMBIGUATION.test(pages[title]!))
      return title ? [{ target, title }] : []
    })
    const templates = characters.flatMap(({ title }) => pages[title] && infoboxTemplate(pages[title]!) ? [infoboxTemplate(pages[title]!)!] : [])
    if (templates.length > 0)
      pages = { ...pages, ...await fetchPages(wiki, templates) }
    const current = (target: WikiTarget) => completed.get(target.entry) ?? target.entry
    const hairless = characters.filter(({ target, title }) => pages[title] && !DISAMBIGUATION.test(pages[title]!) && isEmpty(current(target).attributes.hair))
    const full = hairless.length > 0 ? await fetchFullPages(wiki, hairless.map(({ title }) => title)) : {}
    for (const { target, title } of characters) {
      const infobox = pages[title] ? pageInfobox(pages, title) : null
      const values = infobox ? fandomValues(infobox) : null
      const hair = isEmpty(values?.hair) && full[title] ? textHair(full[title]!) : null
      if (!infobox && !hair)
        continue
      const entry = current(target)
      const added = addedValues(entry.attributes, { ...values ?? {}, ...hair ? { hair: hair.colors } : {} })
      const unknown = addUnknowns(entry.attributes, infobox ? fandomUnknowns(infobox) : [])
      if (unknown)
        added[UNKNOWN_KEYS] = unknown
      if (Object.keys(added).length === 0)
        continue
      completed.set(target.entry, { ...entry, attributes: { ...entry.attributes, ...added } })
      filled.push(`${target.entry.name} (repli ${wiki}, page « ${title} ») : ${Object.entries(added).map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ')}${hair ? ` (cheveux du texte : « ${hair.excerpt} »)` : ''}`)
    }
  }
  console.log()
  return { entries: targets.map(({ entry }) => completed.get(entry) ?? entry), filled, noWiki: [...noWiki] }
}
