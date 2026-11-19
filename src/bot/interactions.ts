import { type AutocompleteInteraction, type ChatInputCommandInteraction, type Interaction, MessageFlags } from 'discord.js'
import { type Game, GameError } from '../engine/game.js'
import { searchEntries } from '../engine/search.js'
import { getSubject } from '../subjects/registry.js'
import { COMMAND_NAME, DEBUG_COMMAND_NAME } from './commands.js'
import { renderBoard, renderGuess, renderReveal, renderStart } from './render.js'
import type { GameStore } from './store.js'

// File d'attente par salon : deux propositions simultanées sont traitées l'une après l'autre
const queues = new Map<string, Promise<void>>()

function inQueue(channelId: string, task: () => Promise<void>): Promise<void> {
  const run = (queues.get(channelId) ?? Promise.resolve()).then(task)
  queues.set(channelId, run.catch(() => {}))
  return run
}

export async function handleInteraction(interaction: Interaction, store: GameStore): Promise<void> {
  if (interaction.isAutocomplete() && interaction.commandName === COMMAND_NAME)
    return handleAutocomplete(interaction, store) // pas de file : Discord laisse 3 s pour répondre, et ça ne modifie rien
  if (!interaction.isChatInputCommand())
    return
  if (interaction.commandName === COMMAND_NAME)
    await inQueue(interaction.channelId, () => handleCommand(interaction, () => runCommand(interaction, store)))
  else if (interaction.commandName === DEBUG_COMMAND_NAME)
    await handleCommand(interaction, () => runDebugCommand(interaction, store))
}

async function handleCommand(interaction: ChatInputCommandInteraction, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (error) {
    if (!(error instanceof GameError))
      throw error
    const message = { content: `⚠️ ${error.message}`, flags: MessageFlags.Ephemeral } as const
    await (interaction.replied || interaction.deferred ? interaction.followUp(message) : interaction.reply(message))
  }
}

// On sauvegarde avant de répondre : si la réponse échoue, la proposition est quand même gardée
async function runCommand(interaction: ChatInputCommandInteraction, store: GameStore): Promise<void> {
  const channelId = interaction.channelId
  const current = store.get(channelId)

  switch (interaction.options.getSubcommand()) {
    case 'start': {
      if (current?.status === 'playing')
        throw new GameError('Une partie est déjà en cours dans ce salon (`/quiz giveup` pour l\'arrêter).')
      const subject = getSubject(interaction.options.getString('subject', true))
      if (!subject)
        throw new GameError('Sujet inconnu.')
      if (store.playedToday(channelId, subject.id))
        throw new GameError(`Le ${subject.name} du jour a déjà été joué dans ce salon. Rendez-vous demain !`)
      const game = store.startDaily(channelId, subject)
      await interaction.reply({ embeds: [renderStart(game)] })
      return
    }
    case 'guess': {
      const game = playingGame(current)
      const guess = game.guess(interaction.options.getString('name', true), interaction.user.id)
      store.save()
      await interaction.reply({ embeds: [renderGuess(game, guess)] })
      return
    }
    case 'board':
      if (!current)
        throw new GameError('Aucune partie dans ce salon. Lance-en une avec `/quiz start`.')
      await interaction.reply({ embeds: [renderBoard(current)] })
      return
    case 'giveup': {
      const game = playingGame(current)
      game.abandon()
      store.save()
      await interaction.reply({ embeds: [renderReveal(game)] })
      return
    }
  }
}

async function runDebugCommand(interaction: ChatInputCommandInteraction, store: GameStore): Promise<void> {
  if (!process.env.DISCORD_OWNER_ID || interaction.user.id !== process.env.DISCORD_OWNER_ID)
    throw new GameError('Commande réservée au propriétaire du bot.')
  if (interaction.options.getSubcommand() === 'reset') {
    store.reset()
    await interaction.reply({ content: '🔄 Nouveau tirage du jour, et toutes les parties sont effacées (sur tous les serveurs).', flags: MessageFlags.Ephemeral })
  }
}

function playingGame(game: Game | undefined): Game {
  if (game?.status !== 'playing')
    throw new GameError('Aucune partie en cours dans ce salon. Lance-en une avec `/quiz start`.')
  return game
}

async function handleAutocomplete(interaction: AutocompleteInteraction, store: GameStore): Promise<void> {
  const game = store.get(interaction.channelId)
  if (game?.status !== 'playing')
    return interaction.respond([])
  const found = searchEntries(game.subject, interaction.options.getFocused(), 25, game.guessedIds)
  await interaction.respond(found.map(entry => ({ name: entry.name, value: entry.name })))
}
