require('dotenv').config()

const { Client , Intents , MessageEmbed , MessageActionRow , MessageButton , MessageSelectMenu , MessageAttachment } = require("discord.js");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES
    ]
});

require('./database/connect');
const ticketModel = require('./database/models/ticket');
const ticketCounterModel = require('./database/models/ticketCounter');

const Reply = require('./assets/replies');
const Emoji = require('./assets/emojis');

const { prefix , adminsRole , designsCategory , programmingCategory , supportCategory , designersRole , programmersRole , supportRole , closedDesignsCategory , closedProgrammingCategory , closedSupportCategory } = require('./config.json');
const allAccessRoles = [adminsRole , designersRole , programmersRole , supportRole];


client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + "tickets")) {
        if (!message.guild) return;
        if (!message.member.roles.cache.has(adminsRole)) return;
        message.delete();
        let embed = new MessageEmbed()
            .setTitle("التكتات")
            .setDescription("اختار اللذي تريده من القائمه الاتيه")
            .setTimestamp()
            .setFooter({
                text: message.guild.name,
                iconURL: message.guild.iconURL()
            })
            .setAuthor({
                name: message.guild.name,
                iconURL: message.guild.iconURL()
            })
        let ordersRow = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('ordersRow')
                .setPlaceholder('Choose Something')
                .addOptions([
                    {
                        label: 'تـذكرة تـصميـم',
                        value: 'designs_value',
                        emoji: '🎨'
                    },
                    {
                        label: 'تـذكرة بـرمجـة',
                        value: 'programming_value',
                        emoji: '🛠️'
                    },
                    {
                        label: 'تـذكرة دعـم فـني',
                        value: 'support_value',
                        emoji: '📩'
                    }
                ]),
        );
        await message.channel.send({embeds: [embed], components: [ordersRow]});
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isSelectMenu()) return;
    if (interaction.customId === 'ordersRow') {
        let ticketData = await ticketModel.findOne({ userID: interaction.user.id });
        let replacement = interaction.values[0].replace('_value', '');
        if (ticketData) {
            if (ticketData.order === replacement) {
                if (ticketData.closed === false) { 
                    return interaction.reply({ content: `${Emoji.Warning} ${Reply.youHaveAticket} <#${ticketData.channelID}>`, ephemeral: true });
                }
            }
        }
        await interaction.reply({ content: `${Emoji.Loading} ${Reply.creatingTicket}`, ephemeral: true });
        let ticketCounterData = await ticketCounterModel.findOne({ type: replacement });
        if (ticketCounterData) {
            ticketCounterData.counter++;
            await ticketCounterData.save();
        } else {
            let newTicketCounter = new ticketCounterModel({
                type: replacement,
                counter: 0
            });
            await newTicketCounter.save();
            ticketCounterData = await ticketCounterModel.findOne({ type: replacement });
        }
        let ticketNumber = ticketCounterData.counter.toString().padStart(3, '0');
        let roleGetter = [];
        let categoryGetter = [];
        let ticketName = [];
        if (replacement === 'designs') {
            roleGetter.push(designersRole);
            categoryGetter.push(designsCategory);
            ticketName.push(`orderD-${ticketNumber}`);
        } else if (replacement === 'programming') {
            roleGetter.push(programmersRole);
            categoryGetter.push(programmingCategory);
            ticketName.push(`orderP-${ticketNumber}`);
        } else if (replacement === 'support') {
            roleGetter.push(supportRole);
            categoryGetter.push(supportCategory);
            ticketName.push(`support-${ticketNumber}`);
        }
        let embed = new MessageEmbed()
            .setDescription(`الكلام`)
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setFooter({
                text: interaction.guild.name,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
            let actionRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('cliamButton')
                    .setLabel('Claim')
                    .setStyle('SUCCESS')
            )
            .addComponents(
                new MessageButton()
                    .setCustomId('closeButton')
                    .setLabel('Close')
                    .setStyle('DANGER')
            );
            await interaction.guild.channels.create(ticketName.toString(), {
                type: 'GUILD_TEXT',
                parent: categoryGetter.toString(),
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: ['VIEW_CHANNEL']
                    },
                    {
                        id: interaction.user.id,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                    },
                    {
                        id: roleGetter.toString(),
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
                    }
                ]
            }).then(async (channel) => {
                await channel.send({content: `${interaction.user} <@&${roleGetter.toString()}>` , embeds: [embed] , components: [actionRow]}).then(async (msg) => {
                    msg.pin();
                });
                await ticketModel.create({
                    userID: interaction.user.id,
                    channelID: channel.id,
                    order: replacement,
                    role: roleGetter.toString(),
                    category: categoryGetter.toString(),
                    closed: false
                });
                await interaction.editReply({ content: `${Emoji.Success} ${Reply.ticketCreated} ${channel}`, ephemeral: true });
                if (replacement === 'designs') {
                    channel.send(`Nights Group is New Look 
-
اســم الــســيــرفــر :-
-
نــوع الــطــلــب :-
-
الاوان :-
-
في حال لديك مثال يرجى ارفاقه في التذكرة لتسهيل فكرة التصميم 
${interaction.user}`);
                } else if (replacement === 'programming') {
                    channel.send(`Nights Group is New Look 
-
اســم الــســيــرفــر :-
-
نــوع الــطــلــب :-
-
الــمــبــرمــج الــمــطــلــوب :- 
${interaction.user}`);
                }
            });
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'cliamButton') {
        if (!interaction.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return interaction.reply({ content: `${Emoji.Warning} ${Reply.noAccess}`, ephemeral: true });
        let ticketData = await ticketModel.findOne({ channelID: interaction.channel.id });
        if (!ticketData) return interaction.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}`, ephemeral: true });
        if (ticketData.closed === true) return interaction.reply({ content: `${Emoji.Error} ${Reply.cantClaimWhenClosed}`, ephemeral: true });
        if (ticketData.cliamedBy) return interaction.reply({ content: `${Emoji.Error} ${Reply.alreadyClaimed} ${ticketData.userID}`, ephemeral: true });
        await interaction.reply({ content: `${Emoji.Success} ${Reply.claimedSuccessfully}`, ephemeral: true });
        await ticketModel.findOneAndUpdate({ channelID: interaction.channel.id }, { cliamedBy: interaction.user.id });
        let embed = new MessageEmbed()
            .setDescription(`${interaction.user} استلم التذكرة`)
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setFooter({
                text: interaction.guild.name,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        await interaction.channel.send({ embeds: [embed] });
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'closeButton') {
        if (!interaction.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return interaction.reply({ content: `${Emoji.Warning} ${Reply.noAccess}`, ephemeral: true });
        let ticketData = await ticketModel.findOne({ channelID: interaction.channel.id });
        if (!ticketData) return interaction.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}`, ephemeral: true });
        if (ticketData.closed === true) return interaction.reply({ content: `${Emoji.Error} ${Reply.alreadyClosed}`, ephemeral: true });
        let closedCategoryGetter = [];
        if (ticketData.order === 'designs') {
            closedCategoryGetter.push(closedDesignsCategory);
        } else if (ticketData.order === 'programming') {
            closedCategoryGetter.push(closedProgrammingCategory);
        } else if (ticketData.order === 'support') {
            closedCategoryGetter.push(closedSupportCategory);
        }
        await interaction.channel.edit({
            parent: closedCategoryGetter.toString(),
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.userID,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.role,
                    deny: ['VIEW_CHANNEL']
                }
            ]
        })
        await interaction.reply({ content: `${Emoji.Success} ${Reply.closedSuccessfully}`, ephemeral: true });
        await ticketModel.findOneAndUpdate({ channelID: interaction.channel.id }, { closed: true });
        let embed = new MessageEmbed()
            .setDescription(`${interaction.user} اغلق التذكرة`)
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setFooter({
                text: interaction.guild.name,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
            let actionRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('ReopenButton')
                    .setLabel('Reopen')
                    .setStyle('SUCCESS')
            )
            .addComponents(
                new MessageButton()
                    .setCustomId('DeleteButton')
                    .setLabel('Delete')
                    .setStyle('DANGER')
            )
        await interaction.channel.send({ embeds: [embed], components: [actionRow] });
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'ReopenButton') {
        if (!interaction.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return interaction.reply({ content: `${Emoji.Warning} ${Reply.noAccess}`, ephemeral: true });
        let ticketData = await ticketModel.findOne({ channelID: interaction.channel.id });
        if (!ticketData) return interaction.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}`, ephemeral: true });
        if (ticketData.closed === false) return interaction.reply({ content: `${Emoji.Error} ${Reply.alreadyOpen}`, ephemeral: true });
        await interaction.channel.edit({
            parent: ticketData.category,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.userID,
                    allow: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.role,
                    allow: ['VIEW_CHANNEL']
                }
            ]
        })
        await interaction.reply({ content: `${Emoji.Success} ${Reply.reopenedSuccessfully}`, ephemeral: true });
        await ticketModel.findOneAndUpdate({ channelID: interaction.channel.id }, { closed: false });
        let embed = new MessageEmbed()
            .setDescription(`${interaction.user} اعاد فتح التذكرة`)
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setFooter({
                text: interaction.guild.name,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        await interaction.channel.send({ embeds: [embed] });
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'DeleteButton') {
        if (!interaction.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return interaction.reply({ content: `${Emoji.Warning} ${Reply.noAccess}`, ephemeral: true });
        let ticketData = await ticketModel.findOne({ channelID: interaction.channel.id });
        if (!ticketData) return interaction.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}`, ephemeral: true });
        await interaction.channel.send({ content: `${Emoji.Warning} ${Reply.deletingTicket}` });
        await ticketModel.findOneAndDelete({ channelID: interaction.channel.id });
        setTimeout(async () => {
            await interaction.channel.delete();
        }, 5000);
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'rename')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return message.reply({ content: `${Emoji.Warning} ${Reply.noAccess}` });
        let ticketData = await ticketModel.findOne({ channelID: message.channel.id });
        if (!ticketData) return message.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}` });
        let newName = message.content.split(' ').slice(1).join(' ');
        if (!newName) return message.reply({ content: `${Emoji.Error} ${Reply.noNewName}` });
        await message.channel.setName(newName);
        await message.reply({ content: `${Emoji.Success} ${Reply.renamedSuccessfully}` });
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'add')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return message.reply({ content: `${Emoji.Warning} ${Reply.noAccess}` });
        let ticketData = await ticketModel.findOne({ channelID: message.channel.id });
        if (!ticketData) return message.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}` });
        let member = message.mentions.members.first() || message.guild.members.cache.get(message.content.split(' ')[1]);
        if (!member) return message.reply({ content: `${Emoji.Error} ${Reply.noMemberFound}` });
        if (member.id === message.guild.ownerId) return message.reply({ content: `${Emoji.Error} ${Reply.cantAddOwner}` });
        await message.channel.permissionOverwrites.create(member, {
            VIEW_CHANNEL: true,
            SEND_MESSAGES: true,
        });
        await message.reply({ content: `${Emoji.Success} ${Reply.addedSuccessfully}` });
        let embed = new MessageEmbed()
            .setDescription(`${message.author} اضاف ${member} الى التذكرة`)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            })
            .setFooter({
                text: message.guild.name,
                iconURL: message.guild.iconURL()
            })
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'remove')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return message.reply({ content: `${Emoji.Warning} ${Reply.noAccess}` });
        let ticketData = await ticketModel.findOne({ channelID: message.channel.id });
        if (!ticketData) return message.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}` });
        let member = message.mentions.members.first() || message.guild.members.cache.get(message.content.split(' ')[1]);
        if (!member) return message.reply({ content: `${Emoji.Error} ${Reply.noMemberFound}` });
        await message.channel.permissionOverwrites.delete(member).catch(() => { });
        await message.reply({ content: `${Emoji.Success} ${Reply.removedSuccessfully}` });
        let embed = new MessageEmbed()
            .setDescription(`${message.author} اخرج ${member} من هذه التذكرة`)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            })
            .setFooter({
                text: message.guild.name,
                iconURL: message.guild.iconURL()
            })
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'claim')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return message.reply({ content: `${Emoji.Warning} ${Reply.noAccess}` });
        let ticketData = await ticketModel.findOne({ channelID: message.channel.id });
        if (!ticketData) return message.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}` });
        if (ticketData.closed === true) return message.reply({ content: `${Emoji.Error} ${Reply.cantClaimWhenClosed}` });
        if (ticketData.cliamedBy) return message.reply({ content: `${Emoji.Error} ${Reply.alreadyClaimed} ${ticketData.userID}` });
        await ticketModel.findOneAndUpdate({ channelID: message.channel.id }, { claimedBy: message.author.id });
        await message.reply({ content: `${Emoji.Success} ${Reply.claimedSuccessfully}` });
        let embed = new MessageEmbed()
            .setDescription(`${message.author} استلم التذكرة`)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            })
            .setFooter({
                text: message.guild.name,
                iconURL: message.guild.iconURL()
            })
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'close')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return message.reply({ content: `${Emoji.Warning} ${Reply.noAccess}` });
        let ticketData = await ticketModel.findOne({ channelID: message.channel.id });
        if (!ticketData) return message.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}` });
        if (ticketData.closed === true) return message.reply({ content: `${Emoji.Error} ${Reply.alreadyClosed}` });
        let closedCategoryGetter = [];
        if (ticketData.order === 'designs') {
            closedCategoryGetter.push(closedDesignsCategory);
        } else if (ticketData.order === 'programming') {
            closedCategoryGetter.push(closedProgrammingCategory);
        } else if (ticketData.order === 'support') {
            closedCategoryGetter.push(closedSupportCategory);
        }
        await message.channel.edit({
            parent: closedCategoryGetter.toString(),
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.userID,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.role,
                    deny: ['VIEW_CHANNEL']
                }
            ]
        });
        await ticketModel.findOneAndUpdate({ channelID: message.channel.id }, { closed: true });
        await message.reply({ content: `${Emoji.Success} ${Reply.closedSuccessfully}` });
        let embed = new MessageEmbed()
            .setDescription(`${message.author} اغلق التذكرة`)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            })
            .setFooter({
                text: message.guild.name,
                iconURL: message.guild.iconURL()
            })
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'reopen')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return message.reply({ content: `${Emoji.Warning} ${Reply.noAccess}` });
        let ticketData = await ticketModel.findOne({ channelID: message.channel.id });
        if (!ticketData) return message.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}` });
        if (ticketData.closed === false) return message.reply({ content: `${Emoji.Error} ${Reply.alreadyOpen}` });
        await message.channel.edit({
            parent: ticketData.category,
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone,
                    deny: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.userID,
                    allow: ['VIEW_CHANNEL']
                },
                {
                    id: ticketData.role,
                    allow: ['VIEW_CHANNEL']
                }
            ]
        })
        await message.reply({ content: `${Emoji.Success} ${Reply.reopenedSuccessfully}` });
        await ticketModel.findOneAndUpdate({ channelID: message.channel.id }, { closed: false });
        let embed = new MessageEmbed()
            .setDescription(`${message.author} اعاد فتح التذكرة`)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL()
            })
            .setFooter({
                text: message.guild.name,
                iconURL: message.guild.iconURL()
            })
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'delete')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.some(r => allAccessRoles.includes(r.id))) return message.reply({ content: `${Emoji.Warning} ${Reply.noAccess}` });
        let ticketData = await ticketModel.findOne({ channelID: message.channel.id });
        if (!ticketData) return message.reply({ content: `${Emoji.Error} ${Reply.noTicketFound}` });
        await message.channel.send({ content: `${Emoji.Warning} ${Reply.deletingTicket}` });
        await ticketModel.findOneAndDelete({ channelID: message.channel.id });
        setTimeout(async () => {
            await message.channel.delete();
        }, 5000);
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(prefix + 'prices')) {
        if (!message.guild) return;
        if (!message.member.roles.cache.has(adminsRole)) return;
        message.delete();        
        let embed = new MessageEmbed()
        .setTitle("الاسعار")
        .setDescription(" **__اسـعـار الـتصـاميم و الـبـرمجـه الأنـفـراديـة __** :ng~1:")
        .setTimestamp()
        .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL()
        })
        .setAuthor({
            name: message.guild.name,
            iconURL: message.guild.iconURL()
        })
        
        let pricesRow = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId('pricesRow')
                .setPlaceholder('Choose Something')
                .addOptions([
                    {
                        label: 'Price Design and dev',
                        value: 'priceDesignAndDev',
                        // emoji: ''
                    },
                    {
                        label: 'price package',
                        value: 'pricePackage',
                        // emoji: ''
                    },
                ]),
        );
        message.channel.send({ embeds: [embed], components: [pricesRow] });
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isSelectMenu()) return;
    if (interaction.customId === 'pricesRow') {
        if (interaction.values[0] === 'priceDesignAndDev') {
            await interaction.reply({content:`**__:ng~1: قـائـمـة الأسـعـار لـخدمـة الـتـصـمـيـم :-__**

||-|| **رسـم رقـمـي أو انـمـي = 14.99$**
\`-\`
||-|| **لـوقـو مـرسوم = 19.99$** 
\`-\`
||-|| **لـوقـو أحـــرف = 9.99$** 
\`-\`
||-|| **تـحريـك أحـــرف = 16.99$**
\`-\`
||-|| **تـحريـك احـتـرفـي = 6.99$**
\`-\`
||-|| **تـحريـك اكـسـتـرا = 14.99$**
\`-\`
||-||** بـنـر فـايف ام = 2.99$**
\`-\`
||-||** بـنـر فـايف ام مـتـحرك = 4.99$**
\`-\`
||-|| **لـودينق سـكريـن = 24.99$**
\`-\`
||-|| **خـلـفـية جـوال = 2.99$**
\`-\`
||-|| **خـلـفـية جـوال مـتحرك = 3.99$**
\`-\`
||-||** بـنـر تـحـمـيـل = 4.99$**
\`-\`
||-|| **قـائـمة رقـصـات = 2.99$**
\`-\`
||-|| **قـائـمة رقـصـات مـتحركـه = 4.99$**
\`-\`
||-|| **قـائـمة مـنـيو مـتحركـه = 4.99$**
\`-\`
||-|| **3 اعـلانـات مـتحركـه = 4.99$**
\`-\`
||-|| **باك قرواند ديسكتوب = 4.99$$**
\`-\`
||-|| **اطـار خريـطـة = 2.99$**
\`-\`
||-|| **راديـو فـايف ام = 4.99$**
\`-\`
||-||  **2 حـزم مـتـحركـه = 9.99$**
\`-\`
||-||** بـنـر ديـسـكورد = 2.99$**
\`-\`
||-|| **قـائمة قـوانيـن = 2.99$**
\`-\`
||-|| **هـوية لاعـب = 2.99$**
\`-\`
||-|| **فـاصل ديسـكورد = 1.99$**
\`-\`
||-|| **تـرحيب ديسـكورد = 2.99$**
\`-\`

||-|| **خـدمـة الـبـرمجـه الـسـعر مـحدد مـن المـبرمـج  :5_:**` , ephemeral: true});
        } else if (interaction.values[0] === 'pricePackage') {
            await interaction.reply({content:`ملاحظة : بكج ال cfw يوجد معاه 2 باقات اختياريه
بكج ال magic يوجد معاه 4 باقات متحركه اختيارية
بكج ال legendary 6 باقات متحركه اختيارية  :ng: 

للطلب توجه الى :- #↬・📩〢لـلشراء-اولاستفسـار :discordgg93:` , ephemeral: true});
        }
    }
});

client.on("messageCreate" , async (message) => {
    if (message.content.startsWith(prefix + "say")) {
        if (!message.guild) return;
        if (!message.member.roles.cache.has(adminsRole)) return;
        let args = message.content.split(" ").slice(1);
        let say = args.join(" ");
        if (!say) return message.reply("يجب كتابة الرسالة");
        message.delete();
        message.channel.send({content: `${say}`});
    }
});

client.on("messageCreate" , async (message) => {
    if (message.content.startsWith(prefix + "emSay")) {
        if (!message.guild) return;
        if (!message.member.roles.cache.has(adminsRole)) return;
        let args = message.content.split(" ").slice(1);
        let say = args.join(" ");
        if (!say) return message.reply("يجب كتابة الرسالة");
        message.delete();
        let embed = new MessageEmbed()
        .setDescription(`${say}`)
        .setThumbnail(message.guild.iconURL({format: "png"}))
        .setAuthor({
            name: message.guild.name,
            iconURL: message.guild.iconURL()
        })
        .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL()
        })
        .setTimestamp();
        message.channel.send({embeds: [embed]});
    }
});

client.on("messageCreate" , async (message) => {
    if (message.content === "السلام عليكم") {
        if (!message.guild) return;
        let ticketData = await ticketModel.findOne({channelID: message.channel.id});
        if (!ticketData) return;
        let embed = new MessageEmbed()
        .setDescription(`وعليكم السلام
يرجى عدم الاكتفاء بسلام و ملئ الاستبيان
`);
        message.reply({embeds: [embed]});
    }
});

client.on("guildMemberAdd", async (member) => {
    if (member.user.bot) return;
    await member.send({content: `> **__> **🌹 اهلاً وسهلاً بك في متجر نايت قروب نتمنى لك يوماً مليئ بـ السعادة** __**`}).catch(() => {});
});

client.on("ready", () => {
    console.log(`Logged in as [ ${client.user.tag} ]`);
});

client.login(process.env.token);