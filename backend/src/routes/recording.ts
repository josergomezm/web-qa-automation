import { Router } from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AIService } from '../services/ai';
import { TestStep, TestAction } from '@shared/types';

export const recordingRoutes = Router();

// Start a recording session
recordingRoutes.post('/start', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: 'URL is required to start recording' });
    }

    const recordingId = uuidv4();
    const tempDir = path.join(process.cwd(), 'temp-recordings');
    const tempFile = path.join(tempDir, `${recordingId}.spec.ts`);

    try {
        // Ensure temp directory exists
        await fs.mkdir(tempDir, { recursive: true });

        logger.separator('RECORDING STARTED');
        logger.info(`Target URL: ${url}`);
        logger.info(`Temp file: ${tempFile}`);

        // Spawn playwright codegen
        const codegen = spawn('npx', ['playwright', 'codegen', '--output', tempFile, url], {
            shell: true,
            stdio: 'inherit'
        });

        logger.info('Waiting for user to close the recording window...');

        // Wait for process to exit
        await new Promise<void>((resolve, reject) => {
            codegen.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Playwright codegen process exited with code ${code}`));
                }
            });
            codegen.on('error', (err) => {
                reject(err);
            });
        });

        logger.success('Recording finished. Processing output...');

        // Read the generated file
        if (await fs.stat(tempFile).catch(() => null)) {
            logger.info('Reading generated spec file...');
            const content = await fs.readFile(tempFile, 'utf-8');

            // Parse the content
            logger.info(`Parsing ${content.split('\n').length} lines of code...`);
            const steps = parsePlaywrightTrace(content);
            logger.success(`Parsed ${steps.length} test steps`);

            // Analyze steps with AI
            logger.info('Analyzing recorded steps with AI...');
            let analysis: { description: string, credentials: any, formInputs: any } = {
                description: `Recorded test on ${url} with ${steps.length} steps.`,
                credentials: {},
                formInputs: {}
            };

            try {
                // Initialize AI Service
                // We need to get the config from the request or use a default/environment config
                // Ideally, the frontend should pass the AI config used for tests.
                // For now, let's assume we can get it from the DB or env, OR we require it in the request.
                // Validating req.body for aiConfig...
                const { aiConfig } = req.body;

                if (aiConfig && aiConfig.apiKey) {
                    const aiService = new AIService(aiConfig);
                    analysis = await aiService.analyzeRecordedSteps(steps, url);
                    logger.success('AI analysis completed');
                    logger.json('AI Analysis', analysis);
                } else {
                    logger.warning('Skipping AI analysis: No AI config provided');
                }
            } catch (aiError) {
                logger.error(`AI analysis failed: ${aiError}`);
            }

            // Clean up
            await fs.unlink(tempFile).catch((err) => logger.warning(`Failed to cleanup temp file: ${err}`));

            logger.separator('RECORDING COMPLETED');
            res.json({ steps, analysis });
        } else {
            throw new Error('Recording file was not generated.');
        }

    } catch (error) {
        logger.separator('RECORDING FAILED');
        logger.error('Error during recording:', error);
        res.status(500).json({ message: 'Failed to record test', error: error instanceof Error ? error.message : String(error) });
    }
});

// Helper to parse Playwright codegen output into TestStep objects
function parsePlaywrightTrace(content: string): TestStep[] {
    const steps: any[] = [];
    const lines = content.split('\n');

    let currentStepIndex = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip imports and test setup
        if (trimmed.startsWith('import') || trimmed.startsWith('test(') || trimmed.startsWith('});') || trimmed === '}') {
            continue;
        }

        // Capture goto
        if (trimmed.includes('page.goto(')) {
            // Usually we don't need this as a step if we set baseUrl, 
            // but strictly speaking it is an action. 
            // However, the test runner handles the initial navigation.
            continue;
        }

        // Capture clicks
        // await page.getByRole('link', { name: 'Get Started' }).click();
        // await page.locator('text=Login').click();
        if (trimmed.includes('.click(')) {
            const selector = extractSelector(trimmed, 'click');
            steps.push({
                action: 'click',
                element: selector,
                success: true, // Optimistic
                timestamp: new Date()
            });
        }

        // Capture fills
        // await page.getByLabel('Search').fill('query');
        else if (trimmed.includes('.fill(')) {
            const selector = extractSelector(trimmed, 'fill');
            const value = extractValue(trimmed);
            steps.push({
                action: 'type', // or 'fill'
                element: selector,
                value: value,
                success: true,
                timestamp: new Date()
            });
        }

        // Capture checks
        else if (trimmed.includes('.check(')) {
            const selector = extractSelector(trimmed, 'check');
            steps.push({
                action: 'click', // check is basically click
                element: selector,
                success: true,
                timestamp: new Date()
            });
        }

        // Capture selects
        else if (trimmed.includes('.selectOption(')) {
            const selector = extractSelector(trimmed, 'selectOption');
            const value = extractValue(trimmed);
            steps.push({
                action: 'select',
                element: selector,
                value: value,
                success: true,
                timestamp: new Date()
            });
        }

        // General 'press'
        else if (trimmed.includes('.press(')) {
            const selector = extractSelector(trimmed, 'press');
            const value = extractValue(trimmed);
            steps.push({
                action: 'press',
                element: selector,
                value: value,
                success: true,
                timestamp: new Date()
            });
        }
    }

    return steps;
}

function extractSelector(line: string, action: string): string {
    // Determine the part before the action
    // line: await page.getByRole('link', { name: 'Get Started' }).click();
    // action: click

    const actionIndex = line.lastIndexOf(`.${action}(`);
    if (actionIndex === -1) return '';

    let prefix = line.substring(0, actionIndex);
    // prefix: await page.getByRole('link', { name: 'Get Started' })

    // Remove 'await '
    prefix = prefix.replace('await ', '').trim();

    // Remove 'page.'
    if (prefix.startsWith('page.')) {
        prefix = prefix.substring(5);
    }

    // prefix: getByRole('link', { name: 'Get Started' })
    // This is a valid Playwright locator chain.
    // The runner might need to understand this. 
    // If the runner expects CSS, this will fail.
    // But since the project uses Playwright backend, 
    // we can likely just eval this or use it as is if the runner supports it.
    // Checking types.ts: TestStep.element is string.
    // Checking Runner: It likely does `page.$(step.element)` or `page.click(step.element)`.
    // If it does `page.click(step.element)`, then passing a CSS selector is standard.
    // But passing "getByRole('link')" might fail unless using `page.locator(...)`.

    // Logging for debug
    console.log(`Extracting selector from: "${line}" for action: "${action}"`);
    console.log(`Prefix found: "${prefix}"`);

    // If it's a simplified locator that ISN'T a chain, we can extract the content.
    // But if it has .filter(), .first(), .last(), .nth(), .getBy* chained, we MUST return the full prefix
    // so the AutomationService can evaluate it dynamically.
    const isChain = prefix.includes(').') || prefix.includes(').'); // locator('...').something

    if (isChain) {
        console.log(`Detected chain, returning full prefix: "${prefix}"`);
        return prefix;
    }

    // Only simplify if it is strictly locator('...') with no chaining
    if (prefix.startsWith("locator('") || prefix.startsWith('locator("')) {
        // Ensure it ends with the closing parenthesis of locator()
        // If we have locator('foo'), prefix is "locator('foo')"
        const match = prefix.match(/^locator\(['"](.+?)['"]\)$/);
        if (match) {
            console.log(`Simplified locator to: "${match[1]}"`);
            return match[1];
        }
    }

    // Default: return the prefix (e.g. getByRole(...))
    console.log(`Returning generic prefix: "${prefix}"`);
    return prefix;
}

function extractValue(line: string): string {
    // line: await page.getByLabel('Search').fill('query');
    // We want 'query'
    const match = line.match(/\.fill\(['"](.+)['"]\)/) ||
        line.match(/\.selectOption\(['"](.+)['"]\)/) ||
        line.match(/\.press\(['"](.+)['"]\)/);

    return match ? match[1] : '';
}
