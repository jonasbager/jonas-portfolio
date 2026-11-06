// Skatteguiden applicant agent config
// All sensitive values are read from environment variables.

module.exports = {
  EXPIRES_AT: process.env.SKATTEGUIDEN_EXPIRES_AT || '2026-11-20T23:59:00Z',
  ACCESS_CODE: process.env.SKATTEGUIDEN_ACCESS_CODE || '',
  DAILY_BUDGET_USD: parseFloat(process.env.SKATTEGUIDEN_DAILY_BUDGET_USD || '5'),

  // Per-request limits
  MAX_TOKENS_PER_ANSWER: 600,
  MAX_REQUESTS_PER_IP_PER_HOUR: 20,
  DEMO_MAX_RUNS_PER_DAY: 5,

  // Model
  MODEL: 'claude-sonnet-5-5',

  // Azure / M365 (for live demo)
  AZURE_TENANT_ID: process.env.AZURE_TENANT_ID || '',
  AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID || '',
  AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET || '',

  // The Administrative Unit that scopes the demo app's permissions
  DEMO_AU_ID: process.env.SKATTEGUIDEN_DEMO_AU_ID || '',

  // Demo groups (object IDs, set after tenant setup)
  DEMO_GROUP_ALLSTAFF: process.env.SKATTEGUIDEN_GROUP_ALLSTAFF || '',
  DEMO_GROUP_MACBOOK: process.env.SKATTEGUIDEN_GROUP_MACBOOK || '',
  DEMO_GROUP_FINANCE: process.env.SKATTEGUIDEN_GROUP_FINANCE || '',

  // The domain for demo user UPNs (e.g. 'bager.dk')
  DEMO_DOMAIN: process.env.SKATTEGUIDEN_DEMO_DOMAIN || '',
};
