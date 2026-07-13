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
  // Healthcare
  { name: 'mayoclinic', displayName: 'Mayo Clinic', industry: 'Healthcare', remotePolicy: 'Varies by role' },
  { name: 'kaiser', displayName: 'Kaiser Permanente', industry: 'Healthcare', remotePolicy: 'Hybrid' },
  { name: 'unitedhealth', displayName: 'UnitedHealth Group', industry: 'Healthcare', remotePolicy: 'Remote-friendly' },
  { name: 'cvs', displayName: 'CVS Health', industry: 'Healthcare / Retail', remotePolicy: 'Varies by role' },
  // Retail / Consumer Services
  { name: 'target', displayName: 'Target', industry: 'Retail', remotePolicy: 'Varies by role' },
  { name: 'costco', displayName: 'Costco', industry: 'Retail', remotePolicy: 'Mostly On-site' },
  { name: 'walmart', displayName: 'Walmart', industry: 'Retail', remotePolicy: 'Varies by role' },
  { name: 'homedepot', displayName: 'The Home Depot', industry: 'Retail', remotePolicy: 'Varies by role' },
  // Logistics / Transportation
  { name: 'ups', displayName: 'UPS', industry: 'Logistics', remotePolicy: 'Varies by role' },
  { name: 'fedex', displayName: 'FedEx', industry: 'Logistics', remotePolicy: 'Varies by role' },
  { name: 'dhl', displayName: 'DHL', industry: 'Logistics', remotePolicy: 'Varies by role' },
  { name: 'southwest', displayName: 'Southwest Airlines', industry: 'Transportation', remotePolicy: 'Varies by role' },
  // Finance / Insurance
  { name: 'jpmorgan', displayName: 'JPMorgan Chase', industry: 'Banking', remotePolicy: 'Hybrid' },
  { name: 'bankofamerica', displayName: 'Bank of America', industry: 'Banking', remotePolicy: 'Hybrid' },
  { name: 'capitalone', displayName: 'Capital One', industry: 'Financial Services', remotePolicy: 'Hybrid' },
  { name: 'progressive', displayName: 'Progressive', industry: 'Insurance', remotePolicy: 'Remote-friendly' },
  // Public Service / Education
  { name: 'cityofdenver', displayName: 'City and County of Denver', industry: 'Public Service', remotePolicy: 'Hybrid' },
  { name: 'stateofcolorado', displayName: 'State of Colorado', industry: 'Public Service', remotePolicy: 'Hybrid' },
  { name: 'denverpublicschools', displayName: 'Denver Public Schools', industry: 'Education', remotePolicy: 'Varies by role' },
  { name: 'arizona_state_university', displayName: 'Arizona State University', industry: 'Education', remotePolicy: 'Hybrid' },
  // Hospitality / Travel
  { name: 'marriott', displayName: 'Marriott International', industry: 'Hospitality', remotePolicy: 'Varies by role' },
  { name: 'hilton', displayName: 'Hilton', industry: 'Hospitality', remotePolicy: 'Varies by role' },
  { name: 'airbnb', displayName: 'Airbnb', industry: 'Travel', remotePolicy: 'Remote-friendly' },
  { name: 'uber', displayName: 'Uber', industry: 'Transportation', remotePolicy: 'Hybrid' },
  // Technology as one category, not the default audience
  { name: 'google', displayName: 'Google', industry: 'Technology', remotePolicy: 'Hybrid' },
  { name: 'meta', displayName: 'Meta', industry: 'Social Media', remotePolicy: 'Hybrid' },
  { name: 'amazon', displayName: 'Amazon', industry: 'E-commerce / Cloud', remotePolicy: 'Varies by team' },
  { name: 'microsoft', displayName: 'Microsoft', industry: 'Technology', remotePolicy: 'Hybrid' },
  { name: 'apple', displayName: 'Apple', industry: 'Consumer Electronics', remotePolicy: 'Mostly On-site' },
  { name: 'shopify', displayName: 'Shopify', industry: 'E-commerce', remotePolicy: 'Remote-first' },
  { name: 'stripe', displayName: 'Stripe', industry: 'Financial Technology', remotePolicy: 'Remote-friendly' },
  { name: 'openai', displayName: 'OpenAI', industry: 'AI Research', remotePolicy: 'On-site preferred' },
  { name: 'anthropic', displayName: 'Anthropic', industry: 'AI Research', remotePolicy: 'Hybrid' },
];
