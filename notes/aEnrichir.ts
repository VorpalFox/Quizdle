// Les univers (animes, franchises) dont les persos ont le plus de cases vides, dans notes/<quiz>-a-enrichir.md.
//   npx tsx notes/aEnrichir.ts weebdle               recalcule le tableau (seuil et minimum gardés du fichier)
//   npx tsx notes/aEnrichir.ts pixeldle --seuil 40   un univers apparaît au-dessus de 40 % de cases vides, sort en dessous
//   npx tsx notes/aEnrichir.ts animedle --min 3      seulement les univers d'au moins 3 persos
// L'ordre du tableau est gardé d'une fois sur l'autre (à traiter de haut en bas) ; les nouveaux venus vont à la fin.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

// Seulement les indices du perso : ceux de son univers (studio, année...) sont toujours remplis
const QUIZZES: Record<string, { data: string, universe: string, label: string, keys: Record<string, string> }> = {
  weebdle: { data: 'weebdle', universe: 'anime', label: 'Anime', keys: { gender: 'Sexe', species: 'Espèce', age: 'Âge', height: 'Taille', occupation: 'Occupation', hair: 'Cheveux' } },
  animedle: { data: 'anime', universe: 'anime', label: 'Univers', keys: { gender: 'Sexe', age: 'Âge', occupation: 'Occupation', hair: 'Cheveux' } },
  pixeldle: { data: 'pixeldle', universe: 'franchise', label: 'Franchise', keys: { gender: 'Sexe', species: 'Espèce', nationality: 'Nationalité', occupation: 'Occupation', hair: 'Cheveux' } },
}

const [name, ...args] = process.argv.slice(2)
const quiz = QUIZZES[name ?? '']
if (!quiz) {
  console.error(`Quiz : ${Object.keys(QUIZZES).join(', ')} (le Pokédle n'a pas d'univers)`)
  process.exit(1)
}
const option = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? Number(args[index + 1]) : undefined
}

const file = new URL(`./${name}-a-enrichir.md`, import.meta.url)
const old = existsSync(file) ? readFileSync(file, 'utf8') : ''
const threshold = option('--seuil') ?? Number(old.match(/au-dessus de (\d+) %/)?.[1] ?? 40)
const minimum = option('--min') ?? Number(old.match(/au moins (\d+) persos/)?.[1] ?? 5)

const entries: { attributes: Record<string, unknown> }[] = JSON.parse(readFileSync(new URL(`../data/${quiz.data}.json`, import.meta.url), 'utf8'))
const keys = Object.keys(quiz.keys)
const empty = (value: unknown) => value === null || value === undefined || (Array.isArray(value) && value.length === 0)
const rate = (list: typeof entries, key: string) => Math.round(100 * list.filter(entry => empty(entry.attributes[key])).length / list.length)

const byUniverse = new Map<string, typeof entries>()
for (const entry of entries) {
  const universe = String(entry.attributes[quiz.universe])
  byUniverse.set(universe, [...byUniverse.get(universe) ?? [], entry])
}
const stats = new Map([...byUniverse].map(([universe, list]) => {
  const rates = keys.map(key => rate(list, key))
  return [universe, { count: list.length, rates, average: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) }]
}))

// L'ordre d'avant (titres coupés : « The Reincarnation of the Strongest Exorcist… »), puis les nouveaux, les pires d'abord
const resolve = (label: string) => stats.has(label) ? label : [...stats.keys()].find(title => label.endsWith('…') && title.startsWith(label.slice(0, -1))) ?? label
const oldRows = [...old.matchAll(/^\| \[([ x-])\] \| (.+?) \| \d+ \|/gm)].map(match => ({ mark: match[1]!, universe: resolve(match[2]!) }))
const listed = oldRows.map(({ universe }) => universe)
// La coche de chaque univers est gardée : [x] traité, [-] passé (pas d'info trouvée), [ ] à faire
const marks = new Map(oldRows.map(({ mark, universe }) => [universe, mark]))
const shown = (universe: string) => {
  const stat = stats.get(universe)
  return stat !== undefined && stat.count >= minimum && stat.average >= threshold
}
const fresh = [...stats.keys()].filter(universe => !listed.includes(universe) && shown(universe)).sort((a, b) => stats.get(b)!.average - stats.get(a)!.average)
const rows = [...listed.filter(shown), ...fresh]
const left = listed.filter(universe => !shown(universe)).map(universe => stats.has(universe) ? `${universe} (${stats.get(universe)!.average} %)` : `${universe} (plus dans le quiz)`)
// Les sortis des fois d'avant, sans ceux qui reviennent (seuil baissé)
const before = [...old.matchAll(/^- (.+) \((?:\d+ %|plus dans le quiz)\)$/gm)].map(match => match[0].slice(2))
  .filter(line => !rows.includes(line.replace(/ \((?:\d+ %|plus dans le quiz)\)$/, '')) && !left.some(l => l.split(' (')[0] === line.split(' (')[0]))

const header = ['Fait', quiz.label, 'Persos', 'Vide (moy.)', ...Object.values(quiz.keys)]
writeFileSync(file, `# ${name} : univers les moins remplis (à traiter dans l'ordre)

Recalculé par \`npx tsx notes/aEnrichir.ts ${name}\` (\`--seuil N\`, \`--min N\` pour changer).
Un univers d'au moins ${minimum} persos apparaît au-dessus de ${threshold} % de cases vides en moyenne, et sort en dessous.
Fait : [x] traité, [-] passé (pas d'info trouvée), [ ] à faire. Les coches sont gardées au recalcul.
Sur tout le quiz : ${keys.map(key => `${quiz.keys[key]!.toLowerCase()} ${rate(entries, key)} %`).join(', ')}.

| ${header.join(' | ')} |
|${header.map(() => '---').join('|')}|
${rows.map(universe => {
  const { count, rates, average } = stats.get(universe)!
  return `| [${marks.get(universe) ?? ' '}] | ${universe} | ${count} | **${average} %** | ${rates.map(r => `${r} %`).join(' | ')} |`
}).join('\n')}

## Sortis du tableau

${[...before, ...left].map(line => `- ${line}`).join('\n') || '(aucun)'}
`)
console.log(`${name} : ${rows.length} univers au-dessus de ${threshold} %${left.length ? `, sortis : ${left.join(', ')}` : ''}`)
