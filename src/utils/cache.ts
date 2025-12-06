import { DBChannelI } from "../database/interface";
import * as log from "../utils/logger";

const channelsCache: DBChannelI[] = [];

export class Channels {
    get(id: string) {
        return channelsCache.find((item) => item.channelId === id);
    }

    add(id: string) {
        channelsCache.push({ channelId: id, autoconversion: true });
        //log.db(`Added autoconvertable channel ${data.channelId} to cache`);
    }

    update(data: DBChannelI) {
        channelsCache
            .filter((item) => item.channelId === data.channelId)
            .map(() => {
                return { ...data };
            });
    }

    remove(id: string) {
        const index = channelsCache.indexOf({
            channelId: id,
            autoconversion: true,
        });
        if (index > -1) channelsCache.splice(index, 1);
        log.db(`Removed autoconvertable channel ${id} from cache`);
    }
}
