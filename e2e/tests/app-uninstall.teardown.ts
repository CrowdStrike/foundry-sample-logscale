import { test as teardown } from '../src/fixtures';

teardown('uninstall LogScale Data Ingestion app', async ({ appCatalogPage, appName }) => {
  // Clean up by uninstalling the app after all tests complete
  // uninstallApp navigates to the catalog directly via searchAndNavigateToApp
  await appCatalogPage.uninstallApp(appName);
});
