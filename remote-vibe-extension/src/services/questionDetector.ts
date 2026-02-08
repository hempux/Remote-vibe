import { IPendingQuestion, QuestionType } from '../types/questions';

export class QuestionDetector {
    private static readonly YES_NO_PATTERNS = [
        /\b(yes|no)\b.*\?/i,
        /\?\s*\(?(y\/n|yes\/no)\)?/i,
        /do you (want|wish|need)/i,
        /would you like/i,
        /should (I|we)/i,
        /are you (sure|ready)/i
    ];

    private static readonly CONFIRMATION_PATTERNS = [
        /are you sure/i,
        /confirm/i,
        /proceed/i,
        /continue/i,
        /is (this|that) (ok|okay|correct|right)/i
    ];

    private static readonly MULTIPLE_CHOICE_PATTERNS = [
        /\n\s*[\d\)\.]+\s+/,
        /\n\s*[a-z][\)\.]\s+/i,
        /\n\s*[-*]\s+/,
        /choose (one|from)/i,
        /select (one|an option)/i
    ];

    public static detectQuestion(text: string): IPendingQuestion | null {
        if (!text.includes('?')) {
            return null;
        }

        const lines = text.split('\n');
        const lastLines = lines.slice(-10).join('\n');

        if (this.isMultipleChoice(lastLines)) {
            return {
                id: '',
                sessionId: '',
                question: this.extractQuestion(lastLines),
                questionType: QuestionType.MultipleChoice,
                options: this.extractOptions(lastLines),
                timestamp: new Date().toISOString()
            };
        }

        if (this.isConfirmation(lastLines)) {
            return {
                id: '',
                sessionId: '',
                question: this.extractQuestion(lastLines),
                questionType: QuestionType.Confirmation,
                timestamp: new Date().toISOString()
            };
        }

        if (this.isYesNo(lastLines)) {
            return {
                id: '',
                sessionId: '',
                question: this.extractQuestion(lastLines),
                questionType: QuestionType.YesNo,
                timestamp: new Date().toISOString()
            };
        }

        if (lastLines.includes('?')) {
            return {
                id: '',
                sessionId: '',
                question: this.extractQuestion(lastLines),
                questionType: QuestionType.FreeText,
                timestamp: new Date().toISOString()
            };
        }

        return null;
    }

    private static isYesNo(text: string): boolean {
        return this.YES_NO_PATTERNS.some(pattern => pattern.test(text));
    }

    private static isConfirmation(text: string): boolean {
        return this.CONFIRMATION_PATTERNS.some(pattern => pattern.test(text));
    }

    private static isMultipleChoice(text: string): boolean {
        return this.MULTIPLE_CHOICE_PATTERNS.some(pattern => pattern.test(text));
    }

    private static extractQuestion(text: string): string {
        const lines = text.split('\n').filter(l => l.trim());
        const questionLines = lines.filter(l => l.includes('?'));

        if (questionLines.length > 0) {
            return questionLines[questionLines.length - 1].trim();
        }

        return lines[lines.length - 1]?.trim() || text.trim();
    }

    private static extractOptions(text: string): string[] {
        const options: string[] = [];
        const lines = text.split('\n');

        for (const line of lines) {
            const numberedMatch = line.match(/^\s*(\d+)[\)\.]\s+(.+)/);
            if (numberedMatch) {
                options.push(numberedMatch[2].trim());
                continue;
            }

            const letterMatch = line.match(/^\s*([a-z])[\)\.]\s+(.+)/i);
            if (letterMatch) {
                options.push(letterMatch[2].trim());
                continue;
            }

            const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
            if (bulletMatch) {
                options.push(bulletMatch[1].trim());
            }
        }

        return options;
    }
}
