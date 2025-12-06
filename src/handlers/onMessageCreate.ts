import { Events, PermissionsBitField, TextChannel } from "discord.js";
import { client } from "../client";
import * as db from "../database/database";
import * as utils from "../utils/utils";
import * as config from "../config";
import * as log from "../utils/logger";
import * as workers from "../services/workers";
import * as curProcesses from "../utils/curProcesses";

//let notificationIntervals: { [key: string]: number } = {};

log.info("Initialized MessageCreate handler");

client.on(Events.MessageCreate, async (message) => {
    if (!message.guild) return;
    if (!client.user) return;

    const server = await db.addServer(
        message.guild.id,
        message.guild.name,
        message.guild.memberCount
    );
    const isChannelAutoconvertable = await db.isChannelAutoconvertable(message.channel.id);

    const isUserSub = await db.getSubscriber(message.author.id);

    const hasGiftedSub = !!server.giftSubActivatedBy;

    //log.info(JSON.stringify(server));
    //log.info("is gifter on server: " + isGifterOnServer);
    //log.info(hasGiftedSub);

    if (message.author.bot) return;
    if (
        message.content.includes("@here") ||
        message.content.includes("@everyone")
    )
        return;
    if (
        !message.guild.members.me
            ?.permissionsIn(message.channel as TextChannel)
            .has(PermissionsBitField.Flags.SendMessages)
    )
        return;

    //console.log(message);
    if (
        (message.content.includes(client.user.id) && message.reference) ||
        (isChannelAutoconvertable &&
            message.attachments.size > 0 &&
            !message.content.includes(client.user.id)) ||
        (isChannelAutoconvertable &&
            message.reference &&
            message.content.includes(client.user.id))
    ) {
        const lang = await server.getLang();

        const ownerSubData = await db.getSubscriber(message.guild.ownerId);

        const isOwnerSub = ownerSubData ? ownerSubData.level === 2 : false;
        let isSubscriber = isUserSub !== undefined || hasGiftedSub || isOwnerSub;

        if (
            !message.guild.members.me
                ?.permissionsIn(message.channel as TextChannel)
                .has(PermissionsBitField.Flags.AttachFiles)
        ) {
            await message.reply(lang.cant_upload);
            return;
        }

        let msgReference;
        let isAutoconversion = isChannelAutoconvertable;

        let msg = message;

        if (message.reference) msgReference = await message.fetchReference();

        if (isChannelAutoconvertable && message.attachments.size > 0)
            msg = message;
        else if (msgReference && msgReference.attachments.size > 0) {
            msg = msgReference;
            isAutoconversion = false;
        } else return;

        if (curProcesses.isProcessing(msg.id)) {
            await message.reply(lang.currently_processing);
            return;
        }
        curProcesses.add(msg.id);

        if (msg.attachments) {
            const audioFiles = utils.getAudioFiles(msg.attachments);
            if (audioFiles.length === 0) {
                if (!isAutoconversion) await msg.reply(lang.unsupported_files);
                curProcesses.remove(msg.id);

                return;
            }

            const files = await utils.downloadFiles(audioFiles);

            let filteredFiles;
            if (isSubscriber) {
                filteredFiles = files.filter(
                    (item) => item.duration < config.SUB_LENGTH_LIMIT * 60
                );
            } else {
                filteredFiles = files.filter(
                    (item) => item.duration < config.FREE_LENGTH_LIMIT * 60
                );
            }

            if (filteredFiles.length < files.length) {
                try {
                    await msg.reply(
                        `${
                            isSubscriber
                                ? lang.long_files_sub
                                : lang.long_files_free
                        } ${
                            filteredFiles.length > 0
                                ? lang.not_all_files_will_be_converted
                                : ""
                        }`
                    );
                    if (filteredFiles.length === 0) {
                        curProcesses.remove(msg.id);
                        utils.deleteFiles(files.map((item) => item.filename));
                        return;
                    }
                } catch { 
                    curProcesses.remove(msg.id);
                    utils.deleteFiles(files.map((item) => item.filename)); 
                }
            }

            if (!msg.guild) return;

            const bestWorker = await workers.getBestWorker();
            if (!bestWorker) {
                await message.reply(lang.currently_down);
                utils.deleteFiles(files.map((item) => item.filename));
                curProcesses.remove(msg.id);

                return;
            }

            log.info(`Best worker: ${bestWorker.ip} | curProcesses: ${bestWorker.curProcesses}`);

            if (!isSubscriber) {
                log.process(`Waiting ${config.FREE_CONVERT_DELAY}s`); // yes this delay is artificial :)
                await utils.sleep(config.FREE_CONVERT_DELAY);
            } else {
                log.process("Subscription found");
            }

            const processedFilenames = await bestWorker.startProcess({
                files: filteredFiles,
                serverId: msg.guild.id,
                channelId: msg.channel.id,
                messageId: msg.id,
                bitrateParams: { 
                    bitrateFree: config.FREE_AUDIO_BITRATE,
                    bitrateSub: config.SUB_AUDIO_BITRATE
                },
                isSubscriber: isSubscriber
            });

            const filepaths = processedFilenames.map(filename => "files/" + filename);

            try {
                await msg.reply({
                    files: filepaths,
                    allowedMentions: { users: [] },
                });
    
                log.info(`Uploaded ${processedFilenames.length} file(s) to server "${msg.guild.name}"`);
            } catch (error) {
                try {
                    log.error(`Missing permissions. ${error}`);
                    await msg.reply(lang.upload_failed);
                } catch {
                    log.error(
                        "пхаха бля ктото запретил отправлять сообщения впринципе))"
                        );
                    }
            }

            utils.deleteFiles(filepaths);
            utils.deleteFiles(files.map((item) => item.filename));

            curProcesses.remove(msg.id);

            /*
            const videoFilenames = await converter.processVideos(
                message.guild.id,
                filteredFiles,
                isSubscriber
            );
            */

        //     try {
        //         let notification;
        //         if (!isSubscriber) {
        //             notification = lang.subscribe_notification;
        //         } else {
        //             //notificationIntervals[msg.channelId] = 1;
        //         }

        //         notification = undefined;

        //         await msg.reply({
        //             files: videoFilenames,
        //             content: notification,
        //             allowedMentions: { users: [] },
        //         });

        //         log.info(
        //             `Uploaded to discord. Server name: ${message.guild.name}\n`
        //         );
        //     } catch (error) {
        //         try {
        //             log.error(`Missing permissions. ${error}`);
        //             await msg.reply(lang.upload_failed);
        //         } catch {
        //             log.error(
        //                 "пхаха бля ктото запретил отправлять сообщения впринципе))"
        //             );
        //         }
        //     }

        //     //utils.deleteFiles(videoFilenames);
        //     //utils.deleteFiles(files.map((item) => item.filename));

        //     const index = processing_currently.indexOf(msg.id);
        //     if (index !== -1) {
        //         processing_currently.splice(index, 1);
        //     }
        }
    }
});