#!/usr/bin/env node

/**
 * Unified documentation build script
 *
 * Builds the complete docs site in a single step:
 * 1. TypeDoc API documentation (versioned)
 * 2. Landing page from README.md
 * 3. Media files
 *
 * Output: common/temp/docs-site/
 *
 * Usage:
 *   node scripts/build-docs.js          # Uses version from packages/core/package.json
 *   node scripts/build-docs.js 0.0.7    # Uses specified version
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');

const marked = new Marked();

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'common/temp/docs-site');
const DOCS_DIR = path.join(ROOT, 'docs');

function getVersion() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args[0].replace(/^v/, '');
  }
  return require('../packages/core/package.json').version;
}

function main() {
  const VERSION = getVersion();
  console.log(`Building docs site for v${VERSION}...`);

  // Clean output directory
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Build TypeDoc to versioned folder
  const versionedDir = path.join(OUTPUT_DIR, `v${VERSION}`);
  console.log(`\n[1/3] Building TypeDoc to ${versionedDir}...`);
  execSync(`npx typedoc --out "${versionedDir}"`, {
    cwd: DOCS_DIR,
    stdio: 'inherit',
  });

  // 2. Copy media files
  console.log('\n[2/3] Copying media files...');
  const mediaDir = path.join(versionedDir, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.copyFileSync(path.join(DOCS_DIR, 'content/magek-logo.svg'), path.join(mediaDir, 'magek-logo.svg'));

  // 3. Build landing page
  console.log('\n[3/3] Building landing page...');
  buildLandingPage(VERSION);

  console.log(`\n✓ Docs site built successfully at: ${OUTPUT_DIR}`);
  console.log(`  Landing page: ${OUTPUT_DIR}/index.html`);
  console.log(`  Docs: ${OUTPUT_DIR}/v${VERSION}/`);
}

function buildLandingPage(version) {
  // Read README.md
  const readmePath = path.join(ROOT, 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  // Rewrite image paths from docs/content/ to versioned media folder
  const processedContent = readmeContent.replace(
    /!\[([^\]]*)\]\(docs\/content\/([^)]+)\)/g,
    '![$1](v' + version + '/media/$2)'
  );

  // Convert markdown to HTML
  const htmlContent = marked.parse(processedContent);

  // Generate the landing page
  const landingPage = generateLandingPage(htmlContent, version);

  // Write the landing page
  const outputPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(outputPath, landingPage, 'utf-8');
}

function generateLandingPage(readmeHtml, latestVersion) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magek Framework - Build AI-Native Backends with Event-Driven Intelligence</title>
  <meta name="description" content="A framework for building intelligent, agentic applications with event sourcing, swarming agents, and LLM integrations.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#10024;</text></svg>">
  <style>
    :root {
      --color-primary: #6545f5;
      --color-primary-light: #8a6df7;
      --color-primary-dark: #4a30c9;
      --color-background: #1a1a2e;
      --color-background-secondary: #16162a;
      --color-text: #f0f0f0;
      --color-text-muted: #a0a0b0;
      --color-accent-yellow: #fbd248;
      --color-accent-pink: #e95a85;
      --color-accent-purple: #b752b0;
      --max-width: 900px;
      --nav-height: 60px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background-color: var(--color-background);
      color: var(--color-text);
      line-height: 1.6;
      min-height: 100vh;
    }

    /* Navigation */
    .landing-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: var(--nav-height);
      background: var(--color-background-secondary);
      border-bottom: 1px solid rgba(101, 69, 245, 0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      z-index: 1000;
      backdrop-filter: blur(10px);
    }

    .nav-logo {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: var(--color-text);
      font-weight: 600;
      font-size: 1.25rem;
    }

    .nav-logo img {
      height: 32px;
      width: auto;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .nav-links a {
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 0.95rem;
      transition: color 0.2s ease;
    }

    .nav-links a:hover {
      color: var(--color-text);
    }

    .docs-link {
      background: var(--color-primary);
      color: var(--color-text) !important;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      transition: background 0.2s ease !important;
    }

    .docs-link:hover {
      background: var(--color-primary-light) !important;
    }

    /* Main content */
    .readme-content {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: calc(var(--nav-height) + 2rem) 2rem 4rem;
    }

    /* Hide first H1 (title) since logo shows it */
    .readme-content > h1:first-child {
      display: none;
    }

    /* Logo image styling */
    .readme-content > p:first-of-type img,
    .readme-content > h1:first-child + p img {
      max-width: 300px;
      height: auto;
      margin: 1rem 0 2rem;
    }

    /* Headings */
    .readme-content h1 {
      font-size: 2.5rem;
      margin: 2.5rem 0 1rem;
      color: var(--color-text);
      border-bottom: 2px solid var(--color-primary);
      padding-bottom: 0.5rem;
    }

    .readme-content h2 {
      font-size: 1.75rem;
      margin: 2rem 0 1rem;
      color: var(--color-text);
    }

    .readme-content h3 {
      font-size: 1.25rem;
      margin: 1.5rem 0 0.75rem;
      color: var(--color-text-muted);
    }

    /* Paragraphs and text */
    .readme-content p {
      margin: 1rem 0;
      color: var(--color-text-muted);
    }

    .readme-content blockquote {
      border-left: 4px solid var(--color-primary);
      padding-left: 1rem;
      margin: 1.5rem 0;
      font-style: italic;
      color: var(--color-text-muted);
    }

    /* Links */
    .readme-content a {
      color: var(--color-primary-light);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .readme-content a:hover {
      color: var(--color-accent-yellow);
      text-decoration: underline;
    }

    /* Lists */
    .readme-content ul,
    .readme-content ol {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }

    .readme-content li {
      margin: 0.5rem 0;
      color: var(--color-text-muted);
    }

    /* Code */
    .readme-content code {
      background: var(--color-background-secondary);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 0.9em;
      color: var(--color-accent-pink);
    }

    .readme-content pre {
      background: var(--color-background-secondary);
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid rgba(101, 69, 245, 0.2);
    }

    .readme-content pre code {
      background: none;
      padding: 0;
      color: var(--color-text);
    }

    /* Horizontal rule */
    .readme-content hr {
      border: none;
      border-top: 1px solid rgba(101, 69, 245, 0.3);
      margin: 2rem 0;
    }

    /* Strong text */
    .readme-content strong {
      color: var(--color-text);
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .landing-nav {
        padding: 0 1rem;
      }

      .nav-links {
        gap: 1rem;
      }

      .nav-links a:not(.docs-link) {
        display: none;
      }

      .readme-content {
        padding: calc(var(--nav-height) + 1rem) 1rem 2rem;
      }

      .readme-content h1 {
        font-size: 2rem;
      }

      .readme-content h2 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <nav class="landing-nav">
    <a href="/" class="nav-logo">
      <img src="v${latestVersion}/media/magek-logo.svg" alt="Magek" onerror="this.parentElement.textContent='Magek'">
    </a>
    <div class="nav-links">
      <a href="https://github.com/theam/magek" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="/v${latestVersion}/" class="docs-link">Documentation</a>
    </div>
  </nav>
  <main class="readme-content">
${readmeHtml}
  </main>
</body>
</html>`;
}

main();
