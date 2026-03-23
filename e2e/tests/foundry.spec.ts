import { test } from '../src/fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('LogScale Data Ingestion - E2E Tests', () => {
  test('should navigate to LogScale app', async ({ logScalePage }) => {
    await logScalePage.navigateToApp();
  });

  test('should fill form with test data and submit successfully', async ({ logScalePage }) => {
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

    // Refresh and verify data appears (verifyDataInRecent has 30s timeout)
    await logScalePage.refreshRecentData();
    await logScalePage.verifyDataInRecent(testData);
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
