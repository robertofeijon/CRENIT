module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js", "**/*.test.js"],
  coveragePathIgnorePatterns: ["/node_modules/", "/data/"],
  collectCoverageFrom: ["server.js"],
  testTimeout: 10000,
  verbose: true
};
