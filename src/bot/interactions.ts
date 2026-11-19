import { type AutocompleteInteraction, type ChatInputCommandInteraction, type Interaction, MessageFlags } from 'discord.js'
import { Game, GameError } from '../engine/game.js'
import { randomEntry } from '../engine/pick.js'
import { searchEntries } from '../engine/search.js'
import { getSubject } from '../subjects/registry.js'
import { COMMAND_NAME } from './commands.js'
import { renderBoard, renderGuess, renderReveal, renderStart } from './render.js'

// Une partie par salon, partagée par tous ceux du salon (coop). Gardée en mémoire : perdue au redémarrage.
const games = new Map<string, Game>()

// File d'attente par salon : deux propositions simultanées sont traitées l'une après l'autre
const queues = new Map<string, Promise<void>>()

function inQueue(channelId: string, task: () => Promise<void>): Promise<void> {
  const run = (queues.get(channelId) ?? Promise.resolve()).then(task)
  queues.set(channelId, run.catch(() => {}))
  return run
}

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (interaction.isAutocomplete() && interaction.commandName === COMMAND_NAME)
    return handleAutocomplete(interaction) // pas de file : Discord laisse 3 s pour répondre, et ça ne modifie rien
  if (interaction.isChatInputCommand() && interaction.commandName === COMMAND_NAME)
    await inQueue(interaction.channelId, () => handleCommand(interaction))
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await runCommand(interaction)
  } catch (error) {
    if (!(error instanceof GameError))
      throw error
    const message = { content: `⚠️ ${error.message}`, flags: MessageFlags.Ephemeral } as const
    await (interaction.replied || interaction.deferred ? interaction.followUp(message) : interaction.reply(message))
  }
}

async function runCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const channelId = interaction.channelId
  const current = games.get(channelId)

  switch (interaction.options.getSubcommand()) {
    case 'start': {
      if (current?.status === 'playing')
        throw new GameError('Une partie est déjà en cours dans ce salon (`/quiz giveup` pour l\'arrêter).')
      const subject = getSubject(interaction.options.getString('subject', true))
      if (!subject)
        throw new GameError('Sujet inconnu.')
      const game = new Game(subject, randomEntry(subject))
      games.set(channelId, game)
      await interaction.reply({ embeds: [renderStart(game)] })
      return
    }
    case 'guess': {
      const game = playingGame(current)
      const guess = game.guess(interaction.options.getString('name', true), interaction.user.id)
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
      await interaction.reply({ embeds: [renderReveal(game)] })
      return
    }
  }
}

function playingGame(game: Game | undefined): Game {
  if (game?.status !== 'playing')
    throw new GameError('Aucune partie en cours dans ce salon. Lance-en une avec `/quiz start`.')
  return game
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const game = games.get(interaction.channelId)
  if (game?.status !== 'playing')
    return interaction.respond([])
  const found = searchEntries(game.subject, interaction.options.getFocused(), 25, game.guessedIds)
  await interaction.respond(found.map(entry => ({ name: entry.name, value: entry.name })))
}
