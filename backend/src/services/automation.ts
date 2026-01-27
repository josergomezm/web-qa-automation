import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger';
import type { TestStep, PerformanceMetrics, NetworkCall, ConsoleMessage } from '@shared/types';

export class AutomationService {
  private browser?: Browser;
  private page?: Page;
  private startTime: number = 0;
  private clickCount: number = 0;
  private consoleMessages: ConsoleMessage[] = [];
  private networkCalls: NetworkCall[] = [];

  async initialize() {
    this.browser = await chromium.launch({
      headless: false, // Show browser for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-geolocation', // Disable geolocation requests
        '--disable-notifications', // Disable notification requests
        '--disable-web-security', // Disable web security for testing
        '--disable-features=VizDisplayCompositor', // Prevent some rendering issues
        '--deny-permission-prompts', // Automatically deny permission prompts
        '--disable-permissions-api' // Disable permissions API
      ]
    });

    const context = await this.browser.newContext({
      // Override geolocation permission specifically
      geolocation: { latitude: 0, longitude: 0 },
      // Disable notifications and downloads
      acceptDownloads: false,
      // Set user agent to avoid detection
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Set geolocation to prevent popups
    await context.setGeolocation({ latitude: 0, longitude: 0 });

    this.page = await context.newPage();

    // Handle permission dialogs and other dialogs automatically
    this.page.on('dialog', async (dialog) => {
      console.log(`Dialog appeared: ${dialog.type()} - ${dialog.message()}`);
      // Automatically dismiss all dialogs (accept alerts, dismiss confirmations)
      if (dialog.type() === 'alert') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });

    // Set up console logging
    this.page.on('console', (msg) => {
      this.consoleMessages.push({
        type: msg.type() as 'log' | 'error' | 'warning' | 'info',
        text: msg.text(),
        timestamp: new Date()
      });
    });

    // Set up network monitoring
    this.page.on('request', (request) => {
      const networkCall: NetworkCall = {
        url: request.url(),
        method: request.method(),
        timestamp: new Date()
      };
      this.networkCalls.push(networkCall);
    });

    this.page.on('response', (response) => {
      // Find the corresponding request and update it
      const networkCall = this.networkCalls.find(call =>
        call.url === response.url() && !call.status
      );
      if (networkCall) {
        networkCall.status = response.status();
        networkCall.responseTime = Date.now() - networkCall.timestamp.getTime();

        // Get response size if available
        response.body().then(body => {
          networkCall.size = body.length;
        }).catch(() => {
          // Ignore errors getting response body
        });
      }
    });

    this.startTime = Date.now();
    logger.success('Playwright automation initialized');
  }

  async executeSteps(
    steps: any[],
    waitConfig?: { globalWaitTime?: number, waitForElements?: boolean },
    onStepUpdate?: (status: string) => Promise<void>
  ): Promise<{
    steps: TestStep[],
    performance: PerformanceMetrics,
    screenshots: string[],
    consoleMessages: ConsoleMessage[],
    networkCalls: NetworkCall[]
  }> {
    if (!this.page) {
      throw new Error('Automation service not initialized');
    }

    logger.info(`Starting execution of ${steps.length} steps`);
    const executedSteps: TestStep[] = [];
    const screenshots: string[] = [];
    let networkRequests = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepTarget = step.target || step.selector || step.description || 'unknown';
      const stepDescription = `${step.action.toUpperCase()}: ${stepTarget}`;
      logger.step(i + 1, steps.length, stepDescription);

      if (onStepUpdate) {
        await onStepUpdate(`Executing step ${i + 1}/${steps.length}: ${stepDescription}`);
      }

      let success = false;
      let error: string | undefined;

      // Apply wait before step if specified
      if (step.waitBefore || waitConfig?.globalWaitTime) {
        const waitTime = step.waitBefore || waitConfig?.globalWaitTime || 0;
        logger.debug(`Waiting ${waitTime}ms before step...`);
        if (onStepUpdate) await onStepUpdate(`Waiting ${waitTime}ms before step...`);

        // Use smart wait if the wait time is substantial (>1000ms), otherwise just sleep
        if (waitTime > 1000) {
          await this.smartWait(waitTime);
        } else {
          await this.page.waitForTimeout(waitTime);
        }
      }

      try {
        switch (step.action) {
          case 'navigate':
            const url = step.target || step.url;
            if (!url) {
              throw new Error('Navigate step requires a target URL');
            }
            if (onStepUpdate) await onStepUpdate(`Navigating to ${url}...`);
            await this.page.goto(url, { waitUntil: 'domcontentloaded' });
            await this.smartWait(2000); // Wait for potential redirects or dynamic content

            // Handle any permission popups that might appear after navigation
            await this.handlePermissionPopups();

            // Take a screenshot after navigation to help debug
            try {
              const navScreenshot = await this.page.screenshot({
                fullPage: true
              });
              screenshots.push(navScreenshot.toString('base64'));
              console.log('Navigation screenshot taken');
            } catch (screenshotError) {
              console.log('Failed to take navigation screenshot:', screenshotError);
            }
            success = true;
            break;

          case 'fill':
            const fillTarget = step.target || step.selector;
            const fillValue = step.value;
            if (fillTarget && fillValue) {
              if (onStepUpdate) await onStepUpdate(`Filling input ${fillTarget}...`);
              await this.smartFill(fillTarget, fillValue, waitConfig?.waitForElements);
              success = true;
            } else {
              throw new Error('Fill step requires both target/selector and value');
            }
            break;

          case 'click':
            const clickTarget = step.target || step.selector;
            if (!clickTarget) {
              throw new Error('Click step requires a target/selector');
            }
            if (onStepUpdate) await onStepUpdate(`Clicking ${clickTarget}...`);
            await this.smartClick(clickTarget, waitConfig?.waitForElements);
            this.clickCount++;

            // After clicking login buttons, handle any permission popups that might appear
            if (clickTarget.includes('submit') || clickTarget.includes('login') || clickTarget.includes('Log In')) {
              await this.page.waitForTimeout(2000); // Wait for potential popups
              await this.handlePermissionPopups();
            }

            success = true;
            break;

          case 'wait':
            const waitTarget = step.target || step.selector;
            if (waitTarget) {
              await this.page.waitForSelector(waitTarget, { timeout: 10000 });
              success = true;
            } else if (step.waitForCondition) {
              // Handle wait conditions
              await this.handleWaitCondition(step.waitForCondition);
              success = true;
            } else {
              throw new Error('Wait step requires a target/selector or waitForCondition');
            }
            break;

          case 'inspect':
            // Debug step to inspect available form elements including Ionic components
            const formElements = await this.page.evaluate(() => {
              const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                className: input.className
              }));
              const buttons = Array.from(document.querySelectorAll('button')).map(button => ({
                type: button.type,
                textContent: button.textContent?.trim(),
                className: button.className,
                disabled: button.disabled
              }));
              const ionInputs = Array.from(document.querySelectorAll('ion-input')).map(ionInput => ({
                type: ionInput.getAttribute('type'),
                name: ionInput.getAttribute('name'),
                placeholder: ionInput.getAttribute('placeholder'),
                className: ionInput.className
              }));
              const ionButtons = Array.from(document.querySelectorAll('ion-button')).map(ionButton => ({
                type: ionButton.getAttribute('type'),
                textContent: ionButton.textContent?.trim(),
                className: ionButton.className,
                disabled: ionButton.hasAttribute('disabled')
              }));
              return { inputs, buttons, ionInputs, ionButtons };
            });
            console.log('Available form elements (including Ionic):', JSON.stringify(formElements, null, 2));
            success = true;
            break;

          case 'verify':
            const element = await this.page.$(step.target);
            success = !!element;
            if (!success) {
              error = `Element not found: ${step.target}`;
            }
            break;

          case 'screenshot':
            const screenshot = await this.page.screenshot({
              fullPage: true
            });
            screenshots.push(screenshot.toString('base64'));
            success = true;
            break;

          default:
            throw new Error(`Unsupported action: ${step.action}`);
        }
      } catch (err: any) {
        error = err.message;
        success = false;
      }

      // Apply wait after step if specified
      if (step.waitAfter || (success && waitConfig?.globalWaitTime)) {
        const waitTime = step.waitAfter || (success ? waitConfig?.globalWaitTime : 0) || 0;
        if (waitTime > 0) {
          logger.debug(`Waiting ${waitTime}ms after step...`);
          await this.page.waitForTimeout(waitTime);
        }
      }

      // Handle wait conditions if specified
      if (step.waitForCondition && success) {
        try {
          await this.handleWaitCondition(step.waitForCondition);
        } catch (waitError: any) {
          logger.warning(`Wait condition failed: ${waitError.message}`);
          // Don't fail the step for wait condition failures, just log them
        }
      }

      // Log step result
      if (success) {
        logger.success(`Step ${i + 1} completed successfully`);
      } else {
        logger.error(`Step ${i + 1} failed: ${error}`);
      }

      // Take screenshot after each step (success or failure)
      let stepScreenshot: string | undefined;
      try {
        const screenshot = await this.page.screenshot({
          fullPage: true
        });
        stepScreenshot = screenshot.toString('base64');
        screenshots.push(stepScreenshot);
      } catch {
        // Ignore screenshot errors
      }

      executedSteps.push({
        action: step.action,
        element: step.target || step.selector,
        value: step.value,
        timestamp: new Date(),
        success,
        error,
        screenshot: stepScreenshot
      });
    }

    const totalTime = Date.now() - this.startTime;
    let pageLoadTime = 0;

    try {
      pageLoadTime = await this.page.evaluate(() => {
        // @ts-ignore - window exists in browser context
        return window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      });
    } catch {
      // Fallback if performance timing is not available
      pageLoadTime = 0;
    }

    const performance: PerformanceMetrics = {
      pageLoadTime,
      totalTestTime: totalTime,
      clickCount: this.clickCount,
      networkRequests: this.networkCalls.length,
      consoleErrors: this.consoleMessages.filter(m => m.type === 'error').map(m => m.text),
      consoleWarnings: this.consoleMessages.filter(m => m.type === 'warning').map(m => m.text)
    };

    return {
      steps: executedSteps,
      performance,
      screenshots,
      consoleMessages: this.consoleMessages,
      networkCalls: this.networkCalls
    };
  }

  private async handleWaitCondition(condition: any): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const timeout = condition.timeout || 5000;

    switch (condition.type) {
      case 'visible':
        if (condition.selector) {
          await this.page.waitForSelector(condition.selector, { state: 'visible', timeout });
        }
        break;
      case 'hidden':
        if (condition.selector) {
          await this.page.waitForSelector(condition.selector, { state: 'hidden', timeout });
        }
        break;
      case 'enabled':
        if (condition.selector) {
          await this.page.waitForFunction(
            (selector) => {
              const element = document.querySelector(selector);
              return element && !element.hasAttribute('disabled');
            },
            condition.selector,
            { timeout }
          );
        }
        break;
      case 'disabled':
        if (condition.selector) {
          await this.page.waitForFunction(
            (selector) => {
              const element = document.querySelector(selector);
              return element && element.hasAttribute('disabled');
            },
            condition.selector,
            { timeout }
          );
        }
        break;
      case 'text':
        if (condition.selector && condition.text) {
          await this.page.waitForFunction(
            ({ selector, expectedText }) => {
              const element = document.querySelector(selector);
              return element && element.textContent?.includes(expectedText);
            },
            { selector: condition.selector, expectedText: condition.text },
            { timeout }
          );
        }
        break;
      case 'value':
        if (condition.selector && condition.text) {
          await this.page.waitForFunction(
            ({ selector, expectedValue }) => {
              const element = document.querySelector(selector) as HTMLInputElement;
              return element && element.value === expectedValue;
            },
            { selector: condition.selector, expectedValue: condition.text },
            { timeout }
          );
        }
        break;
    }
  }

  private async smartFill(target: string, value: string, waitForElements: boolean = true): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Try multiple selectors if comma-separated
    const selectors = target.split(',').map((s: string) => s.trim());

    // optimization: Race all selectors to find the first valid one
    // We create a promise for each selector that resolves only if the selector is valid
    // and rejects if it's not found or invalid
    const selectorChecks = selectors.map(async (selector) => {
      try {
        // Special handling for Ionic elements
        if (selector.includes('ion-input')) {
          // For ionic, we just try to find it. If tryIonicFill returns true, it filled it.
          // BUT - tryIonicFill actually PERFORMS the action. We can't race actions easily.
          // So for Ionic, we'll just check existence here, and if it exists, we return it as the "winner".
          // The actual fill will happen after we find the winner.
          // Wait, tryIonicFill is specific. Let's simplify:
          // We will check for visibility of the selector.
          const element = await this.page!.waitForSelector(selector, {
            state: 'visible',
            timeout: waitForElements ? 10000 : 2000
          });
          if (element) return selector;
        }

        // Standard selector check
        await this.page!.waitForSelector(selector, {
          state: 'visible',
          timeout: waitForElements ? 10000 : 2000
        });

        // Check if enabled
        const element = await this.page!.$(selector);
        if (element && await element.isEnabled()) {
          return selector;
        }
        throw new Error('Not enabled');
      } catch (e) {
        throw new Error(`Selector ${selector} failed`);
      }
    });

    try {
      // Wait for the FIRST valid selector
      console.log(`Racing ${selectors.length} selectors for fill...`);
      const winningSelector = await Promise.any(selectorChecks);
      console.log(`Race won by: ${winningSelector}`);

      // Now perform the action on the winner
      if (winningSelector.includes('ion-input')) {
        if (await this.tryIonicFill(winningSelector, value)) return;
      }

      await this.page.fill(winningSelector, '');
      await this.page.fill(winningSelector, value);
      console.log(`Successfully filled ${winningSelector} with: ${value}`);

    } catch (aggregateError) {
      console.log('All selectors failed validation in parallel.');
      throw new Error(`Could not fill any of these selectors: ${target}`);
    }
  }

  private async tryIonicFill(selector: string, value: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Try to find ion-input and access its shadow DOM
      const ionInput = await this.page.$(selector);
      if (ionInput) {
        // For Ionic, we often need to click first to focus, then type
        await ionInput.click();
        await this.page.keyboard.type(value);
        console.log(`Successfully filled Ionic element ${selector} with: ${value}`);
        return true;
      }
    } catch (error) {
      console.log(`Ionic fill failed for ${selector}:`, error);
    }
    return false;
  }

  private async tryIonicClick(selector: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      const ionButton = await this.page.$(selector);
      if (ionButton) {
        const isVisible = await ionButton.isVisible();
        if (isVisible) {
          await ionButton.scrollIntoViewIfNeeded();
          await ionButton.click();
          console.log(`Successfully clicked Ionic element: ${selector}`);
          return true;
        }
      }
    } catch (error) {
      console.log(`Ionic click failed for ${selector}:`, error);
    }
    return false;
  }

  private async smartClick(target: string, waitForElements: boolean = true): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Try multiple selectors if comma-separated
    const selectors = target.split(',').map((s: string) => s.trim());

    // optimization: Race all selectors
    const selectorChecks = selectors.map(async (selector) => {
      try {
        // Special handling for Ionic elements
        if (selector.includes('ion-button')) {
          const element = await this.page!.waitForSelector(selector, {
            state: 'visible',
            timeout: waitForElements ? 10000 : 2000
          });
          if (element) return selector;
        }

        await this.page!.waitForSelector(selector, {
          state: 'visible',
          timeout: waitForElements ? 10000 : 2000
        });

        const element = await this.page!.$(selector);
        if (element && await element.isEnabled()) {
          return selector;
        }
        throw new Error('Not enabled');
      } catch (e) {
        throw new Error(`Selector ${selector} failed`);
      }
    });

    try {
      console.log(`Racing ${selectors.length} selectors for click...`);
      const winningSelector = await Promise.any(selectorChecks);
      console.log(`Race won by: ${winningSelector}`);

      if (winningSelector.includes('ion-button')) {
        if (await this.tryIonicClick(winningSelector)) return;
      }

      const element = await this.page.$(winningSelector);
      if (element) {
        await element.scrollIntoViewIfNeeded();
        await this.page.click(winningSelector, { force: true });
        console.log(`Successfully clicked: ${winningSelector}`);
      }

    } catch (aggregateError) {
      console.log('All selectors failed validation in parallel.');
      throw new Error(`Could not click any of these selectors: ${target}`);
    }
  }

  private async handlePermissionPopups(): Promise<void> {
    if (!this.page) return;

    try {
      // Wait a bit for any popups to appear
      await this.page.waitForTimeout(1000);

      // Common selectors for permission dialogs and popups
      const permissionSelectors = [
        // Browser native permission dialogs (these are usually handled by context permissions)
        // Location permission
        'button[aria-label*="Block"]',
        'button[aria-label*="Don\'t allow"]',
        'button:has-text("Block")',
        'button:has-text("Don\'t Allow")',
        'button:has-text("Deny")',
        'button:has-text("Not Now")',
        // Notification permission
        'button:has-text("Not now")',
        'button:has-text("Maybe later")',
        'button:has-text("Later")',
        // App-specific permission dialogs
        '[data-testid*="deny"]',
        '[data-testid*="block"]',
        '[data-testid*="dismiss"]',
        // Cookie banners
        'button:has-text("Reject")',
        'button:has-text("Decline")',
        '[data-testid*="reject"]',
        '[data-testid*="decline"]',
        // Generic close buttons for popups
        'button[aria-label="Close"]',
        'button[aria-label="Dismiss"]',
        '.modal button:has-text("×")',
        '.popup button:has-text("×")',
        '.dialog button:has-text("×")',
        // Ionic specific
        'ion-button:has-text("Not Now")',
        'ion-button:has-text("Deny")',
        'ion-button:has-text("Close")'
      ];

      // Try to click any permission denial buttons that appear
      let dismissed = false;
      for (const selector of permissionSelectors) {
        try {
          const elements = await this.page.$$(selector);
          for (const element of elements) {
            if (await element.isVisible()) {
              await element.click();
              console.log(`Dismissed permission popup: ${selector}`);
              await this.page.waitForTimeout(500); // Brief wait after dismissing
              dismissed = true;
              break;
            }
          }
          if (dismissed) break; // Only dismiss one popup at a time
        } catch (error) {
          // Continue to next selector if this one fails
          continue;
        }
      }

      // Also try to press Escape key to dismiss any modal dialogs
      if (!dismissed) {
        try {
          await this.page.keyboard.press('Escape');
          console.log('Pressed Escape to dismiss any modal dialogs');
        } catch (error) {
          // Ignore escape key errors
        }
      }
    } catch (error) {
      // Don't fail the test if permission handling fails
      console.log('Permission popup handling failed:', error);
    }
  }

  async getPageContent(): Promise<string> {
    if (!this.page) return '';
    try {
      return await this.page.content();
    } catch (error) {
      return '';
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async smartWait(minWaitTime: number = 0): Promise<void> {
    if (!this.page) return;

    // Minimum wait
    if (minWaitTime > 0) {
      await this.page.waitForTimeout(minWaitTime);
    }

    // Smart wait for network idle and load state
    try {
      await Promise.race([
        this.page.waitForLoadState('networkidle', { timeout: 5000 }),
        this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }),
        this.page.waitForLoadState('load', { timeout: 5000 })
      ]).catch(() => { }); // Ignore timeouts specifically for these wait conditions
    } catch (e) {
      // Ignore general errors during wait
    }
  }
}