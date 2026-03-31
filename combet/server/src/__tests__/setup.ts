// src/__tests__/setup.ts
// Mocks the DB pool so tests never touch the real database

jest.mock("../db", () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(() => ({
      query:   jest.fn(),
      release: jest.fn(),
    })),
  },
}));