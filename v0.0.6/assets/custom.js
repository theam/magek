/**
 * Version selector for Magek documentation
 * Displays a version badge with dropdown in the TypeDoc toolbar
 */
(function () {
  'use strict';

  // Base path for the docs site (GitHub Pages uses /magek/)
  const BASE_PATH = '/magek';

  /**
   * Extract the current version from the URL path
   * Expected format: /magek/v0.0.7/...
   */
  function getCurrentVersion() {
    const pathParts = window.location.pathname.split('/');
    // pathParts: ['', 'magek', 'v0.0.7', 'index.html'] or similar
    const versionPart = pathParts[2];
    if (versionPart && versionPart.startsWith('v')) {
      return versionPart;
    }
    return null;
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
    window.location.href = newUrl;
  }

  /**
   * Create the version badge with dropdown element
   */
  function createVersionSelector(versions, currentVersion) {
    const container = document.createElement('div');
    container.className = 'version-badge-container';

    // Version badge button
    const badge = document.createElement('button');
    badge.className = 'version-badge';
    badge.setAttribute('aria-label', 'Select documentation version');
    badge.setAttribute('aria-haspopup', 'listbox');
    badge.setAttribute('aria-expanded', 'false');

    const versionText = document.createElement('span');
    versionText.className = 'version-badge-text';
    versionText.textContent = currentVersion || `v${versions.latest}`;

    const arrow = document.createElement('span');
    arrow.className = 'version-badge-arrow';
    arrow.innerHTML = '&#9662;'; // Down triangle

    badge.appendChild(versionText);
    badge.appendChild(arrow);

    // Dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'version-dropdown';
    dropdown.setAttribute('role', 'listbox');

    // Add version options (newest first, no "latest" alias)
    versions.versions.forEach(function (version) {
      const option = document.createElement('button');
      option.className = 'version-option';
      option.setAttribute('role', 'option');
      const versionValue = 'v' + version;
      option.textContent = versionValue;

      if (currentVersion === versionValue) {
        option.classList.add('version-option-current');
        option.setAttribute('aria-selected', 'true');
      }

      // Mark latest version
      if (version === versions.latest) {
        const latestBadge = document.createElement('span');
        latestBadge.className = 'version-latest-badge';
        latestBadge.textContent = 'latest';
        option.appendChild(latestBadge);
      }

      option.addEventListener('click', function (e) {
        e.stopPropagation();
        navigateToVersion(versionValue);
      });

      dropdown.appendChild(option);
    });

    container.appendChild(badge);
    container.appendChild(dropdown);

    // Toggle dropdown on badge click
    badge.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = container.classList.toggle('version-dropdown-open');
      badge.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
      container.classList.remove('version-dropdown-open');
      badge.setAttribute('aria-expanded', 'false');
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        container.classList.remove('version-dropdown-open');
        badge.setAttribute('aria-expanded', 'false');
      }
    });

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
