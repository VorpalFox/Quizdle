import 'dotenv/config'
import { Client, Events, GatewayIntentBits, Status } from 'discord.js'
import { crash } from './bot/crash.js'
import { DAILY_FILE, DailyDraw } from './bot/daily.js'
import { handleInteraction, handleMessage } from './bot/interactions.js'
import { GameStore } from './bot/store.js'
import { dayKey } from './engine/pick.js'

// Vérif du changement de jour : toutes les minutes, donc le tirage tombe au plus tard à minuit et une minute
const DAY_CHECK_INTERVAL_MS = 60_000

const WATCHDOG_INTERVAL_MS = 60_000
const MAX_DISCONNECTED_MS = 5 * 60_000

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

// Sans ces logs, une coupure ne laisse aucune trace
client.on(Events.ShardDisconnect, event => console.warn(`Déconnecté de Discord (code ${event.code})`))
client.on(Events.ShardReconnecting, () => console.warn('Reconnexion à Discord…'))
client.on(Events.ShardResume, () => console.log('Reconnecté à Discord'))
client.on(Events.ShardError, error => console.error('Erreur de connexion à Discord', error))
client.on(Events.Warn, message => console.warn('Avertissement discord.js :', message))
client.on(Events.Error, error => console.error('Erreur discord.js', error))
client.on(Events.Invalidated, () => void crash('session Discord invalidée'))

// Watchdog : pm2 ne relance que si le process meurt. Un bot vivant mais déconnecté s'arrête donc tout seul
// au bout de 5 min, ce qui laisse à discord.js le temps de se reconnecter après une petite coupure
let lastConnectedAt = Date.now()
setInterval(() => {
  // client.isReady() reste vrai après une coupure : c'est l'état des shards qui compte
  if (client.ws.shards.size > 0 && client.ws.shards.every(shard => shard.status === Status.Ready))
    lastConnectedAt = Date.now()
  else if (Date.now() - lastConnectedAt > MAX_DISCONNECTED_MS)
    void crash('déconnecté de Discord depuis plus de 5 min')
}, WATCHDOG_INTERVAL_MS)

process.on('uncaughtException', error => void crash('exception non rattrapée', error))
process.on('unhandledRejection', error => void crash('promesse rejetée non rattrapée', error))

client.on(Events.InteractionCreate, interaction => {
  handleInteraction(interaction, store).catch(error => console.error('Erreur sur une interaction', error))
})

client.on(Events.MessageCreate, message => {
  handleMessage(message, store).catch(error => console.error('Erreur sur un message', error))
})

await client.login(token).catch(error => crash('connexion à Discord impossible', error))
