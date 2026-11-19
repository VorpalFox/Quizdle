import 'dotenv/config'
import { REST, Routes } from 'discord.js'
import { debugCommand, guessCommand, quizCommand } from './bot/commands.js'

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID)
  throw new Error('DISCORD_TOKEN et DISCORD_CLIENT_ID sont requis dans le .env')

const rest = new REST().setToken(DISCORD_TOKEN)

// Sans serveur de test : /quiz et /guess en global (ça peut prendre un moment à apparaître), et pas de debug.
// À relancer quand on ajoute un sujet (la liste des sujets fait partie de la commande).
if (!DISCORD_GUILD_ID) {
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [quizCommand.toJSON(), guessCommand.toJSON()] })
  console.log(`Commandes /${quizCommand.name} et /${guessCommand.name} enregistrées en global`)
} else {
  // Serveur de test : instantané, et c'est le seul endroit où /quizdebug existe
  await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: [quizCommand.toJSON(), guessCommand.toJSON(), debugCommand.toJSON()] })
  console.log(`Commandes /${quizCommand.name}, /${guessCommand.name} et /${debugCommand.name} enregistrées sur le serveur ${DISCORD_GUILD_ID}`)
}
