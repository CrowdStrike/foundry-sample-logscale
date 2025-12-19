import { test, expect } from '../src/fixtures';

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

    // Data may take 1-2 minutes to appear in LogScale after ingestion
    // Retry refresh multiple times with waits between attempts
    let dataFound = false;
    for (let attempt = 1; attempt <= 6 && !dataFound; attempt++) {
      // Wait before checking (longer waits for later attempts)
      const waitTime = attempt <= 2 ? 15000 : 20000;
      await logScalePage.page.waitForTimeout(waitTime);

      await logScalePage.refreshRecentData();

      // Check if data appeared
      const cardCount = await logScalePage.getRecentDataCardCount();
      if (cardCount > 0) {
        dataFound = true;
      }
    }

    // Final verification
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
