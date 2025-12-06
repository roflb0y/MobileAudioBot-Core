import { ActivityType } from "discord.js";
import { client } from "../client";
import * as log from "../utils/logger";
import * as commands from "../commands";

function updateRPC() {
    client.user?.setPresence({
        activities: [{ name: "/subscribe", type: ActivityType.Playing }],
        status: "online",
    });
}

log.info("Initialized onReady handler");


client.on("ready", async (сlient) => {
    if (!client.user || !client.application) return;
    log.info(`Logged as ${сlient.user.tag}`);

    //const slashCommands = await client.application.commands.fetch();
    //slashCommands.forEach(async cmd => await client.application?.commands.delete(cmd.id));

    сlient.application.commands.create(commands.configCommand.toJSON());
    сlient.application.commands.create(commands.helpCommand.toJSON());
    сlient.application.commands.create(commands.subscribeCommand.toJSON());
    client.application.commands.create(commands.giftCommand.toJSON());

    log.info("Registered commands");

    updateRPC();
    setInterval(() => updateRPC(), 300000);
});