export interface ConversationMessage {
    id: string;
    sessionId: string;
    role: MessageRole;
    content: string;
    timestamp: string;
    metadata?: MessageMetadata;
}

export enum MessageRole {
    User = "user",
    Assistant = "assistant",
    System = "system"
}

export interface MessageMetadata {
    filesChanged?: string[];
    commandId?: string;
}

export interface MessagesResponse {
    messages: ConversationMessage[];
}
