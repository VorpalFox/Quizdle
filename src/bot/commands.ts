import { InteractionContextType, SlashCommandBuilder } from 'discord.js'
import { subjects } from '../subjects/registry.js'

export const COMMAND_NAME = 'quiz'
export const DEBUG_COMMAND_NAME = 'quizdebug'

export const quizCommand = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription('Guess the mystery item of the day')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand(sub => sub
    .setName('start')
    .setDescription('Play today\'s quiz in this channel (same answer for everyone)')
    .addStringOption(option => option
      .setName('subject')
      .setDescription('Quiz subject')
      .setRequired(true)
      .addChoices(...subjects.map(subject => ({ name: subject.name, value: subject.id })))))
  .addSubcommand(sub => sub
    .setName('guess')
    .setDescription('Make a guess')
    .addStringOption(option => option.setName('name').setDescription('Your guess').setRequired(true).setAutocomplete(true)))
  .addSubcommand(sub => sub.setName('board').setDescription('Show every guess so far'))
  .addSubcommand(sub => sub.setName('giveup').setDescription('Give up and reveal the answer'))

// Debug, à virer plus tard : enregistrée seulement sur le serveur de test, cachée aux non-admins,
// et le bot vérifie en plus que c'est bien DISCORD_OWNER_ID qui l'appelle
export const debugCommand = new SlashCommandBuilder()
  .setName(DEBUG_COMMAND_NAME)
  .setDescription('Debug tools (owner only)')
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(0)
  .addSubcommand(sub => sub.setName('reset').setDescription('Draw new answers for today and forget every game'))
