import { Page, expect, FrameLocator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface FormData {
  event_type: string;
  severity: string;
  description: string;
  additional_fields?: string;
}

/**
 * Page object for LogScale Data Ingestion app
 * The app runs inside an iframe within the Foundry platform
 */
export class LogScalePage extends BasePage {
  constructor(page: Page) {
    super(page, 'LogScalePage');
  }

  /**
   * Get the iframe containing the app content
   */
  private getAppFrame(): FrameLocator {
    return this.page.frameLocator('iframe[name="portal"]');
  }

  protected getPagePath(): string {
    return '/foundry/home';
  }

  protected async verifyPageLoaded(): Promise<void> {
    // First wait for the iframe to be visible
    await expect(this.page.locator('iframe[name="portal"]')).toBeVisible({ timeout: 15000 });
    this.logger.info('App iframe is visible');

    // Then check for content inside the iframe
    const iframe = this.getAppFrame();
    const heading = iframe.locator('h1', { hasText: 'Ingest Custom Data into LogScale' });
    await expect(heading).toBeVisible({ timeout: 15000 });
    this.logger.success('LogScale app page loaded');
  }

  /**
   * Navigate to LogScale app.
   * Strategy: Try "Open app" button from App Catalog first (fastest, most reliable),
   * then fall back to Custom Apps menu if the button isn't available.
   */
  async navigateToApp(): Promise<void> {
    return this.withTiming(
      async () => {
        const appName = process.env.APP_NAME || 'foundry-sample-logscale';

        // Strategy 1: Try "Open app" from the App Catalog detail page
        const openedViaCatalog = await this.tryOpenAppViaCatalog(appName);
        if (openedViaCatalog) return;

        // Strategy 2: Fall back to Custom Apps menu with retry loop
        this.logger.info('Falling back to Custom Apps menu navigation');
        await this.navigateViaCustomApps(appName);
      },
      'Navigate to LogScale app'
    );
  }

  /**
   * Try to open the app via the "Open app" button on its App Catalog detail page.
   * Returns true if successful, false if the button wasn't available.
   */
  private async tryOpenAppViaCatalog(appName: string): Promise<boolean> {
    try {
      this.logger.info(`Trying to open app via App Catalog "Open app" button`);

      // Navigate to app catalog with filter to find the app
      const baseUrl = this.getBaseURL();
      const filterParam = encodeURIComponent(`name:~'${appName}'`);
      await this.page.goto(`${baseUrl}/foundry/app-catalog?filter=${filterParam}`);
      await this.page.waitForLoadState('domcontentloaded');

      // Click on the app link to go to its detail page
      const appLink = this.page.getByRole('link', { name: appName, exact: true });
      await appLink.waitFor({ state: 'visible', timeout: 15000 });
      await appLink.click();

      // Look for the "Open app" button
      const openAppButton = this.page.getByRole('button', { name: 'Open app' });
      await openAppButton.waitFor({ state: 'visible', timeout: 10000 });
      await openAppButton.click();
      this.logger.success('Clicked "Open app" button from App Catalog');

      // Wait for the iframe to become visible (it starts with class="hidden" and transitions)
      const iframe = this.page.locator('iframe[name="portal"]');
      await iframe.waitFor({ state: 'visible', timeout: 30000 });
      await this.verifyPageLoaded();
      return true;
    } catch (e) {
      this.logger.warn(`"Open app" button not available: ${(e as Error).message}`);
      return false;
    }
  }

  /**
   * Navigate to app via Custom Apps menu with retry loop.
   * Handles platform flakiness where Custom Apps button doesn't appear on first load.
   */
  private async navigateViaCustomApps(appName: string): Promise<void> {
    await this.navigateToPath('/foundry/home', 'Foundry Home');
    await this.page.waitForLoadState('networkidle');
    await this.waiter.delay(2000);

    // Close sidebar menu if already open from a previous navigation
    const menuButton = this.page.getByTestId('nav-trigger');
    await menuButton.waitFor({ state: 'visible', timeout: 30000 });
    const menuIsOpen = await menuButton.getAttribute('aria-expanded');
    if (menuIsOpen === 'true') {
      await menuButton.click();
      await this.waiter.delay(1000);
    }

    let appFound = false;
    for (let attempt = 1; attempt <= 8; attempt++) {
      await menuButton.waitFor({ state: 'visible', timeout: 30000 });
      await menuButton.click();
      await this.page.waitForLoadState('networkidle');

      const customAppsButton = this.page.getByRole('button', { name: 'Custom apps' });
      try {
        await customAppsButton.waitFor({ state: 'visible', timeout: 20000 });
        await customAppsButton.click();
        await this.waiter.delay(1500);
        this.logger.info(`Custom apps button found on attempt ${attempt}`);
      } catch (e) {
        this.logger.warn(`Custom apps not visible on attempt ${attempt}, refreshing page...`);
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        await this.waiter.delay(3000);
        continue;
      }

      // Check if the app button appears in the submenu
      const appButton = this.page.getByRole('button', { name: appName, exact: false }).first();
      try {
        await appButton.waitFor({ state: 'visible', timeout: 10000 });
        appFound = true;
        this.logger.info(`App '${appName}' found in Custom apps menu on attempt ${attempt}`);
        break;
      } catch (e) {
        this.logger.warn(`App '${appName}' not in Custom apps on attempt ${attempt}, refreshing page...`);
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        await this.waiter.delay(3000);
        continue;
      }
    }
    if (!appFound) {
      throw new Error(`App '${appName}' not found in Custom apps menu after 8 attempts with page refresh`);
    }

    // Re-locate the app button and verify visibility before interacting
    const appButton = this.page.getByRole('button', { name: appName, exact: false }).first();
    await expect(appButton).toBeVisible({ timeout: 10000 });

    // Expand the app menu only if not already expanded
    const isExpanded = await appButton.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await appButton.click();
    }

    // Click the page link to navigate
    const appLink = this.page.getByRole('link', { name: /data ingestion/i }).first();
    await expect(appLink).toBeVisible({ timeout: 20000 });
    await appLink.click();

    // Wait for app page to load
    await this.page.waitForLoadState('networkidle');
    await this.verifyPageLoaded();
  }

  /**
   * Fill the form with test data
   */
  async fillForm(data: FormData): Promise<void> {
    return this.withTiming(
      async () => {
        this.logger.info(`Filling form with event_type: ${data.event_type}, severity: ${data.severity}`);

        const iframe = this.getAppFrame();

        // Fill Event Type
        const eventTypeInput = iframe.locator('#eventType');
        await eventTypeInput.fill(data.event_type);

        // Select Severity
        const severitySelect = iframe.locator('#severity');
        await severitySelect.selectOption(data.severity);

        // Fill Description
        const descriptionInput = iframe.locator('#description');
        await descriptionInput.fill(data.description);

        // Fill Additional Fields if provided
        if (data.additional_fields) {
          const additionalFieldsInput = iframe.locator('#additionalFields');
          await additionalFieldsInput.fill(data.additional_fields);
        }

        this.logger.success('Form filled successfully');
      },
      'Fill form'
    );
  }

  /**
   * Click the "Fill with Test Data" button
   */
  async clickFillWithTestData(): Promise<void> {
    return this.withTiming(
      async () => {
        this.logger.info('Clicking Fill with Test Data button');

        const iframe = this.getAppFrame();
        const fillTestDataButton = iframe.locator('[data-test-selector="fill-test-data-button"]');
        await fillTestDataButton.click();

        // Wait for form to be populated (success toast appears)
        await this.waitForSuccessToast('Form populated');

        this.logger.success('Form populated with test data');
      },
      'Click Fill with Test Data'
    );
  }

  /**
   * Submit the form
   */
  async submitForm(): Promise<void> {
    return this.withTiming(
      async () => {
        this.logger.info('Submitting form');

        const iframe = this.getAppFrame();
        const submitButton = iframe.locator('[data-test-selector="submit-data-button"]');
        await submitButton.click();

        this.logger.success('Form submitted');
      },
      'Submit form'
    );
  }

  /**
   * Wait for success toast notification
   */
  async waitForSuccessToast(expectedText?: string): Promise<void> {
    return this.withTiming(
      async () => {
        this.logger.info('Waiting for success toast');

        const iframe = this.getAppFrame();
        // Toast is inside #toastContainer and has role="alertdialog" with border-positive class
        const toast = iframe.locator('#toastContainer [role="alertdialog"]').filter({ hasText: expectedText || '' });

        await expect(toast.first()).toBeVisible({ timeout: 30000 });

        this.logger.success('Success toast appeared');
      },
      'Wait for success toast'
    );
  }

  /**
   * Wait for data ingestion success toast
   */
  async waitForIngestionSuccess(): Promise<void> {
    await this.waitForSuccessToast('successfully ingested');
  }

  /**
   * Click the refresh button to reload recent data
   */
  async refreshRecentData(): Promise<void> {
    return this.withTiming(
      async () => {
        this.logger.info('Refreshing recent data');

        const iframe = this.getAppFrame();
        const refreshButton = iframe.locator('#refreshBtn');
        await refreshButton.click();

        // Wait for loading to complete
        const loadingState = iframe.locator('#loadingState');
        await loadingState.waitFor({ state: 'hidden', timeout: 15000 });

        this.logger.success('Recent data refreshed');
      },
      'Refresh recent data'
    );
  }

  /**
   * Get the count of recent data cards
   */
  async getRecentDataCardCount(): Promise<number> {
    const iframe = this.getAppFrame();
    const cards = iframe.locator('#resultsContainer sl-card');
    return await cards.count();
  }

  /**
   * Verify that submitted data appears in the recent data section
   */
  async verifyDataInRecent(data: FormData): Promise<void> {
    return this.withTiming(
      async () => {
        this.logger.info(`Verifying data appears in recent section: ${data.event_type}`);

        const iframe = this.getAppFrame();

        // Look for a card containing the event type
        const cardWithEventType = iframe.locator('#resultsContainer sl-card').filter({
          has: iframe.locator(`strong:has-text("${data.event_type}")`)
        });

        await expect(cardWithEventType.first()).toBeVisible({ timeout: 5000 });

        // Verify severity badge
        const severityBadge = cardWithEventType.first().locator('sl-badge');
        await expect(severityBadge).toBeVisible();

        // Verify description text
        const descriptionText = cardWithEventType.first().locator('p.text-body-and-labels').first();
        await expect(descriptionText).toContainText(data.description);

        this.logger.success(`Data verified in recent section: ${data.event_type}`);
      },
      'Verify data in recent'
    );
  }

  /**
   * Wait for empty state (no recent data)
   */
  async waitForEmptyState(): Promise<void> {
    const iframe = this.getAppFrame();
    const emptyState = iframe.locator('#emptyState');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if recent data section shows any cards
   */
  async hasRecentData(): Promise<boolean> {
    const cardCount = await this.getRecentDataCardCount();
    return cardCount > 0;
  }
}
