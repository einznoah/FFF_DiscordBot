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


const commands = [pingCommand];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();