import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the correct binary name based on platform
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// Path to the built Tauri application
const tauriAppPath = join(
  __dirname,
  '..',
  'src-tauri',
  'target',
  'release',
  'bundle',
  'macos',
  isWindows ? '../../../JobSentinel.exe' : isMac ? 'JobSentinel.app/Contents/MacOS/jobsentinel' : '../../../job-sentinel'
);

// Screenshot output directory
const screenshotDir = join(__dirname, 'screenshots');

let tauriDriver;

export const config = {
  // Connection
  hostname: '127.0.0.1',
  port: 4444,

  // Specs
  specs: ['./specs/**/*.e2e.js'],
  exclude: [],

  // Capabilities
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: tauriAppPath,
      },
    },
  ],

  // Test framework
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000, // 2 minutes - Tauri apps can be slow to start
  },

  // Reporters
  reporters: ['spec'],

  // Log level
  logLevel: 'warn',

  // Bail on failure
  bail: 0,

  // Base URL
  baseUrl: '',

  // Wait timeout
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Services
  services: [],

  // Hooks
  onPrepare: async function () {
    console.log('Building Tauri app for E2E tests...');
    // Note: Build should be done before running tests
    // Run: npm run tauri build -- --debug
  },

  beforeSession: async function () {
    console.log('Starting tauri-driver...');

    // Start tauri-driver
    tauriDriver = spawn(
      'tauri-driver',
      [],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    tauriDriver.stdout.on('data', (data) => {
      console.log(`tauri-driver: ${data}`);
    });

    tauriDriver.stderr.on('data', (data) => {
      console.error(`tauri-driver error: ${data}`);
    });

    // Wait for tauri-driver to be ready
    await waitOn({
      resources: ['tcp:4444'],
      timeout: 30000,
    });

    console.log('tauri-driver is ready');
  },

  afterSession: async function () {
    console.log('Stopping tauri-driver...');
    if (tauriDriver) {
      tauriDriver.kill();
    }
  },

  // Screenshot configuration
  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    if (process.env.CAPTURE_SCREENSHOTS || !passed) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const testName = test.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${testName}_${timestamp}.png`;

      try {
        await browser.saveScreenshot(join(screenshotDir, filename));
        console.log(`Screenshot saved: ${filename}`);
      } catch (e) {
        console.error('Failed to save screenshot:', e);
      }
    }
  },
};
