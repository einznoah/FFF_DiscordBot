const { SlashCommandBuilder } = require('@discordjs/builders');
const damn_counter = require("nconf");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topdamn')
        .setDescription('See who said damn the most'),
    async execute(interaction) {
        damn_counter.load();
        const users = JSON.stringify(damn_counter.get('user'))
        let user_dict = {};
        for (let user in JSON.parse(users)) {
            user_dict[user] = damn_counter.get('user:' + user);
        }
        let items = Object.keys(user_dict).map(function (key) {
            return [key, user_dict[key]]
        });
        items.sort(function (first, second) {
            return second[1] - first[1];
        });
        const top_5 = items.slice(0, 5);
        let msg = '';
        let i1 = 0;
        await top_5.forEach(value => {
            interaction.guild.members.fetch(value[0])
                .then(value1 => {
                    i1++;
                    if (damn_counter.get('user:' + value1.user.id).toString() === '0') return
                    const line = i1.toString() + '. ' + value1.user.username + '#' + value1.user.discriminator + ' : ' + damn_counter.get('user:' + value1.user.id).toString();
                    msg += line + '\n';
                })
                .catch((err) => {
                    msg = 'An error occurred, please contact the bot developer! '
                    console.log(err)
                })
        })
        await interaction.reply(msg)
    },
};