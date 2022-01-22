const { SlashCommandBuilder } = require('@discordjs/builders');
const damn_counter = require("nconf");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('damncounter')
        .setDescription('Check how many times a user has said damn')
        .addUserOption((option) => option.setName('user').setDescription('The user to check').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        damn_counter.load();
        const counter = damn_counter.get('user:' + user.id);
        if (counter !== undefined) {
            await interaction.reply(user.username + " said damn " + counter.toString() + " times!")
        } else {
            await interaction.reply(user.username + " hasn't said damn yet!")
        }
    },
};