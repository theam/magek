/**
 * Version selector and toolbar customization for Magek documentation
 * - Displays a version badge with dropdown in the TypeDoc toolbar
 * - Replaces default GitHub link with styled button
 */
(function () {
  'use strict';

  /**
   * Derive the base path from the current URL
   * Supports both custom domains (empty base) and GitHub Pages subpath deployment
   */
  function getBasePath() {
    var path = window.location.pathname;
    var match = path.match(/^(\/[^/]+)?\/v[\d.]+/);
    if (match && match[1] && !match[1].match(/^\/v[\d.]+$/)) {
      return match[1]; // e.g., "/magek"
    }
    return ''; // root path for custom domains
  }

  var BASE_PATH = getBasePath();

  /**
   * Extract the current version from the URL path
   * Expected format: /v0.0.7/... or /magek/v0.0.7/...
   */
  function getCurrentVersion() {
    var path = window.location.pathname;
    var match = path.match(/\/v([\d.]+)/);
    if (match) {
      return 'v' + match[1];
    }
    return null;
  }

  /**
   * Get the current page path relative to the version root
   * E.g., /v0.0.7/classes/Entity.html -> classes/Entity.html
   * E.g., /magek/v0.0.7/classes/Entity.html -> classes/Entity.html
   */
  function getRelativePath() {
    var path = window.location.pathname;
    var match = path.match(/\/v[\d.]+\/(.*)$/);
    if (match && match[1]) {
      return match[1] || 'index.html';
    }
    return 'index.html';
  }

  /**
   * Navigate to the same page in a different version
   * Falls back to version root if the target page doesn't exist
   */
  function navigateToVersion(version) {
    var relativePath = getRelativePath();
    var newUrl = BASE_PATH + '/' + version + '/' + relativePath;
    var fallbackUrl = BASE_PATH + '/' + version + '/index.html';

    // Check if target page exists before navigating
    if (typeof window.fetch === 'function') {
      window.fetch(newUrl, { method: 'HEAD' })
        .then(function (response) {
          if (response && response.ok) {
            window.location.href = newUrl;
          } else {
            window.location.href = fallbackUrl;
          }
        })
        .catch(function () {
          window.location.href = fallbackUrl;
        });
    } else {
      // Fallback for browsers without fetch
      window.location.href = newUrl;
    }
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
   * Create a styled GitHub button matching the landing page
   */
  function createGitHubButton() {
    const link = document.createElement('a');
    link.href = 'https://github.com/theam/magek';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'nav-btn github-link';

    const icon = document.createElement('i');
    icon.className = 'fa-brands fa-github';

    const text = document.createTextNode('Fork on GitHub');

    link.appendChild(icon);
    link.appendChild(text);

    return link;
  }

  /**
   * Create a container for toolbar section
   */
  function createToolbarSection(className) {
    const container = document.createElement('div');
    container.className = className;
    return container;
  }

  /**
   * Insert the version selector and GitHub button into the TypeDoc toolbar
   */
  function insertToolbarElements(selector, githubBtn) {
    // TypeDoc toolbar structure: .tsd-page-toolbar .tsd-toolbar-contents
    const toolbar = document.querySelector('.tsd-page-toolbar .tsd-toolbar-contents');
    if (!toolbar) return;

    const title = toolbar.querySelector('a.title');
    const search = toolbar.querySelector('#tsd-search');

    // Create left section: logo + version selector
    const leftSection = createToolbarSection('tsd-toolbar-left');
    if (title) {
      leftSection.appendChild(title);
    }
    leftSection.appendChild(selector);

    // Create right section: GitHub button + search
    const rightSection = createToolbarSection('tsd-toolbar-icon-container');
    rightSection.appendChild(githubBtn);
    if (search) {
      rightSection.appendChild(search);
    }

    // Clear toolbar and add sections
    toolbar.innerHTML = '';
    toolbar.appendChild(leftSection);
    toolbar.appendChild(rightSection);
  }

  /**
   * Redirect version root to Introduction page
   * Handles URLs with or without trailing slash, index.html, query params, and hash fragments
   */
  function redirectToIntro() {
    var path = window.location.pathname;
    // Extract version from path (handles both /v0.0.6 and /magek/v0.0.6 patterns)
    var versionMatch = path.match(/(\/v[\d.]+)/);
    if (!versionMatch) {
      return;
    }
    var versionPath = versionMatch[1];
    // Check if we're at the version root (with or without trailing slash or index.html)
    var afterVersion = path.substring(path.indexOf(versionPath) + versionPath.length);
    if (afterVersion === '' || afterVersion === '/' || afterVersion === '/index.html') {
      window.location.replace(BASE_PATH + versionPath + '/documents/Documentation.Introduction.html');
    }
  }

  /**
   * Make logo link to landing page instead of version root
   */
  function fixLogoLink() {
    const titleLink = document.querySelector('.tsd-page-toolbar a.title');
    if (titleLink) {
      titleLink.href = '/';
    }
  }

  /**
   * Remove default GitHub navigation link (we replace it with styled button)
   */
  function removeDefaultGitHubLink() {
    const navLinks = document.querySelectorAll('.tsd-page-toolbar .tsd-toolbar-contents > a:not(.title)');
    navLinks.forEach(function(link) {
      if (link.textContent.includes('GitHub') || link.href.includes('github.com')) {
        link.remove();
      }
    });
  }

  /**
   * Fetch versions.json and initialize the selector
   */
  function init() {
    // Redirect version root to Introduction page
    redirectToIntro();

    // Make logo link to landing page
    fixLogoLink();

    // Remove default GitHub link
    removeDefaultGitHubLink();

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
        const githubBtn = createGitHubButton();
        insertToolbarElements(selector, githubBtn);
      })
      .catch(function (error) {
        // Even if versions.json fails, still add GitHub button and reorganize toolbar
        console.debug('Version selector not available:', error.message);
        const githubBtn = createGitHubButton();
        const toolbar = document.querySelector('.tsd-page-toolbar .tsd-toolbar-contents');
        if (toolbar) {
          const title = toolbar.querySelector('a.title');
          const search = toolbar.querySelector('#tsd-search');

          // Create left section: just logo (no version selector available)
          const leftSection = createToolbarSection('tsd-toolbar-left');
          if (title) {
            leftSection.appendChild(title);
          }

          // Create right section: GitHub button + search
          const rightSection = createToolbarSection('tsd-toolbar-icon-container');
          rightSection.appendChild(githubBtn);
          if (search) {
            rightSection.appendChild(search);
          }

          // Clear toolbar and add sections
          toolbar.innerHTML = '';
          toolbar.appendChild(leftSection);
          toolbar.appendChild(rightSection);
        }
      });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
