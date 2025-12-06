export type Maybe<T> = T | null | undefined;

export interface DBProcessI {
    serverId?: string | null
    time: number
    date: Date
}

export interface DBServerI {
    serverName: string
    serverId: string
    memberCount: number
    inviteDate?: Date
    lang: string
    giftSubActivatedBy?: string
}

export interface DBChannelI {
    channelId: string
    autoconversion: boolean
}

export interface DBSubscriberI {
    userId: string
    subscribeDate: Date
    level: number
}

export interface WorkerI {
    ip: string
    port: number
    secret: string
    curProcesses: number
}