const {token, log_channel_id, guild_id, PASTEBIN_API_KEY, REDIS_PASSWORD, REDIS_ADDRESS, REDIS_PORT, REDIS_DB} = require('./config.json');
const fs = require('fs');
const PasteClient = require('pastebin-api').default;
const PastebinClient = new PasteClient(PASTEBIN_API_KEY);
const wait = require("timers/promises").setTimeout;

// Redis
const Redis = require('ioredis');
const redis = new Redis({
    port: REDIS_PORT,
    host: REDIS_ADDRESS,
    family: 4,
    password: REDIS_PASSWORD,
    db: REDIS_DB
});

// Discord
const {Client, Intents, MessageEmbed, Collection} = require('discord.js');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_INVITES, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_VOICE_STATES]})

// Command handler
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

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
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.log(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});


// messages
client.on('messageCreate', async message => {
    if (message.content.toLowerCase().includes('damn')) {
        if (message.author.bot) return;
        let damn_counter_cache = await redis.hget('users', message.author.id).then();
        if (damn_counter_cache === null || damn_counter_cache === undefined) {
            damn_counter_cache = 0;
        }
        const damn_counter_new = parseInt(damn_counter_cache) + 1;
        redis.hset('users', message.author.id, damn_counter_new);
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
    if (oldMember === undefined) return;
    const oldUsername = oldMember.nickname;
    const newUsername = newMember.nickname;
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
            .setDescription('**<@' + newMember.user.id + '> server avatar changed**')
            .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
            .setTimestamp()
            .setFooter({text: 'ID: ' + author.id})
            .setThumbnail(newMember.displayAvatarURL())
        log_channel.send({embeds: [embed]});
    }
    if (oldMember.roles !== newMember.roles) {
        const old_roles = oldMember.roles.cache;
        const new_roles = newMember.roles.cache;
        let old_roles_ids = [];
        let new_roles_ids = [];
        old_roles.each(role => {
            old_roles_ids.push(role.id)
        });
        new_roles.each(role => {
            new_roles_ids.push(role.id);
        });
        if (new_roles_ids.length > old_roles_ids.length) {
            function findAddedRole(id) {
                for (let i = 0; i < old_roles_ids.length; i++) {
                    if (id === old_roles_ids[i]) {
                        return false;
                    }
                }
                return true;
            }
            const addedRole = new_roles_ids.filter(findAddedRole);
            const addedRoleID = addedRole[0];
            const embed = new MessageEmbed()
                .setColor('#90ee90')
                .setDescription('<@' + author.id + '> **was given the <@&' + addedRoleID + '> role**')
                .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
                .setTimestamp()
                .setFooter({text: 'ID: ' + author.id})
            log_channel.send({embeds: [embed]});
        } else if (old_roles_ids > new_roles_ids) {
            function findRemovedRole(id) {
                for (let i = 0; i < new_roles_ids.length; i++) {
                    if (id === new_roles_ids[i]) {
                        return false;
                    }
                }
                return true;
            }
            const removedRole = old_roles_ids.filter(findRemovedRole);
            const removedRoleID = removedRole[0];
            const embed = new MessageEmbed()
                .setColor('#ff0000')
                .setDescription('<@' + author.id + '> **was removed from the <@&' + removedRoleID + '> role**')
                .setAuthor({name: author.username + '#' + author.discriminator, iconURL: author.avatarURL()})
                .setTimestamp()
                .setFooter({text: 'ID: ' + author.id})
            log_channel.send({embeds: [embed]});
        }
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

client.on('guildBanAdd', async ban => {
    const user = ban.user;
    const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setDescription('<@' + user.id + '> ' + user.username + '#' + user.discriminator)
        .setTimestamp()
        .setAuthor({name: 'Member Banned', iconURL: user.avatarURL()})
        .setFooter({text: 'ID: ' + user.id})
        .setThumbnail(user.avatarURL())
    log_channel.send({embeds: [embed]});
})

client.on('guildBanRemove', async unban => {
    const user = unban.user;
    const embed = new MessageEmbed()
        .setColor('#90ee90')
        .setDescription('<@' + user.id + '> ' + user.username + '#' + user.discriminator)
        .setTimestamp()
        .setAuthor({name: 'Member Unbanned', iconURL: user.avatarURL()})
        .setFooter({text: 'ID: ' + user.id})
        .setThumbnail(user.avatarURL())
    log_channel.send({embeds: [embed]});
})

// users
client.on('userUpdate', async (oldUser, newUser) => {
    const oldName = oldUser.username;
    const newName = newUser.username;
    const oldAvatar = oldUser.avatar;
    const newAvatar = newUser.avatar;
    if (oldName !== newName) {
        const embed = new MessageEmbed()
            .setColor('#ffa500')
            .setDescription('**<@' + newUser.id + '> username changed\nBefore**\n' + oldName + '\n**After**\n' + newName)
            .setTimestamp()
            .setAuthor({name: newUser.username + '#' + newUser.discriminator, iconURL: newUser.avatarURL()})
            .setTimestamp()
            .setFooter({text: 'ID: ' + newUser.id})
        log_channel.send({embeds: [embed]});
    }
    if (oldAvatar !== newAvatar) {
        const embed = new MessageEmbed()
            .setColor('#ffa500')
            .setDescription('**<@' + newUser.id + '> avatar changed**')
            .setAuthor({name: newUser.username + '#' + newUser.discriminator, iconURL: newUser.avatarURL()})
            .setTimestamp()
            .setFooter({text: 'ID: ' + newUser.id})
            .setThumbnail(newUser.displayAvatarURL())
        log_channel.send({embeds: [embed]});

    }
})

// guild roles
client.on('roleCreate', async role => {
    const name = role.name;
    const embed = new MessageEmbed()
        .setColor('#90ee90')
        .setDescription('**Role Created: ' + name + '**')
        .setTimestamp()
        .setAuthor({name: role.guild.name})
        .setFooter({text: 'ID: ' + role.id})
    log_channel.send({embeds: [embed]})
})

client.on('roleDelete', async role => {
    const name = role.name;
    const embed = new MessageEmbed()
        .setColor('#ff0000')
        .setDescription('**Role Deleted: ' + name + '**')
        .setTimestamp()
        .setAuthor({name: role.guild.name})
        .setFooter({text: 'ID: ' + role.id})
    log_channel.send({embeds: [embed]})
})

client.on('roleUpdate', async (oldRole, newRole) => {
    const old_name = oldRole.name;
    const new_name = newRole.name;
    const old_color = oldRole.hexColor;
    const new_color = newRole.hexColor;

    if (old_name !== new_name) {
        const embed = new MessageEmbed()
            .setColor('#ffa500')
            .setDescription('**Role Name Changed: ' + old_name + ' > ' + new_name + '**')
            .setTimestamp()
            .setAuthor({name: newRole.guild.name})
            .setFooter({text: 'ID: ' + newRole.id})
        log_channel.send({embeds: [embed]})
    }
    if (old_color !== new_color) {
        const embed = new MessageEmbed()
            .setColor(new_color)
            .setDescription('**Role Color Changed: ' + old_color + ' > ' + new_color + '**')
            .setTimestamp()
            .setAuthor({name: newRole.guild.name})
            .setFooter({text: 'ID: ' + newRole.id})
        log_channel.send({embeds: [embed]})
    }
})

// channels
client.on('channelCreate', async channel => {
    const embed = new MessageEmbed()
        .setColor('#90ee90')
        .setDescription('**Channel Created: #' + channel.name + '**')
        .setTimestamp()
        .setAuthor({name: channel.guild.name})
        .setFooter({text: 'ID: ' + channel.id})
    log_channel.send({embeds: [embed]})
})

client.on('channelDelete', async channel => {
    if (channel.guild !== undefined) {
        const embed = new MessageEmbed()
            .setColor('#ff0000')
            .setDescription('**Channel Deleted: #' + channel.name + '**')
            .setTimestamp()
            .setAuthor({name: channel.guild.name})
            .setFooter({text: 'ID: ' + channel.id})
        log_channel.send({embeds: [embed]})
    }
})

client.on('channelUpdate', async (oldChannel, newChannel) => {
    if (newChannel.guild !== undefined) {
        const old_name = oldChannel.name;
        const new_name = newChannel.name;

        if (old_name !== new_name) {
            const embed = new MessageEmbed()
                .setColor('#ffa500')
                .setDescription('**Channel Name Updated: #' + old_name + ' > #' + new_name + '**')
                .setTimestamp()
                .setAuthor({name: newChannel.guild.name})
                .setFooter({text: 'ID: ' + newChannel.id})
            log_channel.send({embeds: [embed]})
        }
    }
})

// voice channels
client.on('voiceStateUpdate', async (oldState, newState) => {
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    if (oldChannel === null) {
        const embed = new MessageEmbed()
            .setColor('#90ee90')
            .setDescription('**<@' + newState.member.id + '> joined voice channel <#' + newChannel.id + '>**')
            .setTimestamp()
            .setAuthor({name: newState.member.user.username + '#' + newState.member.user.discriminator, iconURL: newState.member.user.avatarURL()})
            .setFooter({text: 'ID: ' + newState.id})
        log_channel.send({embeds: [embed]})
    }
    if (newChannel === null) {
        const embed = new MessageEmbed()
            .setColor('#ff0000')
            .setDescription('**<@' + oldState.member.id + '> left voice channel <#' + oldChannel.id + '>**')
            .setTimestamp()
            .setAuthor({name: newState.member.user.username + '#' + newState.member.user.discriminator, iconURL: newState.member.user.avatarURL()})
            .setFooter({text: 'ID: ' + oldState.id})
        log_channel.send({embeds: [embed]})
    }
    if (oldChannel !== null && newChannel !== null) {
        const embed = new MessageEmbed()
            .setColor('#ffa500')
            .setDescription('**<@' + newState.member.id + '>switched voice channel: <#' + oldChannel.id + '> > <#' + newChannel.id + '>**')
            .setTimestamp()
            .setAuthor({name: newState.member.user.username + '#' + newState.member.user.discriminator, iconURL: newState.member.user.avatarURL()})
            .setFooter({text: 'ID: ' + newState.id})
        log_channel.send({embeds: [embed]})
    }
})

// invites
client.on('inviteCreate', async invite => {
    invites.get(invite.guild.id).set(invite.code, invite.uses);
})

client.on('inviteDelete', async invite => {
    invites.get(invite.guild.id).delete(invite.code);
})

client.login(token).then();