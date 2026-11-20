// Recopie tous les messages du salon de recommandations du serveur dans .cache/discord/recos.txt (hors git :
// pseudos et messages du serveur), pour revérifier la liste du Weebdle (data/recommendations.json) à la main.
// Lecture seule, avec le token du bot (.env). Usage : npm run dump:recos -- [id du salon, #conseil-en-anime par défaut]
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { sleep } from './anilist.js'

const RECOMMENDATIONS_CHANNEL_ID = '352540900041293824'
const PER_REQUEST = 100
const DELAY_MS = 500

interface Message {
  id: string
  timestamp: string
  content: string
  author: { username: string }
  embeds?: { title?: string, description?: string }[]
}

const channelId = process.argv[2] ?? RECOMMENDATIONS_CHANNEL_ID
const token = process.env.DISCORD_TOKEN
if (!token)
  throw new Error('DISCORD_TOKEN est requis dans le .env')

// Les messages arrivent du plus récent au plus ancien, par 100 : on remonte avec `before`
const messages: Message[] = []
for (let before = ''; ;) {
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${PER_REQUEST}${before}`, { headers: { Authorization: `Bot ${token}` } })
  if (response.status === 429) {
    await sleep(2000)
    continue
  }
  if (!response.ok)
    throw new Error(`Discord : ${response.status} ${await response.text()}`)
  const batch = await response.json() as Message[]
  if (batch.length === 0)
    break
  messages.push(...batch)
  before = `&before=${batch.at(-1)!.id}`
  await sleep(DELAY_MS)
}

const embedText = (message: Message) => message.embeds?.length
  ? ` [embeds : ${message.embeds.map(embed => [embed.title, embed.description].filter(Boolean).join(' — ')).join(' | ')}]`
  : ''
const lines = messages.reverse().map(message => `[${message.timestamp.slice(0, 10)}] ${message.author.username}: ${message.content}${embedText(message)}`)

const file = new URL('../.cache/discord/recos.txt', import.meta.url)
await mkdir(new URL('./', file), { recursive: true })
await writeFile(file, `${lines.join('\n')}\n`)
console.log(`${messages.length} messages écrits dans .cache/discord/recos.txt`)
