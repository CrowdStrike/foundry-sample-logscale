import { Page, expect, FrameLocator } from '@playwright/test';
import { BasePage, AppCatalogPage, config } from '@crowdstrike/foundry-playwright';

export interface FormData {
  event_type: string;
  severity: string;
  description: string;
  additional_fields?: string;
}

export class LogScalePage extends BasePage {
  constructor(page: Page) {
    super(page, 'LogScalePage');
  }

  private getAppFrame(): FrameLocator {
    return this.page.frameLocator('iframe[name="portal"]');
  }

  protected getPagePath(): string {
    throw new Error('Direct path navigation not supported. Use navigateToApp() instead.');
  }

  protected async verifyPageLoaded(): Promise<void> {
    await expect(this.page.locator('iframe[name="portal"]')).toBeVisible({ timeout: 15000 });
    this.logger.info('App iframe is visible');

    const iframe = this.getAppFrame();
    const heading = iframe.locator('h1', { hasText: 'Ingest Custom Data into LogScale' });
    await expect(heading).toBeVisible({ timeout: 15000 });
    this.logger.success('LogScale app page loaded');
  }

  async navigateToApp(): Promise<void> {
    return this.withTiming(async () => {
      const catalog = new AppCatalogPage(this.page);
      await catalog.navigateToInstalledApp(config.appName);
      await this.verifyPageLoaded();
    }, 'Navigate to LogScale app');
  }

  async fillForm(data: FormData): Promise<void> {
    return this.withTiming(async () => {
      this.logger.info(`Filling form with event_type: ${data.event_type}, severity: ${data.severity}`);

      const iframe = this.getAppFrame();

      const eventTypeInput = iframe.locator('#eventType');
      await eventTypeInput.fill(data.event_type);

      const severitySelect = iframe.locator('#severity');
      await severitySelect.selectOption(data.severity);

      const descriptionInput = iframe.locator('#description');
      await descriptionInput.fill(data.description);

      if (data.additional_fields) {
        const additionalFieldsInput = iframe.locator('#additionalFields');
        await additionalFieldsInput.fill(data.additional_fields);
      }

      this.logger.success('Form filled successfully');
    }, 'Fill form');
  }

  async clickFillWithTestData(): Promise<void> {
    return this.withTiming(async () => {
      this.logger.info('Clicking Fill with Test Data button');

      const iframe = this.getAppFrame();
      const fillTestDataButton = iframe.locator('[data-test-selector="fill-test-data-button"]');
      await fillTestDataButton.click();

      await this.waitForSuccessToast('Form populated');

      this.logger.success('Form populated with test data');
    }, 'Click Fill with Test Data');
  }

  async submitForm(): Promise<void> {
    return this.withTiming(async () => {
      this.logger.info('Submitting form');

      const iframe = this.getAppFrame();
      const submitButton = iframe.locator('[data-test-selector="submit-data-button"]');
      await submitButton.click();

      this.logger.success('Form submitted');
    }, 'Submit form');
  }

  async waitForSuccessToast(expectedText?: string): Promise<void> {
    return this.withTiming(async () => {
      this.logger.info('Waiting for success toast');

      const iframe = this.getAppFrame();
      const toast = iframe.locator('#toastContainer [role="alertdialog"]').filter({ hasText: expectedText || '' });

      await expect(toast.first()).toBeVisible({ timeout: 30000 });

      this.logger.success('Success toast appeared');
    }, 'Wait for success toast');
  }

  async waitForIngestionSuccess(): Promise<void> {
    await this.waitForSuccessToast('successfully ingested');
  }

  async refreshRecentData(): Promise<void> {
    return this.withTiming(async () => {
      this.logger.info('Refreshing recent data');

      const iframe = this.getAppFrame();
      const refreshButton = iframe.locator('#refreshBtn');
      await refreshButton.click();

      const loadingState = iframe.locator('#loadingState');
      await loadingState.waitFor({ state: 'hidden', timeout: 15000 });

      this.logger.success('Recent data refreshed');
    }, 'Refresh recent data');
  }

  async verifyDataInRecent(data: FormData): Promise<void> {
    return this.withTiming(async () => {
      this.logger.info(`Verifying data appears in recent section: ${data.event_type}`);

      const iframe = this.getAppFrame();

      const cardWithEventType = iframe.locator('#resultsContainer sl-card').filter({
        has: iframe.locator(`strong:has-text("${data.event_type}")`)
      });

      await expect(cardWithEventType.first()).toBeVisible({ timeout: 5000 });

      const severityBadge = cardWithEventType.first().locator('sl-badge');
      await expect(severityBadge).toBeVisible();

      const descriptionText = cardWithEventType.first().locator('p.text-body-and-labels').first();
      await expect(descriptionText).toContainText(data.description);

      this.logger.success(`Data verified in recent section: ${data.event_type}`);
    }, 'Verify data in recent');
  }
}
