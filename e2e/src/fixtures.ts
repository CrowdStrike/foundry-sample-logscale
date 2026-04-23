import { test as baseTest } from '@playwright/test';
import {
  FoundryHomePage,
  AppCatalogPage,
  WorkflowsPage,
  config,
} from '@crowdstrike/foundry-playwright';
import { LogScalePage } from './pages/LogScalePage';

type FoundryFixtures = {
  foundryHomePage: FoundryHomePage;
  appCatalogPage: AppCatalogPage;
  logScalePage: LogScalePage;
  workflowsPage: WorkflowsPage;
  appName: string;
};

export const test = baseTest.extend<FoundryFixtures>({
  foundryHomePage: async ({ page }, use) => {
    await use(new FoundryHomePage(page));
  },

  appCatalogPage: async ({ page }, use) => {
    await use(new AppCatalogPage(page));
  },

  logScalePage: async ({ page }, use) => {
    await use(new LogScalePage(page));
  },

  workflowsPage: async ({ page }, use) => {
    await use(new WorkflowsPage(page));
  },

  appName: async ({}, use) => {
    await use(config.appName);
  },
});

export { expect } from '@playwright/test';
