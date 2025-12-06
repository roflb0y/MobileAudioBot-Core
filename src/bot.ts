import * as config from "./config";
import * as log from "./utils/logger";
import { client } from "./client";

import mongoose from "mongoose";

const args = require("args-parser")(process.argv);
args.dev = true;
if (args.dev) log.process("RUNNING DEV MODE");

process.on("unhandledRejection", (error) => {
    log.error(`Unhandled rejection. ${error?.toString()}`);
});
process.on("uncaughtException", (error) => {
    log.error(`Uncaught exception. ${error.toString()}`);
});

import "./handlers/init";

/*
client.on(Events.GuildMemberRemove, async member => {
    const server = await db.getServer(member.guild.id);

    if (member.user.id === server.giftSubActivatedBy) {
        db.setServerSubscriptionGifter(member.guild.id, null);
    }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const server = await db.getServer(newMember.guild.id);

    if (newMember.user.id !== server.giftSubActivatedBy) return;

    if (!newMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
        db.setServerSubscriptionGifter(newMember.guild.id, null);
    }
});
*/

const TOKEN = args.dev ? config.DEV_TOKEN : config.BOT_TOKEN

mongoose.connect(config.MONGODB_URI, {
    user: config.MONGODB_USER,
    pass: config.MONGODB_PASSWORD,
    dbName: config.MONGODB_DB
})
.then(() => {
    log.info("CONNECTED TO DB. LAUNCHING BOT...")
    console.log(TOKEN)
    client.login(TOKEN);
})