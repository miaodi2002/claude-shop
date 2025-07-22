// Jest setup file
const { TextEncoder, TextDecoder } = require('util')
require('@testing-library/jest-dom')

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Set test environment variables before any imports
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-at-least-32-characters-long'
process.env.ADMIN_USERNAME = 'testadmin'
process.env.ADMIN_PASSWORD_HASH = '$2b$10$test.hash.for.testing.purposes.only.abcdefghijk'
process.env.ENCRYPTION_KEY = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=' // base64 of 32 bytes

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Increase timeout for tests
jest.setTimeout(30000)