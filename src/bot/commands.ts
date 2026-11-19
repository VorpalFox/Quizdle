import { InteractionContextType, SlashCommandBuilder } from 'discord.js'
import { subjects } from '../subjects/registry.js'

export const COMMAND_NAME = 'quiz'
export const GUESS_COMMAND_NAME = 'guess'
export const DEBUG_COMMAND_NAME = 'quizdebug'

export const quizCommand = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription('Guess the mystery item of the day')
  .setContexts(InteractionContextType.Guild)

// Une sous-commande par sujet, nommée d'après son id : /quiz pokedle, /quiz animedle...
for (const subject of subjects)
  quizCommand.addSubcommand(sub => sub.setName(subject.id).setDescription(`Play today's ${subject.name} in this channel (same answer for everyone)`))

quizCommand
  .addSubcommand(sub => sub.setName('board').setDescription('Show every guess so far'))
  .addSubcommand(sub => sub.setName('giveup').setDescription('Give up and reveal the answer'))

// Commande à part pour qu'elle soit courte à taper : /guess pika…
export const guessCommand = new SlashCommandBuilder()
  .setName(GUESS_COMMAND_NAME)
  .setDescription('Make a guess in this channel\'s quiz')
  .setContexts(InteractionContextType.Guild)
  .addStringOption(option => option.setName('name').setDescription('Your guess').setRequired(true).setAutocomplete(true))

// Debug, à virer plus tard : enregistrée seulement sur le serveur de test, cachée aux non-admins,
// et le bot vérifie en plus que c'est bien DISCORD_OWNER_ID qui l'appelle
export const debugCommand = new SlashCommandBuilder()
  .setName(DEBUG_COMMAND_NAME)
  .setDescription('Debug tools (owner only)')
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(0)
  .addSubcommand(sub => sub.setName('reset').setDescription('Draw new answers for today and forget every game'))
