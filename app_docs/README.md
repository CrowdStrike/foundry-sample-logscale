# Custom Data Ingestion to LogScale sample Foundry app

When building security workflows, you often need to bring custom data into LogScale for correlation and analysis. Whether it's enrichment data from third-party sources, custom alerts from proprietary systems, or aggregated security events, having this data in LogScale lets you query and correlate it with Falcon telemetry.

This sample app demonstrates how to:

* Ingest custom security data into a Foundry app's LogScale repository
* Validate and process data using FalconPy SDK
* Use both Service Class and Uber Class approaches for LogScale API interaction
* Submit data manually through a web-based UI
* Support custom fields via JSON for flexible data schemas

> [!NOTE]
> Each Foundry app gets its own dedicated LogScale repository. The repository is automatically created when you add a saved search, write to LogScale from app context (workflow or function), create a lookup file, or create a parser.

## Foundry capabilities used

* **Function** - Python function that validates input data and ingests it into LogScale using FalconPy
* **UI Page** - Web form for manual data submission with fields for event type, severity, description, and custom JSON attributes
* **Workflow** - On-demand workflow demonstrating how to call the ingest function from within a workflow

## Usage

After installing this app:

1. Navigate to **Foundry** > **Custom Apps** > **Data Ingestion**
2. Fill in the form fields:
   - **Event Type**: Type of security event (e.g., `custom_alert`, `threat_intel`)
   - **Severity**: Event severity (`low`, `medium`, `high`, `critical`)
   - **Description**: Event details
   - **Additional Fields** (optional): JSON format for custom attributes
3. Click **Submit Data**

The function automatically adds a timestamp and ingests your data into the Foundry LogScale repository.

**Recent Ingested Data**: Below the form, the app displays the last 10 events from the past hour, showing:
- Event type with color-coded severity badges
- Description and timestamp
- Expandable details to view the complete event JSON

Click **Refresh** to query for the latest events. Note that newly ingested data may take 1-2 minutes to appear due to LogScale's indexing time.

### Using the Workflow

The app includes an on-demand workflow that demonstrates how to call the ingest function:

1. Navigate to **Fusion SOAR** > **Workflows**
2. Find the **Ingest Data to LogScale** workflow
3. Select **Execute workflow**
4. Provide a JSON object with your data:
   ```json
   {
     "event_type": "custom_alert",
     "severity": "high",
     "description": "Sample security event",
     "source": "external_system"
   }
   ```
5. Click **Execute now**

This workflow example shows how you can integrate LogScale data ingestion into your own custom Fusion workflows for automated security operations.

### Querying Your Data

Once data is ingested, query it in LogScale:

1. Navigate to **Next-Gen SIEM** > **Advanced event search**
2. Search for your custom fields:
   ```
   event_type="custom_alert"
   | table timestamp, event_type, severity, description
   ```

### Programmatic Access

You can also call the function endpoint directly via API for automated data ingestion. See the repository README for local testing instructions.

The source code for this app can be found on GitHub: <https://github.com/CrowdStrike/foundry-sample-logscale>.
