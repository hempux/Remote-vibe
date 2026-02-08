import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CommandContext } from '../types/commands';

export class ContextBuilder {
    public async buildContext(
        repositoryPath: string,
        context?: CommandContext
    ): Promise<string> {
        let contextText = '';

        if (context?.includeWorkspace) {
            contextText += await this.getWorkspaceContext(repositoryPath);
        }

        if (context?.includeFiles && context.includeFiles.length > 0) {
            contextText += await this.getFilesContext(repositoryPath, context.includeFiles);
        }

        return contextText;
    }

    private async getWorkspaceContext(repositoryPath: string): Promise<string> {
        let context = `\n## Workspace Context\nRepository: ${repositoryPath}\n\n`;

        try {
            const files = await this.getProjectFiles(repositoryPath);
            context += '### Project Structure:\n';
            context += files.slice(0, 50).join('\n') + '\n\n';
        } catch (error) {
            context += 'Unable to read workspace structure\n\n';
        }

        return context;
    }

    private async getFilesContext(repositoryPath: string, files: string[]): Promise<string> {
        let context = '\n## Relevant Files\n\n';

        for (const file of files) {
            const filePath = path.isAbsolute(file) ? file : path.join(repositoryPath, file);

            try {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    context += `### ${file}\n\`\`\`\n${content}\n\`\`\`\n\n`;
                }
            } catch (error) {
                context += `### ${file}\n(Unable to read file)\n\n`;
            }
        }

        return context;
    }

    private async getProjectFiles(repositoryPath: string): Promise<string[]> {
        const files: string[] = [];

        const readDir = (dir: string, depth: number = 0): void => {
            if (depth > 3) {
                return;
            }

            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                        continue;
                    }

                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(repositoryPath, fullPath);

                    if (entry.isDirectory()) {
                        readDir(fullPath, depth + 1);
                    } else {
                        files.push(relativePath);
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };

        readDir(repositoryPath);
        return files;
    }
}
