import {
    ActionRowBuilder,
    EmbedBuilder,
    Events,
    PermissionsBitField,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from "discord.js";
import { client } from "../client";
import * as db from "../database/database";
import * as config from "../config";
import * as log from "../utils/logger";

log.info("Initialized InteractionCreate handler");

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction || !interaction.guild || !interaction.channel) return;

    const server = await db.addServer(
        interaction.guild.id,
        interaction.guild.name,
        interaction.guild.memberCount
    );
    //const channel = await db.addChannel(interaction.channel.id, interaction.guild.channels.cache.get(interaction.channel.id)?.name);

    const userSubscriber = await db.getSubscriber(interaction.user.id);
    const hasGiftedSub = !!server.giftSubActivatedBy;
    const ownerSubData = await db.getSubscriber(interaction.guild.ownerId);

    const isOwnerSub = ownerSubData ? ownerSubData.level === 2 : false;

    if (!interaction.isChatInputCommand()) return;

    const lang = await server.getLang();

    if (interaction.commandName === "help") {
        const replyEmbed = new EmbedBuilder()
            .setColor(0x7289da)
            .addFields({ name: "Help", value: lang.help })
            .setImage("https://i.imgur.com/sncs8FP.jpeg");

        interaction
            .reply({
                embeds: [replyEmbed],
            })
            .catch(() => {});
    }

    if (interaction.commandName === "config") {
        if (!interaction.memberPermissions) return;
        if (
            !interaction.memberPermissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            await interaction.reply({
                content: lang.no_permission,
                ephemeral: true,
            });
            return;
        }

        if (interaction.options.data.length === 0) {
            await interaction.reply({
                content: lang.no_config_arguments,
                ephemeral: true,
            });
            return;
        }

        const languageOption = interaction.options.getString("language");
        const autoconversionOption =
            interaction.options.getBoolean("autoconversion");

        let result = "New settings:";

        if (languageOption !== null) {
            await server.setLanguage(languageOption);
            result += `\nLanguage: ${languageOption}`;
        }
        if (autoconversionOption !== null) {
            if (autoconversionOption === true) {
                await db.addAutoconvertableChannel(
                    interaction.channelId,
                    interaction.guild.channels.cache.get(interaction.channel.id)
                        ?.name
                );
            } else {
                await db.removeAutoconvertableChannel(interaction.channelId);
            }
            
            result += `\nAutoconversion: ${autoconversionOption}`;
        }

        await interaction.reply(result);
    }

    if (interaction.commandName === "subscribe") {
        let subscriptionStatus = "";

        switch (userSubscriber?.level) {
            case 1: {
                subscriptionStatus += lang.individual_sub_active + "\n";
                break;
            }
            case 2: {
                subscriptionStatus += lang.community_sub_active + "\n";
                break;
            }
            default: {
                subscriptionStatus += lang.subscription_not_active + "\n";
                break;
            }
        }

        if (isOwnerSub || hasGiftedSub) {
            subscriptionStatus += lang.community_sub_server_active;
        } else {
            subscriptionStatus += lang.community_sub_server_not_active;
        }

        const replyEmbed = new EmbedBuilder().setColor(0x7289da).addFields({
            name: "Subscribe",
            value: `${lang.subscribe_help}\n${subscriptionStatus}`,
        });

        interaction
            .reply({
                embeds: [replyEmbed],
            })
            .catch(() => {});
    }

    if (interaction.commandName === "gift") {
        if (!userSubscriber || userSubscriber.level !== 2) {
            await interaction.reply({
                content: lang.need_community_sub,
                ephemeral: true,
            });
            return;
        }

        const userSubscriberGifts = await userSubscriber.getUserGiftedServers();

        if (interaction.options.getSubcommand() === "activate") {
            if (!interaction.memberPermissions) return;

            if (
                isOwnerSub &&
                interaction.user.id === interaction.guild.ownerId
            ) {
                await interaction.reply({
                    content: lang.server_subscription_active,
                });
                return;
            }

            if (interaction.user.id === server.giftSubActivatedBy) {
                await interaction.reply({
                    content: lang.gift_sub_already_active,
                    ephemeral: true,
                });
                return;
            }

            if (userSubscriberGifts.length >= config.COMMUNITY_SUB_GIFT_LIMIT) {
                await interaction.reply({
                    content: `${lang.gift_sub_limit_reached} ${userSubscriberGifts.length}/${config.COMMUNITY_SUB_GIFT_LIMIT} ${lang.servers}.`,
                    ephemeral: true,
                });
                return;
            }

            if (isOwnerSub || server.giftSubActivatedBy) {
                await interaction.reply({
                    content: lang.server_subscription_already_active,
                    ephemeral: true,
                });
                return;
            }

            await server.setGifter(interaction.user.id);
            await interaction.reply({ content: lang.you_have_gifted_sub });
        }

        if (interaction.options.getSubcommand() === "deactivate") {
            if (userSubscriberGifts.length === 0) {
                interaction.reply({
                    content: lang.no_gifted_servers,
                    ephemeral: true,
                });
                return;
            }

            const select = new StringSelectMenuBuilder()
                .setCustomId("gift_cancel_server_menu")
                .setPlaceholder(lang.choose_server);

            userSubscriberGifts.forEach((server) => {
                select.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(server.serverName)
                        .setValue(server.serverId)
                );
            });

            const row =
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    select
                );

            const response = await interaction.reply({
                content: lang.choose_server,
                components: [row],
                ephemeral: true,
            });

            try {
                const confirmation = await response.awaitMessageComponent({
                    time: 60_000,
                });
                if (confirmation.isStringSelectMenu()) {
                    const serverId = confirmation.values[0];
                    const server = await db.getServer(serverId);
                    if (!server) return;

                    await server.setGifter(null);

                    await interaction.editReply({
                        content: `${lang.gift_sub_deactivated} ${server.serverName}`,
                        components: [],
                    });
                }
            } catch {
                await interaction.editReply({
                    content: lang.choose_server_timeout,
                    components: [],
                });
            }
        }

        if (interaction.options.getSubcommand() === "list") {
            let embedText = `**${userSubscriberGifts.length} / ${config.COMMUNITY_SUB_GIFT_LIMIT}**\n`;

            if (userSubscriberGifts.length === 0) {
                embedText += lang.no_gifted_servers;
            } else {
                let c = 1;
                userSubscriberGifts.forEach((s) => {
                    embedText += `${c}. ${s.serverName}\n`;
                    c++;
                });
            }

            const replyEmbed = new EmbedBuilder()
                .setColor(0x7289da)
                .addFields({ name: lang.mygifts_cmd_header, value: embedText });

            interaction
                .reply({
                    embeds: [replyEmbed],
                    ephemeral: true,
                })
                .catch(() => {});
        }
    }
});
