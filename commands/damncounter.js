const { SlashCommandBuilder } = require('@discordjs/builders');
const { REDIS_PASSWORD, REDIS_ADDRESS, REDIS_PORT, REDIS_DB } = require('../config.json');
const Redis = require('ioredis');
const redis = new Redis({
    port: REDIS_PORT,
    host: REDIS_ADDRESS,
    family: 4,
    password: REDIS_PASSWORD,
    db: REDIS_DB
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