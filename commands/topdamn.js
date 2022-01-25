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
        .setName('topdamn')
        .setDescription('See who said damn the most'),
    async execute(interaction) {
        let user_dict = {};
        await redis.hkeys('users').then(async res => {
            const array = res.toString().split(',');
            for (const element of array) {
                user_dict[element] = await redis.hget('users', element);
            }
        });
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
                    const counter = user_dict[value1.user.id];
                    if (counter === '0') return;
                    const line = i1.toString() + '. ' + value1.user.username + '#' + value1.user.discriminator + ' : ' + counter;
                    msg += line + '\n';
                })
                .catch((err) => {
                    msg = 'An error occurred, please contact the bot developer! '
                    console.log(err)
                })
        })
        if (msg === '') msg = 'An error occurred, please contact the bot developer! '
        await interaction.reply(msg)
    },
};