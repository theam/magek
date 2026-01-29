/**
 * Version selector for Magek documentation
 * Fetches versions.json and renders a dropdown in the TypeDoc toolbar
 */
(function () {
  'use strict';

  // Base path for the docs site (GitHub Pages uses /magek/)
  const BASE_PATH = '/magek';

  /**
   * Extract the current version from the URL path
   * Expected format: /magek/v0.0.7/... or /magek/latest/...
   */
  function getCurrentVersion() {
    const pathParts = window.location.pathname.split('/');
    // pathParts: ['', 'magek', 'v0.0.7', 'index.html'] or similar
    const versionPart = pathParts[2];
    if (versionPart && (versionPart.startsWith('v') || versionPart === 'latest')) {
      return versionPart;
    }
    return 'latest';
  }

  /**
   * Get the current page path relative to the version root
   * E.g., /magek/v0.0.7/classes/Entity.html -> classes/Entity.html
   */
  function getRelativePath() {
    const pathParts = window.location.pathname.split('/');
    // Skip ['', 'magek', 'version'] and join the rest
    return pathParts.slice(3).join('/') || 'index.html';
  }

  /**
   * Navigate to the same page in a different version
   */
  function navigateToVersion(version) {
    const relativePath = getRelativePath();
    const newUrl = `${BASE_PATH}/${version}/${relativePath}`;

    // Try to navigate; if the page doesn't exist, fall back to version root
    window.location.href = newUrl;
  }

  /**
   * Create the version selector dropdown element
   */
  function createVersionSelector(versions, currentVersion) {
    const container = document.createElement('div');
    container.className = 'version-selector-container';

    const label = document.createElement('span');
    label.className = 'version-selector-label';
    label.textContent = 'Version:';

    const select = document.createElement('select');
    select.className = 'version-selector';
    select.setAttribute('aria-label', 'Select documentation version');

    // Add "latest" option
    const latestOption = document.createElement('option');
    latestOption.value = 'latest';
    latestOption.textContent = `latest (v${versions.latest})`;
    if (currentVersion === 'latest') {
      latestOption.selected = true;
    }
    select.appendChild(latestOption);

    // Add version options (newest first)
    versions.versions.forEach(function (version) {
      const option = document.createElement('option');
      option.value = 'v' + version;
      option.textContent = 'v' + version;
      if (currentVersion === 'v' + version) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', function () {
      navigateToVersion(this.value);
    });

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }

  /**
   * Insert the version selector into the TypeDoc toolbar
   */
  function insertVersionSelector(selector) {
    // TypeDoc toolbar structure: .tsd-page-toolbar .tsd-toolbar-contents
    const toolbar = document.querySelector('.tsd-page-toolbar .tsd-toolbar-contents');
    if (toolbar) {
      // Insert after the title element
      const title = toolbar.querySelector('a.title');
      if (title && title.parentNode) {
        title.parentNode.insertBefore(selector, title.nextSibling);
      } else {
        // Fallback: prepend to toolbar
        toolbar.insertBefore(selector, toolbar.firstChild);
      }
    }
  }

  /**
   * Fetch versions.json and initialize the selector
   */
  function init() {
    const versionsUrl = BASE_PATH + '/versions.json';

    fetch(versionsUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('versions.json not found');
        }
        return response.json();
      })
      .then(function (versions) {
        const currentVersion = getCurrentVersion();
        const selector = createVersionSelector(versions, currentVersion);
        insertVersionSelector(selector);
      })
      .catch(function (error) {
        // Silently fail - version selector is non-essential
        console.debug('Version selector not available:', error.message);
      });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
