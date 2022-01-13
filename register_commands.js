const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const {token, CLIENT_ID} = require('./config.json')

// const data = new SlashCommandBuilder()
//    .setName('gif')
//    .setDescription('Sends a random gif!')
//    .addStringOption(option =>
//        option.setName('category')
//            .setDescription('The gif category')
//            .setRequired(true)
//            .addChoice('Funny', 'gif_funny')
//            .addChoice('Meme', 'gif_meme')
//            .addChoice('Movie', 'gif_movie'));

const pingCommand = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bots ping')

const damnsCommand = new SlashCommandBuilder()
    .setName('damncounter')
    .setDescription('Check how many times a user has said damn')

damnsCommand.addUserOption((option) => option.setName('user').setDescription('The user to check').setRequired(true));

const globalupdate = new SlashCommandBuilder()
    .setName('globalupdate')
    .setDescription('Initiates a global update')

const commands = [pingCommand, globalupdate, damnsCommand];

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(CLIENT_ID, '762943812464934923'), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);