import { PendingQuestion, QuestionType } from '../types/questions';

export class QuestionDetector {
    public detect(text: string): PendingQuestion | null {
        const yesNoQuestion = this.detectYesNo(text);
        if (yesNoQuestion) {
            return yesNoQuestion;
        }

        const multipleChoice = this.detectMultipleChoice(text);
        if (multipleChoice) {
            return multipleChoice;
        }

        const confirmation = this.detectConfirmation(text);
        if (confirmation) {
            return confirmation;
        }

        return null;
    }

    private detectYesNo(text: string): PendingQuestion | null {
        const lowerText = text.toLowerCase();

        const patterns = [
            /\b(yes|no)\b.*\?/i,
            /\?\s*\(?(yes\/no|y\/n)\)?/i,
            /would you like/i,
            /do you want/i,
            /should i/i
        ];

        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return {
                    id: '', // Will be set by SessionManager
                    sessionId: '', // Will be set by SessionManager
                    question: text.trim(),
                    questionType: QuestionType.YesNo,
                    timestamp: new Date().toISOString()
                };
            }
        }

        return null;
    }

    private detectMultipleChoice(text: string): PendingQuestion | null {
        const numberedPattern = /(\d+[\.\)]\s+[^\n]+)/g;
        const bulletPattern = /([•\-\*]\s+[^\n]+)/g;

        const numberedMatches = text.match(numberedPattern);
        const bulletMatches = text.match(bulletPattern);

        if ((numberedMatches && numberedMatches.length >= 2) || (bulletMatches && bulletMatches.length >= 2)) {
            const options = (numberedMatches || bulletMatches || []).map(opt =>
                opt.replace(/^[\d\.\)\-\*•]\s*/, '').trim()
            );

            return {
                id: '',
                sessionId: '',
                question: text.trim(),
                questionType: QuestionType.MultipleChoice,
                options,
                timestamp: new Date().toISOString()
            };
        }

        return null;
    }

    private detectConfirmation(text: string): PendingQuestion | null {
        const confirmationPatterns = [
            /are you sure/i,
            /please confirm/i,
            /confirm that/i,
            /proceed with/i
        ];

        for (const pattern of confirmationPatterns) {
            if (pattern.test(text)) {
                return {
                    id: '',
                    sessionId: '',
                    question: text.trim(),
                    questionType: QuestionType.Confirmation,
                    timestamp: new Date().toISOString()
                };
            }
        }

        return null;
    }
}
