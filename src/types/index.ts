export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UserProfile {
    uid: string;
    name: string;
    age: number;
    gender: Gender;
    country: string;
    city?: string;
    email?: string;
    avatarUrl?: string;
    avatarPath?: string;
    bio?: string;
    isPermanent: boolean;
    isOnline: boolean;
    lastSeen: number;
    createdAt: number;
    isBlocked: boolean;
    reportCount: number;
    blockedUsers: string[];
}

export interface Presence {
    online: boolean;
    lastSeen: number;
    typing?: Record<string, boolean>;
}

export type MessageType = 'text' | 'image' | 'gif';

export interface ReplyTo {
    msgId: string;
    senderId: string;
    senderName: string;
    preview: string;
}

export interface Message {
    id: string;
    dmId: string;
    senderId: string;
    senderName: string;
    type: MessageType;
    text?: string;
    mediaRef?: string;
    mediaThumbnail?: string;
    mediaViewed: boolean;
    gifUrl?: string;
    replyTo?: ReplyTo;
    createdAt: number;
    deletedAt?: number;
    reportedBy?: string[];
}

export interface DM {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    participantGenders?: Record<string, Gender>;
    participantCountries?: Record<string, string>;
    createdAt: number;
    lastMessageAt: number;
    lastMessagePreview: string;
    unreadCount?: number;
    /** UID of whoever sent the most recent message */
    lastSenderId?: string;
    /** How many consecutive messages the lastSenderId has sent without a reply */
    consecutiveSenderCount?: number;
    /** Map of uid → timestamp of last message they read */
    lastReadAt?: Record<string, number>;
    /** True once both participants have sent at least one message — disables rate limiting forever */
    bothReplied?: boolean;
    /** UIDs who have blocked the other party in this DM — used by Firestore rules */
    blockedBy?: string[];
}

export interface OnlineUser {
    uid: string;
    name: string;
    gender: Gender;
    country: string;
    city?: string;
    avatarUrl?: string;
    bio?: string;
    isOnline: boolean;
    lastSeen: number;
}
