import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  // This makes Jest understand your @/ alias
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // Optional but usually helpful:
  clearMocks: true,
};

export default config;
