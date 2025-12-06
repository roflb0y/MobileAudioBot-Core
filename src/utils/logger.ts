import chalk from "chalk";
import * as utils from "./utils";

export function info(message: any) {
    console.log(chalk.greenBright(`[${utils.getLogDate()}] INFO: ${message}`));
}

export function process(message: any) {
    console.log(
        chalk.magentaBright(`[${utils.getLogDate()}] PROCESS: ${message}`)
    );
}

export function error(message: any) {
    console.log(chalk.redBright(`[${utils.getLogDate()}] ERROR: ${message}`));
}

export function db(message: any) {
    console.log(
        chalk.yellowBright(
            `[${utils.getLogDate()}] DATABASE: ${message}`
        )
    );
}
