import 'dotenv/config'
import { Client, Events, GatewayIntentBits } from 'discord.js'
import { handleInteraction } from './bot/interactions.js'

const token = process.env.DISCORD_TOKEN
if (!token)
  throw new Error('DISCORD_TOKEN manquant dans le .env')

// Que des slash commands : l'intent Guilds suffit, pas besoin d'intents privilégiés
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, readyClient => console.log(`Connecté en tant que ${readyClient.user.tag}`))

client.on(Events.InteractionCreate, interaction => {
  handleInteraction(interaction).catch(error => console.error('Erreur sur une interaction', error))
})

await client.login(token)
