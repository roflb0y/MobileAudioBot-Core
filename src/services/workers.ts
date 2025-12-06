import axios from "axios";
import { fileFromPath } from 'formdata-node/file-from-path';

import * as db from "../database/database";
import { RequestProcessData } from "./api/interface";
import * as log from "../utils/logger";
import { DownloadedFile } from "../utils/interface";
import { Agent } from "node:http";

axios.defaults.httpAgent = new Agent({ keepAlive: false })

export async function pingWorker(worker: db.DBWorker): Promise<boolean> {
    try {
        const BASE_URL = `http://${worker.ip}:${worker.port}`;

        const res = await axios.post(BASE_URL + "/ping", { secret: worker.secret }, { timeout: 2000 });
        log.info(`Pinged worker ${worker.ip} | status: ${res.status}`);
        return true;
    } catch {
        return false;
    }
}

export async function getBestWorker(): Promise<db.DBWorker | undefined> {
    const workers = await db.getWorkers();

    for (const worker of workers) {
        const pingRes = await pingWorker(worker);
        if (pingRes) { return worker; }
        else await worker.delete();
    }
    return undefined;
}

export async function startProcess(worker: db.DBWorker, data: RequestProcessData) {
    log.process(`Starting process of message ${data.messageId} on worker ${worker.ip}:${worker.port}`);
    const BASE_URL = `http://${worker.ip}:${worker.port}`;

    const form: any = new FormData();
    form.append("secret", worker.secret);
    for await (const file of data.files) {
        form.append("files[]", await fileFromPath(file.filename), file.filename)
    };
    for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];
        Object.keys(file).forEach((key) => {
            form.append(`filesData[${i}][${key}]`, String(file[key as keyof DownloadedFile]))
        })
    };
    form.append("serverId", data.serverId);
    form.append("channelId", data.channelId);
    form.append("messageId", data.messageId);
    form.append("bitrateParams[bitrateFree]", data.bitrateParams.bitrateFree.toString());
    form.append("bitrateParams[bitrateSub]", data.bitrateParams.bitrateSub.toString());
    form.append("isSubscriber", data.isSubscriber.toString());

    const res = await axios.post(BASE_URL + "/process", form,
    {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return res.data.files as string[];
}