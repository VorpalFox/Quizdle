import { type AutocompleteInteraction, type ChatInputCommandInteraction, type Interaction, type Message, MessageFlags } from 'discord.js'
import { type Game, GameError } from '../engine/game.js'
import { findEntry, searchEntries } from '../engine/search.js'
import { getSubject, subjects } from '../subjects/registry.js'
import { COMMAND_NAME, DEBUG_COMMAND_NAME, GUESS_COMMAND_NAME } from './commands.js'
import { renderBoard, renderGuess, renderReveal, renderStart } from './render.js'
import type { GameStore } from './store.js'

// Au-delà, un message n'est sûrement pas un nom : on ne cherche même pas
const MAX_MESSAGE_GUESS_LENGTH = 50

// « `/quiz pokedle` ou `/quiz animedle` »
const START_HINT = subjects.map(subject => `\`/${COMMAND_NAME} ${subject.id}\``).join(' ou ')

// File d'attente par salon : deux propositions simultanées sont traitées l'une après l'autre
const queues = new Map<string, Promise<void>>()

function inQueue(channelId: string, task: () => Promise<void>): Promise<void> {
  const run = (queues.get(channelId) ?? Promise.resolve()).then(task)
  queues.set(channelId, run.catch(() => {}))
  return run
}

export async function handleInteraction(interaction: Interaction, store: GameStore): Promise<void> {
  if (interaction.isAutocomplete() && interaction.commandName === GUESS_COMMAND_NAME)
    return handleAutocomplete(interaction, store) // pas de file : Discord laisse 3 s pour répondre, et ça ne modifie rien
  if (!interaction.isChatInputCommand())
    return
  if (interaction.commandName === COMMAND_NAME)
    await inQueue(interaction.channelId, () => handleCommand(interaction, () => runCommand(interaction, store)))
  else if (interaction.commandName === GUESS_COMMAND_NAME)
    await inQueue(interaction.channelId, () => handleCommand(interaction, () => runGuessCommand(interaction, store)))
  else if (interaction.commandName === DEBUG_COMMAND_NAME)
    await handleCommand(interaction, () => runDebugCommand(interaction, store))
}

// Un nom tapé directement dans le salon pendant une partie. Tout ce qui n'est pas un nom du quiz
// est de la discussion normale : on l'ignore sans rien dire.
export async function handleMessage(message: Message, store: GameStore): Promise<void> {
  if (message.author.bot || !message.inGuild() || message.content.length > MAX_MESSAGE_GUESS_LENGTH)
    return
  const game = store.get(message.channelId)
  if (game?.status !== 'playing' || !findEntry(game.subject, message.content))
    return
  await inQueue(message.channelId, async () => {
    // la partie a pu finir pendant l'attente dans la file
    const current = store.get(message.channelId)
    if (current?.status !== 'playing')
      return
    try {
      const guess = current.guess(message.content, message.author.id)
      await message.reply({ embeds: [renderGuess(current, guess)], allowedMentions: { repliedUser: false } })
    } catch (error) {
      if (!(error instanceof GameError))
        throw error
      await message.reply({ content: `⚠️ ${error.message}`, allowedMentions: { repliedUser: false } })
    }
  })
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

async function runCommand(interaction: ChatInputCommandInteraction, store: GameStore): Promise<void> {
  const channelId = interaction.channelId
  const current = store.get(channelId)

  switch (interaction.options.getSubcommand()) {
    case 'board':
      if (!current)
        throw new GameError(`Aucune partie dans ce salon. Lance-en une avec ${START_HINT}.`)
      await interaction.reply({ embeds: [renderBoard(current)] })
      return
    case 'giveup': {
      const game = playingGame(current)
      game.abandon()
      await interaction.reply({ embeds: [renderReveal(game)] })
      return
    }
    // les autres sous-commandes sont les sujets : /quiz pokedle...
    default: {
      if (current?.status === 'playing')
        throw new GameError('Une partie est déjà en cours dans ce salon (`/quiz giveup` pour l\'arrêter).')
      const subject = getSubject(interaction.options.getSubcommand())
      if (!subject)
        throw new GameError('Sujet inconnu.')
      if (store.playedToday(channelId, subject.id))
        throw new GameError(`Le ${subject.name} du jour a déjà été joué dans ce salon. Rendez-vous demain !`)
      const game = store.startDaily(channelId, subject)
      await interaction.reply({ embeds: [renderStart(game)] })
    }
  }
}

async function runGuessCommand(interaction: ChatInputCommandInteraction, store: GameStore): Promise<void> {
  const game = playingGame(store.get(interaction.channelId))
  const guess = game.guess(interaction.options.getString('name', true), interaction.user.id)
  await interaction.reply({ embeds: [renderGuess(game, guess)] })
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
    throw new GameError(`Aucune partie en cours dans ce salon. Lance-en une avec ${START_HINT}.`)
  return game
}

async function handleAutocomplete(interaction: AutocompleteInteraction, store: GameStore): Promise<void> {
  const game = store.get(interaction.channelId)
  if (game?.status !== 'playing')
    return interaction.respond([])
  const found = searchEntries(game.subject, interaction.options.getFocused(), 25, game.guessedIds)
  await interaction.respond(found.map(entry => ({ name: entry.name, value: entry.name })))
}
