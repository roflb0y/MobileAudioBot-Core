export interface DownloadedFile {
    filename: string;
    title: string;
    duration: number;
}

export interface ProcessedFile {
    filename: string;
    time: number;
}

export interface DownloadedFileBuffer extends DownloadedFile {
    fileBuf: Buffer | Blob
}