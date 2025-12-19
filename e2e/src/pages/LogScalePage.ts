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
    return this.page.frameLocator('iframe');
  }

  protected getPagePath(): string {
    return '/foundry/home';
  }

  protected async verifyPageLoaded(): Promise<void> {
    // First wait for the iframe to be visible
    await expect(this.page.locator('iframe')).toBeVisible({ timeout: 15000 });
    this.logger.info('App iframe is visible');

    // Then check for content inside the iframe
    const iframe = this.getAppFrame();
    const heading = iframe.locator('h1', { hasText: 'Ingest Custom Data into LogScale' });
    await expect(heading).toBeVisible({ timeout: 15000 });
    this.logger.success('LogScale app page loaded');
  }

  /**
   * Navigate to LogScale app via Custom Apps menu
   */
  async navigateToApp(): Promise<void> {
    return this.withTiming(
      async () => {
        this.logger.info('Navigating to LogScale app via Custom Apps');

        // Navigate to Foundry home
        await this.navigateToPath('/foundry/home', 'Foundry Home');

        // Open hamburger menu
        const menuButton = this.page.getByTestId('nav-trigger');
        await menuButton.click();
        await this.page.waitForLoadState('networkidle');

        // Click Custom apps in the navigation menu
        const customAppsButton = this.page.getByRole('button', { name: 'Custom apps' });
        await customAppsButton.click();
        await this.page.waitForLoadState('networkidle');

        // Click on the LogScale app - look for the app name which contains "logscale"
        // The app shows as "foundry-sample-logscale" in the menu
        const appButton = this.page.getByRole('button', { name: /logscale/i }).first();
        await appButton.click();

        // The app may have a submenu with "Data Ingestion" page - click it if present
        const dataIngestionLink = this.page.getByRole('link', { name: /Data Ingestion/i });
        if (await dataIngestionLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dataIngestionLink.click();
        }

        // Wait for app page to load
        await this.page.waitForLoadState('networkidle');
        await this.verifyPageLoaded();
      },
      'Navigate to LogScale app'
    );
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
        // Toast has role="alertdialog" and border-positive class for success
        const toast = iframe.locator('[role="alertdialog"].border-positive');

        if (expectedText) {
          await expect(toast.filter({ hasText: expectedText })).toBeVisible({ timeout: 10000 });
        } else {
          await expect(toast).toBeVisible({ timeout: 10000 });
        }

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

        await expect(cardWithEventType.first()).toBeVisible({ timeout: 15000 });

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
