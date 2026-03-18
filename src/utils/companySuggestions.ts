/**
 * Well-known companies for autocomplete suggestions.
 * Extracted from CompanyAutocomplete for reuse.
 */
export const COMPANY_SUGGESTIONS: Array<{
  name: string;
  displayName: string;
  industry: string;
  remotePolicy?: string;
}> = [
  // FAANG / Big Tech
  { name: 'google', displayName: 'Google', industry: 'Technology', remotePolicy: 'Hybrid' },
  { name: 'meta', displayName: 'Meta', industry: 'Social Media', remotePolicy: 'Hybrid' },
  { name: 'amazon', displayName: 'Amazon', industry: 'E-commerce', remotePolicy: 'Varies by team' },
  { name: 'microsoft', displayName: 'Microsoft', industry: 'Technology', remotePolicy: 'Hybrid' },
  { name: 'apple', displayName: 'Apple', industry: 'Consumer Electronics', remotePolicy: 'Mostly On-site' },
  { name: 'netflix', displayName: 'Netflix', industry: 'Streaming', remotePolicy: 'Hybrid' },
  // AI Companies
  { name: 'openai', displayName: 'OpenAI', industry: 'AI Research', remotePolicy: 'On-site preferred' },
  { name: 'anthropic', displayName: 'Anthropic', industry: 'AI Research', remotePolicy: 'Hybrid' },
  { name: 'deepmind', displayName: 'DeepMind', industry: 'AI Research', remotePolicy: 'Hybrid' },
  { name: 'huggingface', displayName: 'Hugging Face', industry: 'AI/ML Platform', remotePolicy: 'Remote-first' },
  // Fintech
  { name: 'stripe', displayName: 'Stripe', industry: 'Fintech', remotePolicy: 'Remote-friendly' },
  { name: 'plaid', displayName: 'Plaid', industry: 'Fintech', remotePolicy: 'Hybrid' },
  { name: 'square', displayName: 'Square', industry: 'Fintech', remotePolicy: 'Remote-friendly' },
  { name: 'coinbase', displayName: 'Coinbase', industry: 'Crypto', remotePolicy: 'Remote-first' },
  { name: 'robinhood', displayName: 'Robinhood', industry: 'Fintech', remotePolicy: 'Hybrid' },
  // Cloud / Infrastructure
  { name: 'cloudflare', displayName: 'Cloudflare', industry: 'Cloud/Security', remotePolicy: 'Hybrid' },
  { name: 'datadog', displayName: 'Datadog', industry: 'Cloud Monitoring', remotePolicy: 'Hybrid' },
  { name: 'snowflake', displayName: 'Snowflake', industry: 'Cloud Data', remotePolicy: 'Hybrid' },
  { name: 'databricks', displayName: 'Databricks', industry: 'Cloud Data', remotePolicy: 'Hybrid' },
  { name: 'vercel', displayName: 'Vercel', industry: 'Developer Tools', remotePolicy: 'Remote-first' },
  { name: 'supabase', displayName: 'Supabase', industry: 'Developer Tools', remotePolicy: 'Remote-first' },
  // E-commerce / Retail
  { name: 'shopify', displayName: 'Shopify', industry: 'E-commerce', remotePolicy: 'Remote-first' },
  { name: 'instacart', displayName: 'Instacart', industry: 'Delivery', remotePolicy: 'Hybrid' },
  { name: 'doordash', displayName: 'DoorDash', industry: 'Delivery', remotePolicy: 'Hybrid' },
  // Travel / Hospitality
  { name: 'airbnb', displayName: 'Airbnb', industry: 'Travel', remotePolicy: 'Remote-friendly' },
  { name: 'uber', displayName: 'Uber', industry: 'Transportation', remotePolicy: 'Hybrid' },
  { name: 'lyft', displayName: 'Lyft', industry: 'Transportation', remotePolicy: 'Hybrid' },
  // Social / Communication
  { name: 'discord', displayName: 'Discord', industry: 'Communication', remotePolicy: 'Remote-friendly' },
  { name: 'slack', displayName: 'Slack', industry: 'Enterprise', remotePolicy: 'Hybrid' },
  { name: 'zoom', displayName: 'Zoom', industry: 'Video', remotePolicy: 'Hybrid' },
  { name: 'figma', displayName: 'Figma', industry: 'Design', remotePolicy: 'Hybrid' },
  { name: 'notion', displayName: 'Notion', industry: 'Productivity', remotePolicy: 'Hybrid' },
  { name: 'linear', displayName: 'Linear', industry: 'Developer Tools', remotePolicy: 'Remote-first' },
  // Security
  { name: '1password', displayName: '1Password', industry: 'Security', remotePolicy: 'Remote-first' },
  { name: 'crowdstrike', displayName: 'CrowdStrike', industry: 'Cybersecurity', remotePolicy: 'Hybrid' },
  { name: 'paloalto', displayName: 'Palo Alto Networks', industry: 'Cybersecurity', remotePolicy: 'Hybrid' },
  // Gaming
  { name: 'roblox', displayName: 'Roblox', industry: 'Gaming', remotePolicy: 'Hybrid' },
  { name: 'epic', displayName: 'Epic Games', industry: 'Gaming', remotePolicy: 'Hybrid' },
  // Healthcare
  { name: 'oscar', displayName: 'Oscar Health', industry: 'Healthcare', remotePolicy: 'Hybrid' },
  // Hot Startups
  { name: 'cursor', displayName: 'Cursor', industry: 'AI/Developer Tools', remotePolicy: 'Remote-friendly' },
  { name: 'replit', displayName: 'Replit', industry: 'Developer Tools', remotePolicy: 'Remote-friendly' },
  { name: 'railway', displayName: 'Railway', industry: 'Cloud', remotePolicy: 'Remote-first' },
  { name: 'fly', displayName: 'Fly.io', industry: 'Cloud', remotePolicy: 'Remote-first' },
  { name: 'planetscale', displayName: 'PlanetScale', industry: 'Database', remotePolicy: 'Remote-first' },
  { name: 'neon', displayName: 'Neon', industry: 'Database', remotePolicy: 'Remote-first' },
  { name: 'turso', displayName: 'Turso', industry: 'Database', remotePolicy: 'Remote-first' },
];
