import { InteractionContextType, SlashCommandBuilder, type SlashCommandStringOption } from 'discord.js'
import { subjects } from '../subjects/registry.js'

export const COMMAND_NAME = 'quiz'

const subjectOption = (option: SlashCommandStringOption) => option
  .setName('subject')
  .setDescription('Quiz subject')
  .setRequired(true)
  .addChoices(...subjects.map(subject => ({ name: subject.name, value: subject.id })))

export const quizCommand = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription('Guess the mystery item')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand(sub => sub
    .setName('daily')
    .setDescription('Play today\'s quiz in this channel (same answer for everyone)')
    .addStringOption(subjectOption))
  .addSubcommand(sub => sub
    .setName('start')
    .setDescription('Start a quiz with a random answer in this channel')
    .addStringOption(subjectOption))
  .addSubcommand(sub => sub
    .setName('guess')
    .setDescription('Make a guess')
    .addStringOption(option => option.setName('name').setDescription('Your guess').setRequired(true).setAutocomplete(true)))
  .addSubcommand(sub => sub.setName('board').setDescription('Show every guess so far'))
  .addSubcommand(sub => sub.setName('giveup').setDescription('Give up and reveal the answer'))
