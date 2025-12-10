![CrowdStrike Falcon](/images/cs-logo.png?raw=true)

# Custom Data Ingestion to LogScale sample Foundry app

The Custom Data Ingestion to LogScale sample Foundry app is a community-driven, open source project which serves as an example of an app which can be built using CrowdStrike's Foundry ecosystem. `foundry-sample-logscale` is an open source project, not a CrowdStrike product. As such, it carries no formal support, expressed or implied.

This app is one of several App Templates included in Foundry that you can use to jumpstart your development. It comes complete with a set of preconfigured capabilities aligned to its business purpose. Deploy this app from the Templates page with a single click in the Foundry UI, or create an app from this template using the CLI.

> [!IMPORTANT]
> To view documentation and deploy this sample app, you need access to the Falcon console.

## Description

The Custom Data Ingestion to LogScale sample Foundry app demonstrates how to ingest custom security data into CrowdStrike's LogScale platform using Foundry functions. Whether you need to bring in enrichment data from third-party sources, custom alerts from proprietary systems, or aggregated security events, this app shows you how to get that data into LogScale for correlation and analysis with Falcon telemetry.

The app includes:
- A function that validates and ingests data using the FalconPy SDK
- A web-based UI for manual data submission
- A workflow demonstrating how to call the function from Fusion SOAR
- Examples of both FalconPy Service Class and Uber Class approaches
- Support for custom fields via JSON

> [!NOTE]
> Each Foundry app gets its own dedicated LogScale repository. The repository is automatically created when you add a saved search, write to LogScale from app context (workflow or function), create a lookup file, or create a parser. All data ingested through this app (UI, workflow, or direct API calls) is stored in the app's LogScale repository.

## Prerequisites

* The Foundry CLI (instructions below).
* Python 3.13+ or Docker (needed if modifying the app's functions locally). See [Python For Beginners](https://www.python.org/about/gettingstarted/) for installation instructions.

### Install the Foundry CLI

You can install the Foundry CLI with Scoop on Windows or Homebrew on Linux/macOS.

**Windows**:

Install [Scoop](https://scoop.sh/). Then, add the Foundry CLI bucket and install the Foundry CLI.

```shell
scoop bucket add foundry https://github.com/crowdstrike/scoop-foundry-cli.git
scoop install foundry
```

Or, you can download the [latest Windows zip file](https://assets.foundry.crowdstrike.com/cli/latest/foundry_Windows_x86_64.zip), expand it, and add the install directory to your PATH environment variable.

**Linux and macOS**:

Install [Homebrew](https://docs.brew.sh/Installation). Then, add the Foundry CLI repository to the list of formulae that Homebrew uses and install the CLI:

```shell
brew tap crowdstrike/foundry-cli
brew install crowdstrike/foundry-cli/foundry
```

Run `foundry version` to verify it's installed correctly.

## Getting Started

You have several options for deploying this app:

### Option 1: Deploy from Template (Easiest)

1. In the Falcon console, go to **Foundry > Templates**
2. Search for `LogScale`
3. Click **Deploy** on the "Custom Data Ingestion to LogScale" template
4. Click **Release** and provide release notes (e.g., "Initial deployment")
5. Go to **Foundry** > **App catalog**, find your app, and click **Install**

### Option 2: Import from GitHub

1. Go to [https://github.com/CrowdStrike/foundry-sample-logscale](https://github.com/CrowdStrike/foundry-sample-logscale)
2. Click **Code** > **Download ZIP**
3. In the Falcon console, go to **Foundry** > **App manager** > **Import app**
4. Upload the ZIP file
5. Click **Deploy**, then **Release**, then install from **App catalog**

### Option 3: CLI with Template

If you have the Foundry CLI installed (see prerequisites below), you can create from the template:

1. Run `foundry apps create`
2. When prompted "Would you like to create from a template?", select **Yes**
3. Choose the "Custom Data Ingestion to LogScale" template from the list
4. Deploy and release:

```shell
foundry apps deploy
foundry apps release
```

5. Install from **Foundry > App catalog**

### Option 4: CLI from GitHub (For Developers)

Clone this sample to your local system for development and customization:

```shell
git clone https://github.com/CrowdStrike/foundry-sample-logscale
cd foundry-sample-logscale
foundry login
foundry apps deploy
foundry apps release
```

Then install from **Foundry > App catalog**.

> [!TIP]
> If you get an error that the name already exists, change the name to something unique to your CID in `manifest.yml`.

## About this sample app

### Architecture Overview

The app consists of three main components:

1. **Foundry function**: Validates input and handles LogScale ingestion
2. **Web UI**: A form-based interface for submitting and viewing LogScale data
2. **Fusion workflow**: Demonstrates calling the function from Fusion SOAR

**Data Flow**:
```
User submits data in UI form
  → UI calls function endpoint
  → Function validates and converts data
  → FalconPy sends to LogScale API
  → Data stored in Foundry LogScale repository
```

### Using the App

Once installed, you can start ingesting data immediately:

1. Navigate to **Foundry** > **Custom Apps** > **Data Ingestion**
2. Fill in the form fields:
   - **Event Type**: Type of security event (e.g., `custom_alert`, `threat_intel`)
   - **Severity**: Event severity (`low`, `medium`, `high`, `critical`)
   - **Description**: Event details
   - **Additional Fields** (optional): JSON format for custom attributes
3. Click **Submit Data**

The function automatically adds a timestamp and ingests the data into your Foundry LogScale repository.

**Recent Ingested Data**: Below the form, you'll see a "Recent Ingested Data" section that displays the last 10 events from the past hour. Each event shows:
- Event type and color-coded severity badge (green for low, orange for high, red for critical)
- Description and timestamp
- Expandable "View Full Event Data" to see the complete JSON

Click the **Refresh** button to manually query for the latest events. Note that newly ingested data may take 1-2 minutes to appear due to LogScale's indexing time.

### The Ingest Function

The function demonstrates both FalconPy approaches for LogScale ingestion:

**Service Class Approach** (recommended):
```python
from falconpy import FoundryLogScale
from io import BytesIO

api_client = FoundryLogScale()
json_file = BytesIO(json_binary)
result = api_client.ingest_data(data_file=json_file)
```

**Uber Class Approach** (flexible):
```python
from falconpy import APIHarnessV2

api_client = APIHarnessV2()
file_tuple = [("data_file", ("data_file", json_binary, "application/json"))]
result = api_client.command("IngestDataV1", files=file_tuple)
```

Both approaches require:
- Binary encoding of JSON data (`dumps(data).encode()`)
- App Logs API scope permission
- Proper error handling for validation and API errors

### Testing Locally

To test the function locally:

1. Create a virtual environment and install dependencies:
```shell
cd functions/ingest
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Set environment variables:
```shell
export FALCON_CLIENT_ID="your_client_id"
export FALCON_CLIENT_SECRET="your_client_secret"
```

3. Run the function:
```shell
python main.py
```

4. Test with curl:
```shell
curl -X POST 'http://localhost:8081' \
  -H 'Content-Type: application/json' \
  -d '{
    "method": "POST",
    "url": "/ingest",
    "body": {
        "data": {
           "event_type": "test",
           "severity": "low",
           "description": "Test event"
        }
    }
}'
```

> [!TIP]
> For detailed testing instructions and Docker usage, see [Dive into Falcon Foundry Functions with Python](https://www.crowdstrike.com/tech-hub/ng-siem/dive-into-falcon-foundry-functions-with-python/).

### Querying Your Data

Once data is ingested, you can query it in LogScale:

1. Navigate to **Next-Gen SIEM** > **Advanced event search**
2. Your data is in the Foundry LogScale repository
3. Search for your custom fields:
   ```
   event_type="custom_alert"
   | table timestamp, event_type, severity, description
   ```

## Technical Implementation

- Built on CrowdStrike's Foundry Function framework
- Written in Python with dependencies including:
  - [crowdstrike-foundry-function](https://github.com/CrowdStrike/foundry-fn-python) for Foundry integration
  - [FalconPy](https://falconpy.io/) for CrowdStrike API communication
- UI built with Vanilla JavaScript using [@crowdstrike/foundry-js](https://assets.foundry.crowdstrike.com/)
- Styled with Tailwind Toucan design system for consistent CrowdStrike UI

## Customization Ideas

This sample app provides a foundation for various data ingestion scenarios:

- **Third-party integrations**: Ingest threat intelligence from external feeds
- **Custom alerts**: Forward alerts from proprietary security tools
- **Aggregated events**: Combine and normalize data from multiple sources
- **Scheduled ingestion**: Add workflow automation for periodic data collection
- **Enrichment data**: Bring in contextual information for correlation

## Security Value

This app enhances your security posture by:

- Centralizing custom security data in LogScale alongside Falcon telemetry
- Enabling correlation between custom events and CrowdStrike detections
- Providing a programmatic interface for automated data ingestion
- Supporting flexible data schemas for diverse security use cases
- Demonstrating secure API authentication patterns with FalconPy

## Foundry resources

- Foundry documentation: [US-1](https://falcon.crowdstrike.com/documentation/category/c3d64B8e/falcon-foundry) | [US-2](https://falcon.us-2.crowdstrike.com/documentation/category/c3d64B8e/falcon-foundry) | [EU](https://falcon.eu-1.crowdstrike.com/documentation/category/c3d64B8e/falcon-foundry)
- Foundry learning resources: [US-1](https://falcon.crowdstrike.com/foundry/learn) | [US-2](https://falcon.us-2.crowdstrike.com/foundry/learn) | [EU](https://falcon.eu-1.crowdstrike.com/foundry/learn)

---

<p align="center"><img src="/images/cs-logo-footer.png"><br/><img width="300px" src="/images/adversary-goblin-panda.png"></p>
<h3><p align="center">WE STOP BREACHES</p></h3>
