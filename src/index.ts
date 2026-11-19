import 'dotenv/config'
import { Client, Events, GatewayIntentBits } from 'discord.js'
import { DAILY_FILE, DailyDraw } from './bot/daily.js'
import { handleInteraction, handleMessage } from './bot/interactions.js'
import { GameStore } from './bot/store.js'
import { dayKey } from './engine/pick.js'

// Vérif du changement de jour : toutes les minutes, donc le tirage tombe au plus tard à minuit et une minute
const DAY_CHECK_INTERVAL_MS = 60_000

const token = process.env.DISCORD_TOKEN
if (!token)
  throw new Error('DISCORD_TOKEN manquant dans le .env')

// Au démarrage : reprend le tirage sauvegardé s'il est d'aujourd'hui, sinon en fait un nouveau
const daily = DailyDraw.load(DAILY_FILE, dayKey())
const store = new GameStore(daily)

setInterval(() => {
  if (daily.ensureDay(dayKey()))
    console.log(`Nouveau tirage pour le ${dayKey()}`)
}, DAY_CHECK_INTERVAL_MS)

// MessageContent est un intent privilégié : à activer dans le Developer Portal (Bot > Privileged Gateway Intents),
// et au-delà de 100 serveurs Discord demande une validation
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] })

client.once(Events.ClientReady, readyClient => console.log(`Connecté en tant que ${readyClient.user.tag}`))

client.on(Events.InteractionCreate, interaction => {
  handleInteraction(interaction, store).catch(error => console.error('Erreur sur une interaction', error))
})

client.on(Events.MessageCreate, message => {
  handleMessage(message, store).catch(error => console.error('Erreur sur un message', error))
})

await client.login(token)
