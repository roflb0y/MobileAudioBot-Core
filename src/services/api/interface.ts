import { ProcessedFile } from "../../utils/interface"

export interface BitrateParams {
    bitrateFree: 96
    bitrateSub: 320
}

export interface DownloadedFile {
    filename: string
    title: string
    duration: number
}

export interface DownloadedFileBuffer extends DownloadedFile {
    fileBuf: Buffer
}

export interface RequestProcessData {
    files: DownloadedFile[]
    serverId: string
    channelId: string
    messageId: string
    bitrateParams: BitrateParams
    isSubscriber: boolean
}

export interface ResultRequestData {
    processedFiles: ProcessedFile[]
    serverId: string
    channelId: string
    messageId: string
}