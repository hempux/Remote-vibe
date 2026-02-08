export interface PendingQuestion {
    id: string;
    sessionId: string;
    question: string;
    questionType: QuestionType;
    options?: string[];
    timestamp: string;
}

export enum QuestionType {
    YesNo = "yes_no",
    MultipleChoice = "multiple_choice",
    FreeText = "free_text",
    Confirmation = "confirmation"
}

export interface QuestionResponse {
    questionId: string;
    answer: string;
    timestamp: string;
}

export interface RespondRequest {
    questionId: string;
    answer: string;
    timestamp: string;
}

export interface RespondResponse {
    success: boolean;
    status: string;
}
