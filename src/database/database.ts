import * as log from "../utils/logger";
import * as utils from "../utils/utils";
import * as config from "../config";
import * as workers from "../services/workers";
import * as cache from "../utils/cache";

import {
    MadminsSchema,
    MchannelsSchema,
    MprocessesSchema,
    MserversSchema,
    MsubscribersSchema,
    MworkersSchema,
} from "./schemas";
import {
    DBChannelI,
    DBServerI,
    DBSubscriberI,
    WorkerI,
    Maybe,
} from "./interface";
import { RequestProcessData } from "../services/api/interface";
import { ProcessedFile } from "../utils/interface";

const args = require("args-parser")(process.argv);

const channelsCache = new cache.Channels();
//args.dev = true;

export function insertProcessesIdkLmaooo(
    processedFiles: ProcessedFile[],
    serverId: string
): void {
    processedFiles.forEach((file) => {
        new MprocessesSchema({
            serverId: serverId,
            time: file.time,
        }).save();
    });
    log.db(
        `Inserted ${processedFiles.length} process(es) for server ${serverId}`
    );
}

export async function getServer(
    serverid: string
): Promise<DBServer | undefined> {
    const server = await MserversSchema.findOne({ serverId: serverid });

    if (server === null) return undefined;
    return new DBServer(server);
}

export async function getChannel(
    channelId: string
): Promise<DBChannel | undefined> {
    const cachedChannel = channelsCache.get(channelId);
    if (cachedChannel) return new DBChannel(cachedChannel);

    const channel = await MchannelsSchema.findOne({ channelId: channelId });

    if (channel === null) return undefined;
    return new DBChannel(channel);
}

export async function addServer(
    serverId: string,
    serverName: string,
    memberCount: number
): Promise<DBServer> {
    const server = await getServer(serverId);
    if (server) {
        server.updateData(serverName, memberCount);
        return server;
    }

    const serverData: DBServerI = {
        serverId: serverId,
        serverName: serverName,
        memberCount: memberCount,
        lang: "en",
    };

    await new MserversSchema(serverData).save();

    log.db(`Added new server: ${serverName} | members: ${memberCount}`);
    utils.sendTGlog(
        config.ADMIN_ID,
        `Added new server: ${serverName} | members: ${memberCount}`
    );

    return new DBServer(serverData);
}

export async function isChannelAutoconvertable(
    channelId: string
): Promise<boolean> {
    const cachedChannel = new cache.Channels().get(channelId);
    if (cachedChannel) return cachedChannel.autoconversion;

    const isAutoconvertable = !!(await MchannelsSchema.findOne({
        channelId: channelId,
        autoconversion: true,
    }));

    return isAutoconvertable;
}

export async function addAutoconvertableChannel(
    channelId: string,
    channelName?: string
): Promise<DBChannel | false> {
    let isAutoconvertable: boolean | undefined = undefined;
    const cachedChannel = channelsCache.get(channelId);
    if (cachedChannel) isAutoconvertable = true;
    else {
        isAutoconvertable = await isChannelAutoconvertable(channelId);
    }

    if (!isAutoconvertable) {
        const res = await new MchannelsSchema({
            channelId: channelId,
            autoconversion: true,
        }).save();
        log.info(`Added new autoconvertable channel ${channelId} | ${channelName}`);
        return new DBChannel(res);
    }
        
    return false;
}

export async function removeAutoconvertableChannel(channelId: string) {
    let isAutoconvertable: boolean | undefined = undefined;
    const cachedChannel = channelsCache.get(channelId);
    if (cachedChannel) isAutoconvertable = true;
    else {
        isAutoconvertable = await isChannelAutoconvertable(channelId);
    }

    if (isAutoconvertable)
        await MchannelsSchema.findOneAndDelete({
            channelId: channelId,
            autoconversion: true,
        });
        channelsCache.remove(channelId)
}

export async function getSubscriber(
    userId: string
): Promise<DBSubscriber | undefined> {
    const subscriber = await MsubscribersSchema.findOne({ userId: userId });

    return subscriber ? new DBSubscriber(subscriber) : undefined;
}

export class DBServer {
    serverName: string;
    serverId: string;
    memberCount: number;
    inviteDate?: Date;
    lang: string;
    giftSubActivatedBy?: Maybe<string>;

    constructor(server: DBServerI) {
        this.serverName = server.serverName;
        this.serverId = server.serverId;
        this.memberCount = server.memberCount;
        this.inviteDate = server.inviteDate;
        this.lang = server.lang;
        this.giftSubActivatedBy = server.giftSubActivatedBy;
    }

    async updateData(serverName: string, memberCount: number) {
        if (serverName === this.serverName || memberCount === this.memberCount)
            return;

        await MserversSchema.updateOne(
            { serverId: this.serverId },
            { serverName: serverName, memberCount: memberCount }
        );

        log.db(
            `Updated data for server: ${serverName} | members: ${memberCount}`
        );

        this.serverName = serverName;
        this.memberCount = memberCount;
    }

    async setLanguage(lang: string) {
        await MserversSchema.updateOne(
            { serverId: this.serverId },
            { lang: lang }
        );

        log.db(`Language set to ${lang} for ${this.serverId}`);

        this.lang = lang;
    }

    async getLang() {
        return utils.getLang(this.lang);
    }

    async setGifter(userId: string | null) {
        await MserversSchema.updateOne(
            { serverId: this.serverId },
            { giftSubActivatedBy: userId }
        );

        this.giftSubActivatedBy = userId;

        utils.sendTGlog(
            config.ADMIN_ID.toString(),
            `Gifter id set to ${userId} for server: ${this.serverName}`
        );
        log.db(`Gifter id set to ${userId} for server: ${this.serverName}`);
    }
}

export class DBChannel {
    channelId: string;
    autoconversion: boolean;

    constructor(channel: DBChannelI) {
        this.channelId = channel.channelId;
        this.autoconversion = channel.autoconversion;
    }

    async setAutoconversion(value: boolean) {
        await MchannelsSchema.updateOne(
            { channelId: this.channelId },
            { autoconversion: value }
        );

        log.db(`Autoconversion set to ${value} for channel ${this.channelId}`);

        this.autoconversion = value;
    }
}

export class DBSubscriber implements DBSubscriberI {
    userId: string;
    subscribeDate: Date;
    level: number;

    constructor(subscriber: DBSubscriberI) {
        this.userId = subscriber.userId;
        this.subscribeDate = subscriber.subscribeDate;
        this.level = subscriber.level;
    }

    async getUserGiftedServers(): Promise<DBServer[]> {
        return (
            await MserversSchema.find({ giftSubActivatedBy: this.userId })
        ).map((server) => new DBServer(server));
    }
}

export async function getAdmins(): Promise<{ name: string; userId: string }[]> {
    return await MadminsSchema.find({});
}

export async function getWorkers(): Promise<DBWorker[]> {
    return (await MworkersSchema.find({}).sort({ curProcesses: 1 })).map(
        (worker) => new DBWorker(worker)
    );
}

export async function getWorker(
    ip: string,
    port: number
): Promise<DBWorker | undefined> {
    const worker = await MworkersSchema.findOne({ ip: ip, port: port });
    return worker ? new DBWorker(worker) : undefined;
}

export async function addWorker(data: WorkerI): Promise<DBWorker> {
    const worker = await getWorker(data.ip, data.port);
    if (worker) return worker;

    const newWorker = await new MworkersSchema(data).save();
    return new DBWorker(newWorker);
}

export class DBWorker implements WorkerI {
    ip: string;
    port: number;
    secret: string;
    curProcesses: number;

    constructor(worker: WorkerI) {
        this.ip = worker.ip;
        this.port = worker.port;
        this.secret = worker.secret;
        this.curProcesses = worker.curProcesses;
    }

    async ping() {
        return await workers.pingWorker(this);
    }

    async startProcess(data: RequestProcessData) {
        return await workers.startProcess(this, data);
    }

    async updateProcesses(value: number) {
        await MworkersSchema.findOneAndUpdate(
            { ip: this.ip },
            { curProcesses: value },
            { returnDocument: "after" }
        );
        log.db(`Updated curProcesses for ${this.ip} | ${value}`);
        this.curProcesses = value;
    }

    async updateSecret(value: string) {
        await MworkersSchema.findOneAndUpdate(
            { ip: this.ip },
            { secret: value },
            { returnDocument: "after" }
        );
        log.db(`Updated secret for ${this.ip} | ${value}`);
        this.secret = value;
    }

    async delete() {
        if (!args.dev) await MworkersSchema.findOneAndDelete({ ip: this.ip });
        log.db(`Deleted worker ${this.ip}`);
    }
}
