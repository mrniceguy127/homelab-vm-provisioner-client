import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsRoot = path.join(rootDir, 'docs', '_build', 'html');
const referenceRoot = path.join(docsRoot, 'reference');
const documentationCli = path.join(rootDir, 'node_modules', 'documentation', 'bin', 'documentation.js');

function runDocumentation(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [documentationCli, ...args], {
      cwd: rootDir,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`documentation build failed with exit code ${code}`));
    });
  });
}

function buildLandingPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Homelab VM Provisioner Client Docs</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, system-ui, sans-serif;
        background: #090e18;
        color: #edf2ff;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at top left, rgba(124, 156, 255, 0.22), transparent 32%), radial-gradient(circle at top right, rgba(108, 229, 200, 0.16), transparent 28%), #090e18;
      }
      main {
        max-width: 920px;
        margin: 0 auto;
        padding: 72px 24px;
      }
      .card {
        background: rgba(17, 24, 43, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 32px;
      }
      h1 {
        font-size: clamp(2.5rem, 6vw, 4rem);
        margin: 0 0 12px;
      }
      p {
        color: #a7b3cc;
        line-height: 1.7;
      }
      ul {
        padding-left: 20px;
        color: #c8d3eb;
      }
      a {
        color: #8eadff;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }
      .button {
        display: inline-block;
        padding: 12px 18px;
        border-radius: 999px;
        text-decoration: none;
        background: #7c9cff;
        color: #08101f;
        font-weight: 700;
      }
      .button.secondary {
        background: transparent;
        color: #8eadff;
        border: 1px solid rgba(142, 173, 255, 0.35);
      }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <p>Homelab VM Provisioner</p>
        <h1>Client Documentation</h1>
        <p>
          Generated reference documentation for the React interface, API client helpers,
          clone/provision flows, dashboard utilities, and VM log user experience.
        </p>
        <ul>
          <li>Material UI dashboard and VM detail interactions</li>
          <li>Config cloning and uniqueness enforcement helpers</li>
          <li>Provision-from-saved-config and log streaming behavior</li>
          <li>Unit and end-to-end test coverage outputs</li>
        </ul>
        <div class="actions">
          <a class="button" href="reference/index.html">Open Client Reference</a>
          <a class="button secondary" href="coverage/index.html">Open Coverage Report</a>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

await fs.rm(docsRoot, { recursive: true, force: true });
await fs.mkdir(referenceRoot, { recursive: true });

await runDocumentation([
  'build',
  'src/App.jsx',
  'src/api.js',
  'src/main.jsx',
  'src/theme.js',
  '-f',
  'html',
  '-o',
  referenceRoot,
]);

await fs.writeFile(path.join(docsRoot, 'index.html'), buildLandingPage(), 'utf8');
