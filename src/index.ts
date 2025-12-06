import { ShardingManager } from "discord.js";
import * as config from "./config";
import * as db from "./database/database";
import * as log from "./utils/logger";
import * as utils from "./utils/utils";
import mongoose from "mongoose";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const args = require("args-parser")(process.argv);
const manager = new ShardingManager("dist/bot.js", {
    token: args.dev ? config.DEV_TOKEN : config.BOT_TOKEN,
});

console.log(args)

import "./services/api/server";

manager.on("shardCreate", async (shard) => {
    const admins = await db.getAdmins();
    log.info(
        `Admins: ${admins
            .map((admin) => `${admin.name} (${admin.userId})`)
            .join(" | ")}`
    );

    if (!args.dev) {
        admins.forEach((admin) =>
            utils.sendTGlog(
                admin.userId,
                `MobileAudioBot restarted. Shard ${shard.id}`
            )
        );
    }
    log.info(`LAUNCHED SHARD ${shard.id}`);
});

mongoose
    .connect(config.MONGODB_URI, {
        user: config.MONGODB_USER,
        pass: config.MONGODB_PASSWORD,
        dbName: config.MONGODB_DB,
    })
    .then(() => {
        manager.spawn();
    });
