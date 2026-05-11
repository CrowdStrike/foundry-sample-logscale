import { test as baseTest } from '@playwright/test';
import { WorkflowsPage } from '@crowdstrike/foundry-playwright';
import { LogScalePage } from './pages/LogScalePage';

type FoundryFixtures = {
  logScalePage: LogScalePage;
  workflowsPage: WorkflowsPage;
};

export const test = baseTest.extend<FoundryFixtures>({
  logScalePage: async ({ page }, use) => {
    await use(new LogScalePage(page));
  },

  workflowsPage: async ({ page }, use) => {
    await use(new WorkflowsPage(page));
  },
});

export { expect } from '@playwright/test';
