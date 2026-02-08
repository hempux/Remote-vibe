export interface IConversationMessage {
    id: string;
    sessionId: string;
    role: MessageRole;
    content: string;
    timestamp: string;
    metadata?: IMessageMetadata;
}

export enum MessageRole {
    User = "user",
    Assistant = "assistant",
    System = "system"
}

export interface IMessageMetadata {
    filesChanged?: string[];
    commandId?: string;
}
