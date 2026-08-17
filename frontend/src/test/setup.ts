import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest's `globals: true` does not imply Testing Library's auto-cleanup --
// that is wired by the framework's own test-runner integration, which we are
// not using. Without this, mounted components leak between tests and a query
// like getByRole('table') finds two.
afterEach(cleanup)
