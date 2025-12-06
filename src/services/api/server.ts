import Koa from "koa";
import Router from "koa-router";
import bodyParser from "koa-body";

import * as config from "../../config";
import * as log from "../../utils/logger";
import * as db from "../../database/database";
import { ResultRequestData } from "./interface";

const app = new Koa();
const router = new Router();

router.post("/inbound", bodyParser(), async (ctx) => {
    if (ctx.request.body.secret !== config.SECRET_KEY || !ctx.ip || !ctx.request.body.port || !ctx.request.body.ip) {
        log.error(`Got unsuccessful inbound from ${ctx.ip}`);
        return ctx.response.status = 401;
    }

    let ip = ctx.ip;
    if (ip === "::1") ip = "localhost";

    const worker = await db.getWorker(ip, ctx.request.body.port);
    if (worker) {
        if (worker.secret !== ctx.request.body.self_secret) {
            await worker.updateSecret(ctx.request.body.self_secret);
        }
        return ctx.response.status = 304;
    }

    await db.addWorker({
        ip: ctx.request.body.ip, 
        port: ctx.request.body.port, 
        secret: ctx.request.body.self_secret,
        curProcesses: 0
    })

    log.info(`Got successful inbound from ${ip}`);

    return ctx.response.status = 200;
});

router.post("/updateStats", bodyParser(), async (ctx) => {
    //console.log(ctx.request.body)
    if (ctx.request.body.secret !== config.SECRET_KEY || !ctx.ip) {
        return ctx.response.status = 401;
    }

    if (Number.isNaN(ctx.request.body.curProcesses) || !ctx.request.body.port) return ctx.response.status = 400;

    const worker = await db.getWorker(ctx.request.body.ip, ctx.request.body.port);
    if (!worker) return ctx.response.status = 500;

    await worker.updateProcesses(ctx.request.body.curProcesses);

    return ctx.response.status = 200;
});

router.post("/sendResult", bodyParser({
        formidable: { 
            uploadDir: "./files", 
            filename: (name, ext, part, form) => name + ext,
            keepExtensions: true
        },
        multipart: true,
        urlencoded: true
    }), 
async (ctx) => {
    const data = ctx.request.body as ResultRequestData;
    log.info(`POST /sendResult from ${ctx.ip}`);
    if (ctx.request.body.secret !== config.SECRET_KEY || !ctx.ip || !ctx.request.files) {
        return ctx.response.status = 401;
    }

    db.insertProcessesIdkLmaooo(data.processedFiles, data.serverId);

    // await sendVideos(data);

    // utils.deleteFiles(data.processedFiles.map(f => "files/" + f.filename));
    // utils.deleteFiles(data.processedFiles.map(f => path.parse(f.filename).name));

    return ctx.response.status = 200;
})

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(config.API_PORT, () => {
    log.info(`API listening on port ${config.API_PORT}`);
});