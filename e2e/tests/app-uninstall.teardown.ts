import { test as teardown } from '../src/fixtures';

teardown('uninstall LogScale Data Ingestion app', async ({ appCatalogPage, appName }) => {
  // Clean up by uninstalling the app after all tests complete
  // uninstallApp navigates to the catalog directly via searchAndNavigateToApp
  // If the app is not found (e.g., already deleted by CI cleanup), skip gracefully
  try {
    await appCatalogPage.uninstallApp(appName);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('Could not find app')) {
      console.log(`Teardown: app '${appName}' not found in catalog, skipping uninstall`);
    } else {
      throw error;
    }
  }
});
