// Le wiki de chaque franchise du Pixeldle, pour compléter les indices que Wikidata n'a pas (voir scripts/README.md).
// Trois sortes de wikis, tous avec l'API MediaWiki :
// - Fandom : le P4073 de Wikidata sur la franchise ou ses jeux, sinon le wiki le plus cité par les liens Fandom (P6262)
//   de ses personnages, sinon deviné d'après le titre. Et sa version française si elle existe.
// - wiki.gg : beaucoup de communautés y sont parties de Fandom (Terraria, Warcraft). Deviné d'après le titre.
// - Quelques wikis indépendants connus (Super Mario Wiki, Bulbapedia, UESP...)
// Chaque wiki est vérifié, avec son nombre d'articles et de contributeurs actifs : un wiki Fandom abandonné pour un
// autre en a très peu. Réponses gardées dans .cache/pixeldle/wikis.json (hors git).
import { readFile, writeFile } from 'node:fs/promises'
import { sleep } from './anilist.js'

const USER_AGENT = 'quizdle-data/1.0'
const DELAY_MS = 300
// Un wiki cité par les personnages n'est celui de la franchise que si au moins cette part de ses liens est dans la
// franchise : écarte les wikis de tous les jeux (gamicus, villains, nintendo)
const MIN_SHARE = 0.4
// … et qu'il est cité au moins ce nombre de fois (un seul lien vers starwars/fr pour Soulcalibur)
const MIN_LINKS = 3
// Un wiki plus petit est une coquille vide (zenlesszonezero.wiki.gg : 0 article)
const MIN_ARTICLES = 10

// Le wiki Fandom choisi à la main, quand Wikidata ne le donne pas et que le titre ne le devine pas
const FANDOM_WIKIS: Record<string, string> = {
  // Le wiki de l'univers de Myst (D'ni), qui couvre tous les jeux
  'Myst': 'dni',
  'Rayman': 'rabbids',
  // Wikidata et les liens des personnages donnent gmod (Garry's Mod)
  'Left 4 Dead': 'left4dead',
  // Devinés d'après un bout du titre, vérifiés : ce sont bien ceux de la franchise
  'Divinity: Original Sin': 'divinity',
  'Alice: Madness Returns': 'alice',
  'Lost Records: Bloom & Rage': 'lostrecords',
  // Les liens des personnages donnent tfcomics (les comics)
  'Team Fortress': 'teamfortress',
  // Wikidata donne eternalcrusade, le wiki d'un seul jeu. Warhammer Fantasy en second (OTHER_WIKIS)
  'Warhammer': 'warhammer40k',
  // Des wikis plus larges que la franchise, mais qui la couvrent : vérifiés
  'Persona': 'megamitensei',
  'Metaphor: ReFantazio': 'megamitensei',
  'Tales of': 'aselia',
  'Like a Dragon': 'yakuza',
  'The King of Fighters': 'snk',
  'Hogwarts Legacy': 'harrypotter',
  'Warcraft': 'wowpedia',
  // Devinés d'après le titre : le nom du wiki est bien celui du jeu
  'The Talos Principle': 'talosprinciple',
  'The Riftbreaker': 'riftbreaker',
  'Solasta': 'solastacrownofthemagister',
}

// Tous les wikis trouvés sont interrogés, l'un après l'autre : chacun ne remplit que les champs encore vides.
// Par défaut Fandom d'abord, puis wiki.gg, puis l'indépendant. Ici, l'autre wiki d'abord : plus actif, et son
// infobox de personnage est vérifiée (sexe, race...).
const ALTERNATIVE_FIRST = new Set(['Warcraft', 'The Elder Scrolls', 'Guilty Gear', 'Splatoon', 'Pikmin', 'Deep Rock Galactic',
  'Super Mario', 'Donkey Kong', 'Wario', 'Minecraft', 'Team Fortress',
  // Pas d'infobox de personnage, ni d'un côté ni de l'autre : le plus actif d'abord
  'ARK', 'Satisfactory', 'Hunt: Showdown', 'Blue Prince'])
// Fandom d'abord, choisi alors qu'un autre wiki est plus actif : le wiki officiel de LoL n'a que le gameplay, pas le lore
const FANDOM_FIRST = new Set(['League of Legends'])

// Les wikis indépendants de Fandom, par franchise : l'adresse de leur API
const OTHER_WIKIS: Record<string, string> = {
  'Super Mario': 'https://www.mariowiki.com/api.php',
  'Donkey Kong': 'https://www.mariowiki.com/api.php',
  'Wario': 'https://www.mariowiki.com/api.php',
  'Pokémon': 'https://bulbapedia.bulbagarden.net/w/api.php',
  'The Legend of Zelda': 'https://zeldawiki.wiki/w/api.php',
  'Kirby': 'https://wikirby.com/w/api.php',
  'Metroid': 'https://www.metroidwiki.org/w/api.php',
  'Fire Emblem': 'https://fireemblemwiki.org/w/api.php',
  'Xenoblade Chronicles': 'https://www.xenoserieswiki.org/w/api.php',
  'Splatoon': 'https://splatoonwiki.org/w/api.php',
  'Animal Crossing': 'https://nookipedia.com/w/api.php',
  'Pikmin': 'https://www.pikminwiki.com/api.php',
  'Sonic the Hedgehog': 'https://info.sonicretro.org/api.php',
  'The Elder Scrolls': 'https://en.uesp.net/w/api.php',
  'Minecraft': 'https://minecraft.wiki/api.php',
  'Touhou Project': 'https://en.touhouwiki.net/api.php',
  'Team Fortress': 'https://wiki.teamfortress.com/w/api.php',
  'Half-Life': 'https://combineoverwiki.net/api.php',
  'Portal': 'https://combineoverwiki.net/api.php',
  'Stardew Valley': 'https://stardewvalleywiki.com/mediawiki/api.php',
  'League of Legends': 'https://wiki.leagueoflegends.com/en-us/api.php',
  'Hollow Knight': 'https://hollowknight.wiki/api.php',
  'Warhammer': 'https://warhammerfantasy.fandom.com/api.php',
}

export interface Wiki {
  // fandom : « zelda », « mario/fr » ; ailleurs : l'adresse de l'API
  id: string
  name: string
  url: string
  articles: number
  active: number
  // d'où vient ce wiki : P4073, personnages (n liens), titre, table
  source: string
  // l'adresse de son API
  api: string
}

export interface FranchiseWikis {
  fandom: Wiki | null
  fandomFr: Wiki | null
  wikigg: Wiki | null
  other: Wiki | null
  // Les wikis à interroger, dans l'ordre (sans le Fandom FR : presque vides, 0 à 2 contributeurs)
  order: Wiki[]
}

const cacheFile = new URL('../.cache/pixeldle/wikis.json', import.meta.url)
type Info = Omit<Wiki, 'source' | 'api'> | null
let cache: Record<string, Info> | null = null

// Le nom et la taille du wiki dont c'est l'API, null s'il n'existe pas (Fandom renvoie alors vers sa page « pas un wiki »)
async function siteinfo(api: string, id: string): Promise<Info> {
  cache ??= JSON.parse(await readFile(cacheFile, 'utf8').catch(() => '{}')) as Record<string, Info>
  if (api in cache)
    return cache[api]!
  const params = new URLSearchParams({ action: 'query', meta: 'siteinfo', siprop: 'general|statistics', format: 'json', formatversion: '2' })
  const response = await fetch(`${api}?${params}`, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null)
  await sleep(DELAY_MS)
  const text = response?.ok ? await response.text() : ''
  let info: Info = null
  const requested = new URL(api)
  const final = response ? new URL(response.url) : null
  // Un wiki renommé redirige vers son nouveau nom : on le garde, mais pas une redirection vers un autre site
  if (final && text.startsWith('{') && final.host.split('.').slice(-2).join('.') === requested.host.split('.').slice(-2).join('.')) {
    const json = JSON.parse(text) as { query?: { general?: { sitename: string, base: string }, statistics?: { articles: number, activeusers: number } } }
    const { general, statistics } = json.query ?? {}
    if (general && statistics) {
      const fandom = final.host.endsWith('.fandom.com') ? `${final.host.replace('.fandom.com', '')}${final.pathname.replace(/\/api\.php$/, '')}` : null
      info = { id: fandom ?? id, name: general.sitename, url: general.base, articles: statistics.articles, active: statistics.activeusers }
    }
  }
  cache[api] = info
  await writeFile(cacheFile, JSON.stringify(cache))
  return info
}

// « zelda » → https://zelda.fandom.com/api.php, « fr.mario » ou « mario/fr » → https://mario.fandom.com/fr/api.php
function fandomApi(wiki: string): string {
  const prefixed = /^([a-z]{2}(?:-[a-z]{2})?)\.(.+)$/.exec(wiki)
  const [host, language] = prefixed ? [prefixed[2]!, prefixed[1]!] : wiki.split('/')
  return `https://${host}.fandom.com${language ? `/${language}` : ''}/api.php`
}

// « The Legend of Zelda » → thelegendofzelda, the-legend-of-zelda, legendofzelda, zelda... (« Batman: Arkham » → batman)
function guesses(title: string): string[] {
  const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const short = title.split(/[:–]/)[0]!
  const withoutThe = title.replace(/^the\s+/i, '')
  const last = title.split(/\s+/).at(-1)!
  return [...new Set([title, short, withoutThe, last].map(slug).flatMap(name => [name.replace(/-/g, ''), name]))]
    .filter(name => name.length >= 3)
}

const isLanguage = (wiki: string) => /^[a-z]{2}(?:-[a-z]{2})?\./.test(wiki)

// Les wikis cités par les liens Fandom des personnages de chaque franchise : wiki → nombre de liens
function citedWikis(characterLinks: Map<string, string[]>): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()
  for (const [title, links] of characterLinks) {
    const counts = new Map<string, number>()
    for (const link of links) {
      const wiki = link.split(':')[0]!.toLowerCase()
      counts.set(wiki, (counts.get(wiki) ?? 0) + 1)
    }
    result.set(title, counts)
  }
  return result
}

async function first(candidates: { wiki: string, source: string }[], api: (wiki: string) => string): Promise<Wiki | null> {
  for (const { wiki, source } of candidates) {
    const info = await siteinfo(api(wiki), wiki)
    if (info && info.articles >= MIN_ARTICLES)
      return { ...info, source, api: api(wiki) }
  }
  return null
}

// `wikidataWikis` : les P4073 de la franchise et de ses jeux. `characterLinks` : les P6262 de ses personnages.
export async function findWikis(franchises: { title: string, wikidataWikis: string[], characterLinks: string[] }[]): Promise<Map<string, FranchiseWikis>> {
  const cited = citedWikis(new Map(franchises.map(({ title, characterLinks }) => [title, characterLinks])))
  const totals = new Map<string, number>()
  for (const counts of cited.values()) {
    for (const [wiki, count] of counts)
      totals.set(wiki, (totals.get(wiki) ?? 0) + count)
  }

  const result = new Map<string, FranchiseWikis>()
  for (const [index, { title, wikidataWikis }] of franchises.entries()) {
    process.stdout.write(`\rWikis : ${index + 1}/${franchises.length} franchises`.padEnd(60))
    const counts = [...cited.get(title)!].filter(([wiki, count]) => count >= MIN_LINKS && count / totals.get(wiki)! >= MIN_SHARE).toSorted((a, b) => b[1] - a[1])
    const byFrequency = (list: string[]) => [...list.reduce((map, wiki) => map.set(wiki, (map.get(wiki) ?? 0) + 1), new Map<string, number>())]
      .toSorted((a, b) => b[1] - a[1]).map(([wiki]) => wiki)
    const declared = byFrequency(wikidataWikis.map(wiki => wiki.toLowerCase()))

    const fandom = await first([
      ...(FANDOM_WIKIS[title] ? [{ wiki: FANDOM_WIKIS[title]!, source: 'table' }] : []),
      ...declared.filter(wiki => !isLanguage(wiki)).map(wiki => ({ wiki, source: 'P4073' })),
      ...counts.filter(([wiki]) => !isLanguage(wiki)).slice(0, 3).map(([wiki, count]) => ({ wiki, source: `personnages (${count} liens)` })),
      ...guesses(title).map(wiki => ({ wiki, source: 'titre' })),
    ], fandomApi)
    const fandomFr = await first([
      ...declared.filter(wiki => wiki.startsWith('fr.')).map(wiki => ({ wiki, source: 'P4073' })),
      ...counts.filter(([wiki]) => wiki.startsWith('fr.')).slice(0, 2).map(([wiki, count]) => ({ wiki, source: `personnages (${count} liens)` })),
      ...(fandom ? [{ wiki: `${fandom.id.split('/')[0]}/fr`, source: 'même nom' }] : []),
    ], fandomApi)
    const wikigg = await first(guesses(title).slice(0, 4).map(wiki => ({ wiki, source: 'titre' })), wiki => `https://${wiki}.wiki.gg/api.php`)
    const other = OTHER_WIKIS[title] ? await first([{ wiki: OTHER_WIKIS[title]!, source: 'table' }], wiki => wiki) : null
    const alternatives = [wikigg, other].filter((wiki): wiki is Wiki => Boolean(wiki))
    const order = ALTERNATIVE_FIRST.has(title) ? [...alternatives, fandom] : [fandom, ...alternatives]
    result.set(title, { fandom, fandomFr, wikigg, other, order: order.filter((wiki): wiki is Wiki => Boolean(wiki)) })
  }
  console.log()
  return result
}

// Le récap à relire : un tableau par franchise
// Les choix à vérifier à la main, avec la raison
function doubts(title: string, { fandom, wikigg, other }: FranchiseWikis): string[] {
  const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '')
  const words = title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').split(/[^a-z0-9]+/).filter(word => word.length >= 4)
  const initials = title.split(/[\s:-]+/).map(word => word[0] ?? '').join('').toLowerCase()
  // « gta » pour Grand Theft Auto, « thelastofus », « zelda » : le nom du wiki rappelle la franchise
  const related = (id: string) => {
    const name = slug(id.split('/')[0]!)
    return name === initials || slug(title).includes(name) || words.some(word => name.includes(word))
  }
  const reasons: string[] = []
  // Deviné d'après un bout du titre seulement (« alice » pour Alice: Madness Returns) : peut-être un autre sujet
  if (fandom && fandom.source === 'titre' && slug(fandom.id) !== slug(title) && slug(fandom.id) !== slug(title.replace(/^thes+/i, '')))
    reasons.push(`Fandom « ${fandom.id} » deviné d'après un seul mot du titre : peut-être le wiki d'autre chose`)
  else if (fandom && fandom.source !== 'table' && !related(fandom.id))
    reasons.push(`Fandom « ${fandom.id} » (${fandom.source}) : nom sans rapport avec la franchise, peut-être un wiki plus large ou d'un autre jeu`)
  // Abandonné pour un autre wiki : la communauté est partie ailleurs
  const alive = [wikigg, other].filter((wiki): wiki is Wiki => Boolean(wiki)).find(wiki => fandom && wiki.active > Math.max(5, fandom.active * 3))
  if (fandom && alive && !ALTERNATIVE_FIRST.has(title) && !FANDOM_FIRST.has(title))
    reasons.push(`Fandom « ${fandom.id} » (${fandom.active} actifs) délaissé pour ${new URL(alive.url).host} (${alive.active} actifs) : le mettre en premier dans ALTERNATIVE_FIRST ?`)
  return reasons
}

function checks(wikis: Map<string, FranchiseWikis>): string[] {
  const list = [...wikis].map(([title, found]) => ({ title, reasons: doubts(title, found) })).filter(({ reasons }) => reasons.length > 0)
  return [`## À vérifier (${list.length}) : le bon wiki va dans FANDOM_WIKIS (scripts/pixeldleWikis.ts)`, '',
    ...list.map(({ title, reasons }) => `- **${title}** : ${reasons.join(' ; ')}`), '', '## Tous les wikis', '']
}

export function wikisRecap(wikis: Map<string, FranchiseWikis>, characterCounts: Map<string, number>): string {
  const cell = (wiki: Wiki | null) => wiki ? `[${wiki.id.startsWith('http') ? new URL(wiki.url).host : wiki.id}](${wiki.url}) ${wiki.articles} art., ${wiki.active} actifs (${wiki.source})` : '—'
  const missing = [...wikis].filter(([, { fandom, wikigg, other }]) => !fandom && !wikigg && !other).map(([title]) => title)
  const lines = [
    `# Wikis des franchises du Pixeldle (${wikis.size})`, '',
    'Fandom : P4073 de Wikidata, sinon le wiki le plus cité par les liens Fandom des personnages, sinon deviné d\'après le titre (à vérifier).',
    'Actifs : contributeurs des 30 derniers jours. Un wiki Fandom quasi inactif à côté d\'un wiki.gg ou indépendant actif a sans doute été abandonné.', '',
    `Sans aucun wiki trouvé (${missing.length}) : ${missing.join(', ') || '—'}`, '',
    ...checks(wikis),
    '| Franchise | Persos | Ordre d\'interrogation | Fandom | Fandom FR | wiki.gg | Indépendant |',
    '|---|---|---|---|---|---|---|',
    ...[...wikis].map(([title, { fandom, fandomFr, wikigg, other, order }]) => `| ${title} | ${characterCounts.get(title) ?? 0} | ${order.map(wiki => wiki.api.includes('.fandom.com') ? wiki.id : new URL(wiki.api).host).join(' → ') || '—'} | ${cell(fandom)} | ${cell(fandomFr)} | ${cell(wikigg)} | ${cell(other)} |`),
  ]
  return `${lines.join('\n')}\n`
}
