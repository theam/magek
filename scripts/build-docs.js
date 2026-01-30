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

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');

// Require marked from docs/node_modules where it's installed
const { Marked } = require(path.join(DOCS_DIR, 'node_modules/marked'));
const marked = new Marked();
const OUTPUT_DIR = path.join(ROOT, 'common/temp/docs-site');

function getVersion() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args[0].replace(/^v/, '');
  }
  try {
    return require('../packages/core/package.json').version;
  } catch (err) {
    console.error('Error: Could not read version from packages/core/package.json');
    console.error('Please specify a version as an argument: node scripts/build-docs.js <version>');
    process.exit(1);
  }
}

function main() {
  const VERSION = getVersion();
  console.log(`Building docs site for v${VERSION}...`);

  // Clean output directory
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Build TypeDoc to versioned folder
  const versionedDir = path.join(OUTPUT_DIR, `v${VERSION}`);
  console.log(`\n[1/5] Building TypeDoc to ${versionedDir}...`);
  try {
    execSync(`npx typedoc --out "${versionedDir}"`, {
      cwd: DOCS_DIR,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('\nError: Failed to build TypeDoc documentation.');
    fs.rmSync(versionedDir, { recursive: true, force: true });
    process.exit(1);
  }

  // 2. Copy media and theme files
  console.log('\n[2/5] Copying media and theme files...');
  const mediaDir = path.join(versionedDir, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  const logoSourcePath = path.join(DOCS_DIR, 'content/magek-logo.svg');
  if (!fs.existsSync(logoSourcePath)) {
    console.error('Error: Required file docs/content/magek-logo.svg not found');
    process.exit(1);
  }
  fs.copyFileSync(logoSourcePath, path.join(mediaDir, 'magek-logo.svg'));

  // Copy magek-theme.css to assets (required by custom.css import)
  const themeSourcePath = path.join(DOCS_DIR, 'magek-theme.css');
  const assetsDir = path.join(versionedDir, 'assets');
  if (fs.existsSync(themeSourcePath)) {
    fs.copyFileSync(themeSourcePath, path.join(assetsDir, 'magek-theme.css'));
  }

  // 3. Build landing page
  console.log('\n[3/5] Building landing page...');
  buildLandingPage(VERSION);

  // 4. Create versions.json for version selector
  console.log('\n[4/5] Creating versions.json...');
  const versionsJson = {
    latest: VERSION,
    versions: [VERSION],
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'versions.json'),
    JSON.stringify(versionsJson, null, 2)
  );

  // 5. Create CNAME for custom domain
  console.log('\n[5/5] Creating CNAME...');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'CNAME'), 'magek.ai');

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer">
  <style>
    :root {
      /* Primary Colors */
      --color-primary: #715CFE;
      --color-secondary: #EC4899;
      --color-tertiary: #F59E0B;
      --color-highlight: #FCD34D;

      /* Dark Theme Colors */
      --color-background: #0A0D23;
      --color-surface: #13173C;
      --color-text: #E7E9F7;
      --color-text-muted: #A5A7C3;

      /* Typography */
      --font-heading: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-code: 'Fira Code', 'SF Mono', Monaco, monospace;

      /* Layout */
      --max-width: 900px;
      --nav-height: 60px;
      --radius: 0.5rem;
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
      font-family: var(--font-body);
      background-color: var(--color-background);
      color: var(--color-text);
      line-height: 1.6;
      min-height: 100vh;
      font-size: 16px;
    }

    /* Navigation */
    .landing-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: var(--nav-height);
      background: var(--color-surface);
      border-bottom: 1px solid rgba(113, 92, 254, 0.2);
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
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 1.25rem;
      overflow: hidden;
      height: 32px;
      width: 32px;
      transition: width 0.3s ease;
    }

    .nav-logo.expanded {
      width: 130px;
    }

    .nav-logo img {
      height: 32px;
      width: 130px;
      max-width: none;
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

    /* Nav button base styles */
    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-text) !important;
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      font-weight: 500;
      font-size: 0.875rem;
      text-decoration: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .nav-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
      text-decoration: none;
    }

    .nav-btn i {
      font-size: 1rem;
    }

    /* GitHub link - outline style */
    .github-link {
      background: transparent;
      border: 1px solid var(--color-text-muted);
    }

    .github-link:hover {
      border-color: var(--color-text);
    }

    /* Documentation link - gradient style */
    .docs-link {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
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
      max-width: 400px;
      height: auto;
      margin: 1rem 0 2rem;
    }

    /* Headings */
    .readme-content h1,
    .readme-content h2,
    .readme-content h3 {
      font-family: var(--font-heading);
      letter-spacing: -0.5px;
      color: var(--color-text);
    }

    .readme-content h1 {
      font-size: 3rem;
      font-weight: 700;
      margin: 2.5rem 0 1rem;
      border-bottom: 2px solid var(--color-primary);
      padding-bottom: 0.5rem;
    }

    .readme-content h2 {
      font-size: 2.2rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
    }

    .readme-content h3 {
      font-size: 1.6rem;
      font-weight: 600;
      margin: 1.5rem 0 0.75rem;
      letter-spacing: -0.25px;
      color: var(--color-text-muted);
    }

    /* Paragraphs and text */
    .readme-content p {
      margin: 1rem 0;
      color: var(--color-text-muted);
      max-width: 75ch;
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
      color: var(--color-primary);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .readme-content a:hover {
      color: var(--color-highlight);
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
      background: var(--color-surface);
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-family: var(--font-code);
      font-size: 0.9em;
      color: var(--color-secondary);
    }

    .readme-content pre {
      background: var(--color-surface);
      padding: 1rem;
      border-radius: var(--radius);
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid rgba(113, 92, 254, 0.2);
    }

    .readme-content pre code {
      background: none;
      padding: 0;
      color: var(--color-text);
    }

    /* Horizontal rule */
    .readme-content hr {
      border: none;
      border-top: 1px solid rgba(113, 92, 254, 0.3);
      margin: 2rem 0;
    }

    /* Strong text */
    .readme-content strong {
      color: var(--color-text);
      font-weight: 600;
    }

    /* Footer */
    .landing-footer {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted);
      font-size: 0.875rem;
      opacity: 0.7;
      border-top: 1px solid rgba(113, 92, 254, 0.1);
    }

    .landing-footer a {
      color: var(--color-text-muted);
      text-decoration: underline;
      transition: color 0.2s ease;
    }

    .landing-footer a:hover {
      color: var(--color-text);
    }

    /* Focus states for accessibility */
    a:focus,
    button:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .landing-nav {
        padding: 0 1rem;
      }

      .nav-links {
        gap: 1rem;
      }

      .github-link {
        display: none;
      }

      .readme-content {
        padding: calc(var(--nav-height) + 1rem) 1rem 2rem;
      }

      .readme-content h1 {
        font-size: 2.2rem;
      }

      .readme-content h2 {
        font-size: 1.75rem;
      }

      .readme-content h3 {
        font-size: 1.35rem;
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
      <a href="https://github.com/theam/magek" target="_blank" rel="noopener noreferrer" class="nav-btn github-link">
        <i class="fa-brands fa-github"></i>
        Fork on GitHub
      </a>
      <a href="/v${latestVersion}/" class="nav-btn docs-link">
        <i class="fa-solid fa-book"></i>
        Documentation
      </a>
    </div>
  </nav>
  <main class="readme-content">
${readmeHtml}
  </main>
  <footer class="landing-footer">
    An open-source initiative by <a href="https://theagilemonkeys.com">The Agile Monkeys</a>
  </footer>
  <script>
    const navLogo = document.querySelector('.nav-logo');
    const mainLogo = document.querySelector('.readme-content img');

    function checkScroll() {
      if (mainLogo) {
        const logoRect = mainLogo.getBoundingClientRect();
        if (logoRect.bottom < 60) {
          navLogo.classList.add('expanded');
        } else {
          navLogo.classList.remove('expanded');
        }
      }
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
  </script>
</body>
</html>`;
}

main();
