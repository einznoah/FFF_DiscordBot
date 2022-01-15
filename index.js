const {Client, Intents, MessageEmbed} = require('discord.js');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_INVITES]})
const {token, log_channel_id, guild_id, PASTEBIN_API_KEY} = require('./config.json');
const PasteClient = require('pastebin-api').default;
const damn_counter = require('nconf');
damn_counter.file({file: './damn_counter.json'});
const PastebinClient = new PasteClient(PASTEBIN_API_KEY);
const wait = require("timers/promises").setTimeout;
const invites = new Map();
let log_channel;
let guild;

client.on('ready', async () => {
    await wait(1000);
    console.log(`Logged in as ${client.user.tag}!`);
    log_channel = client.channels.cache.find(channel => channel.id === log_channel_id);
    guild = client.guilds.cache.get(guild_id);
    guild.members.fetch().then(() => console.log('Finished updating members!'))
    const firstInvites = await guild.invites.fetch();
    invites.set(guild.id, new Map(firstInvites.map((invite) => [invite.code, invite.uses])));
})

// interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (interaction.commandName === 'damncounter') {
        const user = interaction.options.getUser('user');
        const counter = damn_counter.get('user:' + user.id);
        await interaction.reply(user.username + " said damn " + counter.toString() + " times!")
    }
});


// messages
client.on('messageCreate', async message => {
    if (message.content.toLowerCase().includes('damn')) {
        const damn_counter_cache = damn_counter.get('user:' + message.author.id);
        damn_counter.set('user:' + message.author.id, damn_counter_cache + 1)
        damn_counter.save()
    }
})

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
        expireDate: '1D',
        format: 'json',
        name: 'Purged messages ' + Date.now().toString(),
        publicity: 1
    })
    const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setDescription('**Messages purged in <#' + messages.first().channel.id + '>**\n[Read messages here](' + url.toString() + ')\nWill get deleted after 1 Day!')
        .setTimestamp()
    log_channel.send({embeds: [embed]});
})

client.on('messageUpdate', async (oldMsg, newMsg) => {
    const oldContent = oldMsg.content;
    const newContent = newMsg.content;
    if (oldContent === newContent) return;
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

// members
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldUsername = oldMember.nickname.toString();
    const newUsername = newMember.nickname.toString();
    const author = newMember.user;
    if (oldUsername !== newUsername) {
        const embed = new MessageEmbed()
            .setColor('#ffa000')
            .setDescription('**<@' + newMember.user.id + '> nickname changed\nBefore**\n' + oldUsername + '\n**After**\n' + newUsername)
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

client.on('guildMemberRemove', async member => {
    const member_username = member.user.username;
    const member_discriminator = member.user.discriminator;
    const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setDescription('**Member left**\n<@' + member.user.id + '> ' + member_username + '#' + member_discriminator)
        .setTimestamp()
        .setFooter({text: 'ID: ' + member.user.id});
    log_channel.send({embeds: [embed]});
});

client.on('guildMemberAdd', async member => {
    const member_user = member.user;
    const avatar = member_user.avatarURL();
    const account_age = '' + member_user.createdAt + '';
    let embed;
    const newInvites = await member.guild.invites.fetch().then()
    const oldInvites = invites.get(guild_id);
    const invite = newInvites.find(i => i.uses > oldInvites.get(i.code))
    if (invite === undefined) {
        embed = new MessageEmbed()
            .setColor('#90ee90')
            .setDescription('<@' + member_user.id + '> ' + member_user.username + '#' + member_user.discriminator + '\n**Account created**\n' + account_age + '\n**Could not find used invite!**')
            .setTimestamp()
            .setFooter({text: 'ID: ' + member_user.id})
            .setImage(avatar)
            .setAuthor({name: 'Member joined', iconURL: avatar})
    } else {
        embed = new MessageEmbed()
            .setColor('#90ee90')
            .setDescription('<@' + member_user.id + '> ' + member_user.username + '#' + member_user.discriminator + '\n**Account created**\n' + account_age + '\n**Used invite**\n' + invite.code + ' by ' + invite.inviter.username + '#' + invite.inviter.discriminator)
            .setTimestamp()
            .setFooter({text: 'ID: ' + member_user.id})
            .setImage(avatar)
            .setAuthor({name: 'Member joined', iconURL: avatar})
    }
    log_channel.send({embeds: [embed]});
})

// invites
client.on('inviteCreate', async invite => {
    invites.get(invite.guild.id).set(invite.code, invite.uses);
    console.log('Added invite ' + invite.code);
})

client.on('inviteDelete', async invite => {
    invites.get(invite.guild.id).delete(invite.code);
    console.log('Removed invite ' + invite.code);
})

client.login(token).then();