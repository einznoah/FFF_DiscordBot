const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member')
        .addUserOption((option) => option.setName('user').setDescription('The user to ban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for banning').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        if (!interaction.member.bannable) {
            await interaction.reply(`${user.name} can't be banned by the bot. Check if the bot has enough permissions`)
        } else {
            if (interaction.getString('reason')) {
                await interaction.member.ban({ reason: interaction.getString('reason')})
                await interaction.reply(`**${user.name} was banned for** ${interaction.getString('reason')}`)
            }
        }
}};