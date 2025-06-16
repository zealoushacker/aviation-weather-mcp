/**
 * Jest test setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn());

// Setup global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});