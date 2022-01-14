const { Client, Intents, MessageEmbed} = require('discord.js');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES]})
const {token, log_channel_id, PASTEBIN_API_KEY} = require('./config.json');
const PasteClient = require('pastebin-api').default;
const damn_counter = require('nconf');
damn_counter.file({ file: './damn_counter.json'});
const PastebinClient = new PasteClient(PASTEBIN_API_KEY);
let log_channel;
let guild;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    log_channel = client.channels.cache.find(channel => channel.id === log_channel_id);
    guild = client.guilds.cache.get('762943812464934923');
    guild.members.fetch().then(() => console.log('Finished updating members!'))
})

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (interaction.commandName === 'damncounter') {
        const user = interaction.options.getUser('user');
        console.log(user.username)
        const counter = damn_counter.get('user:' + user.id);
        await interaction.reply(user.username + " said damn " + counter.toString() + " times!")
    }
});

client.on('messageDelete', async msgDelete => {
    if (msgDelete.author.bot) return;
    const author = msgDelete.author;
    const content = msgDelete.content;
    const channel = msgDelete.channel;
    const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setDescription('**Message sent by <@' + author.id + '> deleted in <#' + channel.id + '>** \n ' + content)
        .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
        .setTimestamp()
        .setFooter({text: 'Author: ' + author.id + ' | Message ID: ' + msgDelete.id});
    log_channel.send({embeds: [embed]});
});

client.on('messageDeleteBulk', async messages => {
    let pasteStr;
    messages.forEach(message => {
        const message_content = message.content;
        const message_author = message.author.username + '#' + message.author.discriminator;
        const time = message.createdTimestamp;
        const line = '\n' + message_content.toString() + ' | ' + message_author.toString() + ' | ' + time + '\n';
        pasteStr += line
    })
    const url = await PastebinClient.createPaste({
        code: pasteStr,
        expireDate: '1H',
        format: 'json',
        name: 'Purged messages ' + Date.now().toString(),
        publicity: 1
    })
    const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setDescription('**Messages purged in <#' + messages.first().channel.id + '>**\n[Read messages here](' + url.toString() + ')\nWill get deleted after 60 minutes!')
        .setTimestamp()
    log_channel.send({embeds: [embed]});
})

client.on('messageUpdate', async (oldMsg, newMsg) => {
    const oldContent = oldMsg.content;
    const newContent = newMsg.content;
    const channel = newMsg.channel;
    const author = newMsg.author;
    const embed = new MessageEmbed()
        .setColor('#ffa500')
        .setDescription('**Message edited in <#' + channel.id + '> **[Jump to Message](' + newMsg.url + ')\n**Before**\n' + oldContent + '\n**After**\n' + newContent)
        .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
        .setTimestamp()
        .setFooter({text: 'User ID: ' + author.id});
    log_channel.send({embeds: [embed]});
})

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldUsername = oldMember.nickname.toString();
    const newUsername = newMember.nickname.toString();
    const author = newMember.user;
    if (oldUsername !== newUsername) {
        const embed = new MessageEmbed()
            .setColor('#ffa000')
            .setDescription('**<@' + newMember.user.id + '> nickname changed\nBefore**\n' + oldUsername +'\n**After**\n' + newUsername)
            .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
            .setTimestamp()
            .setFooter({text: 'ID: ' + author.id})
        log_channel.send({embeds: [embed]});
    }
    if (oldMember.avatar !== newMember.avatar) {
        const embed = new MessageEmbed()
            .setColor('#ffa000')
            .setDescription('**<@' + newMember.user.id + '> avatar changed**')
            .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
            .setTimestamp()
            .setFooter({text: 'ID: ' + author.id})
            .setImage(newMember.displayAvatarURL())
            .setThumbnail(newMember.displayAvatarURL())
        log_channel.send({embeds: [embed]});
    }
})

client.on('messageCreate', async message => {
    if (message.content.toLowerCase().includes('damn')) {
        const damn_counter_cache = damn_counter.get('user:' + message.author.id);
        damn_counter.set('user:' + message.author.id, damn_counter_cache + 1)
        damn_counter.save()
    }
})
client.login(token).then();