import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ICommandContext } from '../types/commands';
import { Logger } from '../utils/logger';

export class ContextBuilder {
    public async buildContext(
        repositoryPath: string,
        commandContext?: ICommandContext
    ): Promise<string> {
        const contextParts: string[] = [];

        contextParts.push(`Repository Path: ${repositoryPath}`);

        if (commandContext?.includeWorkspace) {
            const workspaceInfo = await this.getWorkspaceInfo(repositoryPath);
            if (workspaceInfo) {
                contextParts.push('\n--- Workspace Structure ---');
                contextParts.push(workspaceInfo);
            }
        }

        if (commandContext?.includeFiles && commandContext.includeFiles.length > 0) {
            for (const filePath of commandContext.includeFiles) {
                const fileContent = await this.getFileContent(repositoryPath, filePath);
                if (fileContent) {
                    contextParts.push(`\n--- File: ${filePath} ---`);
                    contextParts.push(fileContent);
                }
            }
        }

        return contextParts.join('\n');
    }

    private async getWorkspaceInfo(repositoryPath: string): Promise<string | null> {
        try {
            const files = await this.listFiles(repositoryPath, 2);
            return files.join('\n');
        } catch (error) {
            Logger.error('Failed to get workspace info', error as Error);
            return null;
        }
    }

    private async listFiles(dirPath: string, depth: number, currentDepth: number = 0): Promise<string[]> {
        if (currentDepth >= depth) {
            return [];
        }

        const files: string[] = [];
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                    continue;
                }

                const indent = '  '.repeat(currentDepth);
                if (entry.isDirectory()) {
                    files.push(`${indent}📁 ${entry.name}/`);
                    const subPath = path.join(dirPath, entry.name);
                    const subFiles = await this.listFiles(subPath, depth, currentDepth + 1);
                    files.push(...subFiles);
                } else {
                    files.push(`${indent}📄 ${entry.name}`);
                }
            }
        } catch (error) {
            Logger.error(`Failed to list files in ${dirPath}`, error as Error);
        }

        return files;
    }

    private async getFileContent(repositoryPath: string, filePath: string): Promise<string | null> {
        try {
            const fullPath = path.isAbsolute(filePath)
                ? filePath
                : path.join(repositoryPath, filePath);

            const content = await fs.promises.readFile(fullPath, 'utf-8');
            return content;
        } catch (error) {
            Logger.error(`Failed to read file ${filePath}`, error as Error);
            return null;
        }
    }
}
