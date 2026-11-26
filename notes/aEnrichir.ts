// Les univers (animes, franchises) dont les persos ont le plus de cases vides, dans notes/<quiz>-a-enrichir.md.
//   npx tsx notes/aEnrichir.ts weebdle               recalcule le tableau (seuil gardé du fichier)
//   npx tsx notes/aEnrichir.ts pixeldle --seuil 40   seulement les univers au-dessus de 40 % de cases vides
// Tout est recalculé depuis data/ à chaque fois ; seules les coches [x] / [-] sont reprises de l'ancien fichier.
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

// Tout est recalculé à chaque fois : les univers au-dessus du seuil, les pires d'abord.
// Seule la coche de chaque univers est reprise : [x] traité, [-] passé (pas d'info trouvée), [ ] à faire
// (titres coupés : « The Reincarnation of the Strongest Exorcist… »)
const resolve = (label: string) => stats.has(label) ? label : [...stats.keys()].find(title => label.endsWith('…') && title.startsWith(label.slice(0, -1))) ?? label
const marks = new Map([...old.matchAll(/^\| \[([ x-])\] \| (.+?) \| \d+ \|/gm)].map(match => [resolve(match[2]!), match[1]!]))
const rows = [...stats.keys()]
  .filter(universe => stats.get(universe)!.average >= threshold)
  .sort((a, b) => stats.get(b)!.average - stats.get(a)!.average)

const header = ['Fait', quiz.label, 'Persos', 'Vide (moy.)', ...Object.values(quiz.keys)]
writeFileSync(file, `# ${name} : univers les moins remplis (à traiter dans l'ordre)

Recalculé par \`npx tsx notes/aEnrichir.ts ${name}\` (\`--seuil N\` pour changer).
Les univers au-dessus de ${threshold} % de cases vides en moyenne, les pires d'abord.
Fait : [x] traité, [-] passé (pas d'info trouvée), [ ] à faire. Les coches sont gardées au recalcul.
Sur tout le quiz : ${keys.map(key => `${quiz.keys[key]!.toLowerCase()} ${rate(entries, key)} %`).join(', ')}.

| ${header.join(' | ')} |
|${header.map(() => '---').join('|')}|
${rows.map(universe => {
  const { count, rates, average } = stats.get(universe)!
  return `| [${marks.get(universe) ?? ' '}] | ${universe} | ${count} | **${average} %** | ${rates.map(r => `${r} %`).join(' | ')} |`
}).join('\n')}
`)
console.log(`${name} : ${rows.length} univers au-dessus de ${threshold} %`)
