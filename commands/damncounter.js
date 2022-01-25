const { SlashCommandBuilder } = require('@discordjs/builders');
const { REDIS_PASSWORD } = require('../config.json');
const Redis = require('ioredis');
const redis = new Redis({
    port: 9000,
    host: '127.0.0.1',
    family: 4,
    password: REDIS_PASSWORD,
    db: 0
});
module.exports = {
    data: new SlashCommandBuilder()
        .setName('damncounter')
        .setDescription('Check how many times a user has said damn')
        .addUserOption((option) => option.setName('user').setDescription('The user to check').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const counter = await redis.hget('users', user.id)
        if (counter === undefined || counter === null) {
            await interaction.reply(user.username + " hasn't said damn yet!")
        } else {
            if (counter === '1') {
                await interaction.reply(user.username + " said damn " + counter.toString() + " time!")
            } else {
                await interaction.reply(user.username + " said damn " + counter.toString() + " times!")
            }

        }
    },
};