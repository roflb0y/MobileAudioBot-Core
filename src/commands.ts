import { SlashCommandBuilder } from "discord.js";

export const configCommand = new SlashCommandBuilder()
		.setName('config')
		.setDescription('Lets you to change bot config on this server')
        .addStringOption(option => 
            option.setName("language")
                .setDescription("Bot language")
                .setRequired(false)
                .addChoices(
                    { "name": "Русский", "value": "ru" },
                    { "name": "English", "value": "en" }
                )
            )
        .addBooleanOption(option => 
            option
                .setName("autoconversion")
                .setDescription("Automatic conversion of all audio files sent to this channel")
)
        
export const helpCommand = new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows how to use the bot as long with some info")

export const subscribeCommand = new SlashCommandBuilder()
        .setName("subscribe")
        .setDescription("Shows some info about the paid subscription")

export const giftCommand = new SlashCommandBuilder()
        .setName("gift")
        .setDescription("Gift subscriptions lessgo")
        .addSubcommand(subcommand => 
            subcommand
                .setName("activate")
                .setDescription("Activate a gift subscription on current server"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("deactivate")
                .setDescription("Deactivate the gift subscription on current server"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("List all servers that you have gifted the subscription to"))