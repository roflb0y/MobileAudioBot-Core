import { Schema, model } from "mongoose";

const processSchema = new Schema({
    serverId: {
        type: String
    },

    time: {
        type: Number,
        required: true
    },
    
    date: {
        type: Date,
        default: () => new Date(),
        required: true
    }
});

const serversSchema = new Schema({
    serverName: {
        type: String,
        required: true
    },

    serverId: {
        type: String,
        required: true
    },

    memberCount: {
        type: Number,
        required: true
    },

    inviteDate: {
        type: Date,
        required: true,
        default: () => new Date()
    },

    lang: {
        type: String,
        required: true
    },
    
    giftSubActivatedBy: {
        type: String,
        default: null
    }
});

const channelsSchema = new Schema({
    channelId: {
        type: String,
        required: true
    },

    autoconversion: {
        type: Boolean,
        required: true,
        default: true
    }
});

const subscribersSchema = new Schema({
    userId: {
        type: String,
        required: true
    },

    subscribeDate: {
        type: Date,
        required: true
    },

    level: {
        type: Number,
        required: true
    }
});

const adminsSchema = new Schema({
    name: {
        type: String,
        required: true
    },

    userId: {
        type: String,
        required: true
    }
});

const workersSchema = new Schema({
    ip: {
        type: String,
        required: true
    },

    port: {
        type: Number,
        required: true
    },

    secret: {
        type: String,
        required: true
    },

    curProcesses: {
        type: Number,
        default: 0
    }
})

export const MprocessesSchema = model("processes", processSchema);
export const MserversSchema = model("servers", serversSchema);
export const MchannelsSchema = model("channels", channelsSchema);
export const MsubscribersSchema = model("subscribers", subscribersSchema);
export const MadminsSchema = model("admins", adminsSchema);
export const MworkersSchema = model("workers", workersSchema);