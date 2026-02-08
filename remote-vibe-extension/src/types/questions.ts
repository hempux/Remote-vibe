export interface IPendingQuestion {
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

export interface IQuestionResponse {
    questionId: string;
    answer: string;
    timestamp: string;
}
