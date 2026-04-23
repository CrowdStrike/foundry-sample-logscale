import { test, expect } from '../src/fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('LogScale Data Ingestion - E2E Tests', () => {
  test('should navigate to LogScale app', async ({ logScalePage }) => {
    await logScalePage.navigateToApp();
  });

  test('should fill form with test data and submit successfully', { timeout: 240_000 }, async ({ logScalePage }) => {
    await logScalePage.navigateToApp();

    // Fill form with specific test data
    const testData = {
      event_type: 'e2e_test_event',
      severity: 'high',
      description: 'E2E test event - automated test submission'
    };

    await logScalePage.fillForm(testData);
    await logScalePage.submitForm();
    await logScalePage.waitForIngestionSuccess();

    // Data may take up to a minute to appear in LogScale after deploy/release in CI
    await expect(async () => {
      await logScalePage.refreshRecentData();
      await logScalePage.verifyDataInRecent(testData);
    }).toPass({ timeout: 180000, intervals: [10000] });
  });

  test('should use Fill with Test Data button and submit', async ({ logScalePage }) => {
    await logScalePage.navigateToApp();
    await logScalePage.clickFillWithTestData();
    await logScalePage.submitForm();
    await logScalePage.waitForIngestionSuccess();
  });
});

test.describe('LogScale Workflow - E2E Tests', () => {
  test('should execute Ingest Data to LogScale workflow', async ({ workflowsPage }) => {
    await workflowsPage.navigateToWorkflows();
    await workflowsPage.verifyWorkflowExists('Ingest Data to LogScale');

    // Execute the workflow with default JSON data (CodeMirror editor is complex to manipulate)
    await workflowsPage.executeAndVerifyWorkflow('Ingest Data to LogScale');
  });
});
