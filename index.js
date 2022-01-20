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
        damn_counter.load();
        const counter = damn_counter.get('user:' + user.id);
        if (counter !== undefined) {
            await interaction.reply(user.username + " said damn " + counter.toString() + " times!")
        } else {
            await interaction.reply(user.username + " hasn't said damn yet!")
        }

    } else if (interaction.commandName === 'topdamn') {
        damn_counter.load();
        const users = JSON.stringify(damn_counter.get('user'))
        let user_dict = {};
        for (let user in JSON.parse(users)) {
            user_dict[user] = damn_counter.get('user:' + user);
        }
        let items = Object.keys(user_dict).map(function(key) {
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
                .catch(() => {
                    msg = 'An error occurred, please contact the bot developer! '
                })
        })
        await interaction.reply(msg)
    }
});


// messages
client.on('messageCreate', async message => {
    if (message.content.toLowerCase().includes('damn')) {
        if (message.author.bot) return;
        damn_counter.load();
        let damn_counter_cache = damn_counter.get('user:' + message.author.id);
        if (damn_counter_cache === null || damn_counter_cache === undefined) {
            damn_counter_cache = 0;
        }
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
    if (msgDelete.attachments.first() !== undefined) {
        const attachments = msgDelete.attachments;
        let attachment_msg = "Error occurred, please contact bot developer!";
        if (attachments.size === 1) {
            attachment_msg = attachments.first().url;
            const embed = new MessageEmbed()
                .setColor('#ff0000')
                .setDescription('**Attachment sent by <@' + author.id + '> deleted in <#' + channel.id + '>** \n ' + attachment_msg)
                .setImage(attachments.first().url)
                .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
                .setTimestamp()
                .setFooter({text: 'Author: ' + author.id + ' | Message ID: ' + msgDelete.id});
            log_channel.send({embeds: [embed]});
        } else {
            attachment_msg = '';
            attachments.each(attachment => {
                attachment_msg += attachment.url + '\n';
            })
            const embed = new MessageEmbed()
                .setColor('#ff0000')
                .setDescription('**Attachments sent by <@' + author.id + '> deleted in <#' + channel.id + '>** \n ' + attachment_msg)
                .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
                .setTimestamp()
                .setFooter({text: 'Author: ' + author.id + ' | Message ID: ' + msgDelete.id});
            log_channel.send({embeds: [embed]});
        }
    }
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
    if (oldMember === null) return;
    if (oldMember  === undefined) return;
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
})

client.on('inviteDelete', async invite => {
    invites.get(invite.guild.id).delete(invite.code);
})

client.login(token).then();