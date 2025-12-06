let curProcesses: string[] = [];

export function get(): string[] { return curProcesses };
export function isProcessing(value: string): boolean { return curProcesses.includes(value) };
export function add(msgId: string) { curProcesses.push(msgId) };
export function remove(value: string) { 
    const index = curProcesses.indexOf(value);
    if (index > -1) { curProcesses.splice(index, 1) }
};