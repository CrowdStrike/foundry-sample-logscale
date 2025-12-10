import FalconApi from '@crowdstrike/foundry-js';

// Initialize and connect
const falcon = new FalconApi();
await falcon.connect();

// Test data generators
const testDataSets = {
  eventTypes: [
    'suspicious_login',
    'malware_detection',
    'phishing_attempt',
    'ransomware_alert',
    'data_exfiltration',
    'privilege_escalation',
    'lateral_movement',
    'brute_force_attack',
    'ddos_detection',
    'unauthorized_access'
  ],
  severities: ['low', 'medium', 'high', 'critical'],
  descriptions: [
    'Multiple failed login attempts detected from unknown IP address',
    'Suspicious executable attempting to modify system files',
    'Unusual outbound network traffic to known malicious domain',
    'Attempted privilege escalation via exploited vulnerability',
    'Phishing email detected with malicious attachment',
    'Ransomware encryption activity detected on endpoint',
    'Lateral movement detected across multiple systems',
    'DDoS attack pattern identified from botnet sources',
    'Unauthorized access to sensitive data repository',
    'Credential harvesting attempt via keylogger detected'
  ],
  additionalFields: [
    {
      source_ip: '192.168.1.100',
      destination_ip: '10.0.0.50',
      user: 'jdoe',
      hostname: 'workstation-42',
      process: 'powershell.exe'
    },
    {
      file_hash: 'a3c5e4f9b2d1e8f7c6a9b4d3e2f1a0b9',
      file_path: 'C:\\Users\\Public\\suspicious.exe',
      detection_method: 'behavioral_analysis',
      threat_actor: 'SCATTERED_SPIDER'
    },
    {
      domain: 'malicious-site.com',
      protocol: 'HTTPS',
      port: 443,
      bytes_transferred: 524288,
      country_code: 'RU'
    },
    {
      cve_id: 'CVE-2023-12345',
      exploit_technique: 'buffer_overflow',
      affected_service: 'apache_httpd',
      patch_available: true
    },
    {
      email_sender: 'attacker@phishing-domain.net',
      subject: 'Urgent: Account Verification Required',
      attachment_type: 'application/zip',
      recipients: ['victim@company.com']
    }
  ]
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateTestData() {
  const eventType = getRandomElement(testDataSets.eventTypes);
  const severity = getRandomElement(testDataSets.severities);
  const description = getRandomElement(testDataSets.descriptions);
  const additionalFields = getRandomElement(testDataSets.additionalFields);

  return {
    eventType,
    severity,
    description,
    additionalFields: JSON.stringify(additionalFields, null, 2)
  };
}

(async () => {
  const form = document.getElementById('ingestForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');
  const fillTestDataBtn = document.getElementById('fillTestDataBtn');
  const toastContainer = document.getElementById('toastContainer');
  const refreshBtn = document.getElementById('refreshBtn');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const resultsContainer = document.getElementById('resultsContainer');

  // Query LogScale for recent events
  async function loadRecentEvents() {
    // Hide all states
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.add('hidden');
    resultsContainer.innerHTML = '';

    try {
      const queryResult = await falcon.logscale.query({
        search_query: "*",
        start: "1h",
        end: "now"
      });

      loadingState.classList.add('hidden');

      // Check if we have events
      const events = queryResult.resources?.[0]?.events || [];

      if (events.length === 0) {
        emptyState.classList.remove('hidden');
        return;
      }

      // Display up to 10 most recent events
      const recentEvents = events.slice(0, 10);

      recentEvents.forEach(event => {
        const card = createEventCard(event);
        resultsContainer.appendChild(card);
      });

    } catch (error) {
      console.error('Error querying LogScale:', error);
      loadingState.classList.add('hidden');
      errorState.classList.remove('hidden');
      errorMessage.textContent = error.message || 'Failed to query LogScale. Please try again.';
    }
  }

  // Create an event card with Shoelace components
  function createEventCard(event) {
    const card = document.createElement('sl-card');
    card.className = 'event-card';

    // Determine severity color
    const severity = event.severity || 'unknown';
    const severityColors = {
      critical: 'danger',
      high: 'warning',
      medium: 'primary',
      low: 'success',
      unknown: 'neutral'
    };
    const severityVariant = severityColors[severity.toLowerCase()] || 'neutral';

    const timestamp = event['@timestamp'] ? new Date(event['@timestamp']).toLocaleString() :
                     event.timestamp ? new Date(event.timestamp).toLocaleString() :
                     'Unknown time';

    // Create card header with event type and severity badge
    const header = document.createElement('div');
    header.slot = 'header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.flexWrap = 'wrap';

    const eventType = document.createElement('strong');
    eventType.textContent = event.event_type || 'Unknown Event';
    eventType.className = 'text-titles-and-attributes';

    const badgeWrapper = document.createElement('span');
    const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
    badgeWrapper.innerHTML = `<sl-badge variant="${severityVariant}" pill>${severityLabel}</sl-badge>`;

    header.appendChild(eventType);
    header.appendChild(badgeWrapper);

    // Create card content
    const content = document.createElement('div');

    // Description
    if (event.description) {
      const description = document.createElement('p');
      description.className = 'text-body-and-labels mb-2';
      description.textContent = event.description;
      content.appendChild(description);
    }

    // Timestamp
    const time = document.createElement('p');
    time.className = 'text-body-and-labels text-sm';
    time.innerHTML = `<sl-icon name="clock"></sl-icon> ${timestamp}`;
    time.style.display = 'flex';
    time.style.alignItems = 'center';
    time.style.gap = '4px';
    content.appendChild(time);

    // Details section (collapsible)
    const details = document.createElement('sl-details');
    details.summary = 'View Full Event Data';
    details.className = 'mt-3';
    details.style.fontSize = '14px';
    details.style.fontWeight = '500';

    const pre = document.createElement('pre');
    pre.className = 'text-xs bg-surface-0 p-3 rounded overflow-auto';
    pre.style.maxHeight = '300px';
    pre.textContent = JSON.stringify(event, null, 2);

    details.appendChild(pre);
    content.appendChild(details);

    card.appendChild(header);
    card.appendChild(content);

    return card;
  }

  // Refresh button handler
  refreshBtn.addEventListener('click', () => {
    loadRecentEvents();
  });

  // Load events on page load
  loadRecentEvents();

  // Fill form with test data
  fillTestDataBtn.addEventListener('click', () => {
    const testData = generateTestData();
    document.getElementById('eventType').value = testData.eventType;
    document.getElementById('severity').value = testData.severity;
    document.getElementById('description').value = testData.description;
    document.getElementById('additionalFields').value = testData.additionalFields;

    showMessage('success', 'Form populated with random test data');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable submit button
    submitBtn.disabled = true;
    submitText.classList.add('hidden');
    submitSpinner.classList.remove('hidden');

    // Gather form data
    const formData = {
      event_type: document.getElementById('eventType').value,
      severity: document.getElementById('severity').value,
      description: document.getElementById('description').value,
      timestamp: new Date().toISOString()
    };

    // Parse additional fields if provided
    const additionalFields = document.getElementById('additionalFields').value.trim();
    if (additionalFields) {
      try {
        const parsed = JSON.parse(additionalFields);
        Object.assign(formData, parsed);
      } catch (error) {
        showMessage('error', `Invalid JSON in additional fields: ${error.message}`);
        resetSubmitButton();
        return;
      }
    }

    try {
      const logscaleFunction = falcon.cloudFunction({
        name: 'logscale-ingest'
      });

      const response = await logscaleFunction.path('/ingest')
        .post({ data: formData });

      if (response.status_code === 200 || response.code === 200) {
        showMessage('success', 'Data successfully ingested into LogScale!');
        form.reset();
        setTimeout(() => {
          loadRecentEvents();
        }, 2000);
      } else {
        const errorMsg = response.errors?.[0]?.message || 'Failed to ingest data';
        showMessage('error', `Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error calling function', error);
      const errorMessages = error.errors?.map(err => err.message || String(err)).join(', ');
      showMessage('error', `Error: ${errorMessages || 'Failed to ingest data'}`);
    } finally {
      resetSubmitButton();
    }
  });

  function resetSubmitButton() {
    submitBtn.disabled = false;
    submitText.classList.remove('hidden');
    submitSpinner.classList.add('hidden');
  }

  function showMessage(type, text) {
    const toast = document.createElement('div');
    toast.setAttribute('role', 'alertdialog');

    if (type === 'success') {
      toast.className = 'bg-surface-xl border-l-4 flex items-center min-h-16 p-3 rounded-sm shadow-lg border-positive';
    } else {
      toast.className = 'bg-surface-xl border-l-4 flex items-center min-h-16 p-3 rounded-sm shadow-lg border-critical';
    }

    const iconWrapper = document.createElement('div');
    iconWrapper.className = type === 'success'
      ? 'flex-shrink-0 w-6 h-6 rounded-full bg-positive flex items-center justify-center'
      : 'flex-shrink-0 w-6 h-6 rounded-full bg-critical flex items-center justify-center';

    const icon = document.createElement('span');
    icon.className = 'font-bold text-surface-xl';

    if (type === 'success') {
      icon.textContent = '✓';
      icon.style.fontSize = '14px';
    } else {
      icon.textContent = '×';
      icon.style.fontSize = '18px';
    }
    icon.style.lineHeight = '1';

    iconWrapper.appendChild(icon);

    const message = document.createElement('div');
    message.className = 'flex-1 text-titles-and-attributes break-words';
    message.style.fontSize = '14px';
    message.style.marginLeft = '12px';
    message.style.marginRight = '12px';
    message.textContent = text;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'flex-shrink-0 text-titles-and-attributes leading-none opacity-50 hover:opacity-100 transition';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.lineHeight = '1';
    closeBtn.onclick = () => removeToast(toast);

    toast.appendChild(iconWrapper);
    toast.appendChild(message);
    toast.appendChild(closeBtn);

    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transition = 'all 0.3s ease-out';
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      removeToast(toast);
    }, 5000);
  }

  function removeToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
})();
