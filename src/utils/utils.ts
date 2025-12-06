import { Attachment, Collection } from "discord.js";
import { Telegraf } from "telegraf";
import { TG_TOKEN } from "../config";
import fs from "fs";
import { DownloadedFile } from "./interface";
import * as log from "./logger";
import getAudioDurationInSeconds from "get-audio-duration";
import axios from "axios";

const ALLOWED_EXTENSIONS = ["mp3", "wav", "flac", "ogg", "m4a"];

const DEFAULT_FONTSIZE = 20;
const LENGTH_THRESHOLD = 25;

const bot = new Telegraf(TG_TOKEN);

export function getFontsize(str: string): number {
    let fontsize = DEFAULT_FONTSIZE;
    if (str.length <= LENGTH_THRESHOLD) {
        return fontsize;
    }

    const charOverflow = str.length - LENGTH_THRESHOLD;
    fontsize -= Math.floor(charOverflow / 2.5); //400 iq calculations
    return fontsize;
}

export function deleteFiles(files: string[]): void {
    files.forEach((item) => {
        try {
            fs.unlinkSync(item);
        } catch { /* empty */ }
    });
    log.info(`Deleted ${files.length} file(s): ${files.join(", ")}`);
}

export function getLang(locale: string): { [key: string]: string } {
    const lang = fs.readFileSync(`./langs/${locale}.json`, "utf-8");
    return JSON.parse(lang);
}

export function getAudioFiles(
    files: Collection<string, Attachment>
): Attachment[] {
    const f: Attachment[] = [];
    files.forEach((item) => {
        const splittedFilename = item.name.split(".");
        const fileExt = splittedFilename.pop();

        if (fileExt) {
            if (ALLOWED_EXTENSIONS.includes(fileExt)) {
                f.push(item);
            }
        }
    });
    return f;
}

export function getLogDate() {
    const date = new Date();
    return `${date.toLocaleString()}`;
}

export function sendTGlog(userId: string | number, msg: string) {
    bot.telegram.sendMessage(userId, msg).catch(() => {});
}

export const sleep = (s: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, s * 1000));

async function downloadFile(file: Attachment): Promise<DownloadedFile> {
    return new Promise((resolve, reject) => {
        const fileExt = file.name.split(".").pop();
        const saveFilename = `${file.id}.${fileExt}`;
        const writer = fs.createWriteStream(saveFilename);

        axios.get(file.url, { responseType: "stream" }).then((res) => {
            res.data.pipe(writer);
            writer.on("error", (err) => {
                writer.close();
                reject(err);
            });
            writer.on("finish", async () => {
                log.process(`${file.name} downloaded`);
                const duration = await getAudioDurationInSeconds(saveFilename);
                resolve({
                    filename: saveFilename,
                    title: file.name,
                    duration: duration,
                });
                //no need to call the reject here, as it will have been called in the
                //'error' stream;
            });
        });
    });
}

export async function downloadFiles(
    files: Attachment[]
): Promise<DownloadedFile[]> {
    return new Promise((resolve) => {
        const workers: Promise<DownloadedFile>[] = [];

        files.forEach((item) => {
            const worker = downloadFile(item);
            workers.push(worker);
        });

        Promise.all(workers).then((filenames) => {
            resolve(filenames);
        });
    });
}

export async function concurrify<T>(tasks: Promise<T>[]): Promise<T[]> {
    return new Promise((resolve) => {
        const workers: Promise<T>[] = [];

        tasks.forEach((task) => {
            workers.push(task);
        });

        Promise.all(workers).then((values) => {
            resolve(values);
        });
    });
}

export function stringifyNumbers(o: any): any {
    if (typeof o === "object") {
        Object.keys(o).forEach((key) => {
            if (typeof o[key] === "object") o[key] = stringifyNumbers(o[key]);
            else if (!Number.isNaN(o[key])) o[key] = o[key].toString();
        })
        return o;
    }
    else if (Array.isArray(o)) {
        return o.map((item) => stringifyNumbers(item))
    }
}