import { useState, useEffect, memo } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import { COMPANY_CACHE_TTL } from '../utils/constants';
import { readStorageValue, writeStorageValue } from '../utils/browserStorage';

interface CompanyInfo {
  name: string;
  description?: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  employeeCount?: string;
  website?: string;
  linkedinUrl?: string;
  glassdoorRating?: number;
  // Funding info (for startups)
  fundingStage?: string;
  totalFunding?: string;
  // Culture and role signals
  remotePolicy?: string;
  toolsAndSystems?: string[];
  // Legacy cache field kept so old local profile cache entries still render.
  techStack?: string[];
}

interface CompanyResearchPanelProps {
  companyName: string;
  onClose?: () => void;
}

const CACHE_KEY = 'jobsentinel_company_cache';

interface CacheEntry {
  data: CompanyInfo;
  timestamp: number;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    const stored = readStorageValue('local', CACHE_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, CacheEntry] =>
        isCacheEntry(entry[1])
      )
    );
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCompanyInfo(value: unknown): value is CompanyInfo {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }

  const optionalStringKeys = [
    "description",
    "industry",
    "founded",
    "headquarters",
    "employeeCount",
    "website",
    "linkedinUrl",
    "fundingStage",
    "totalFunding",
    "remotePolicy",
  ];
  const hasInvalidString = optionalStringKeys.some((key) => {
    const candidate = value[key];
    return candidate !== undefined && typeof candidate !== "string";
  });

  return (
    !hasInvalidString &&
    (value.glassdoorRating === undefined ||
      (typeof value.glassdoorRating === "number" && Number.isFinite(value.glassdoorRating))) &&
    (value.toolsAndSystems === undefined || isStringArray(value.toolsAndSystems)) &&
    (value.techStack === undefined || isStringArray(value.techStack))
  );
}

function isCacheEntry(value: unknown): value is CacheEntry {
  return (
    isRecord(value) &&
    isCompanyInfo(value.data) &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp)
  );
}

function saveCache(cache: Record<string, CacheEntry>): void {
  writeStorageValue('local', CACHE_KEY, JSON.stringify(cache));
}

function getCachedCompany(name: string): CompanyInfo | null {
  const cache = loadCache();
  const key = name.toLowerCase().trim();
  const entry = cache[key];

  if (entry && Date.now() - entry.timestamp < COMPANY_CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCachedCompany(name: string, data: CompanyInfo): void {
  const cache = loadCache();
  const key = name.toLowerCase().trim();
  cache[key] = { data, timestamp: Date.now() };

  // Keep cache size reasonable (max 100 companies)
  const keys = Object.keys(cache);
  if (keys.length > 100) {
    const oldest = keys.sort((a, b) => (cache[a]?.timestamp ?? 0) - (cache[b]?.timestamp ?? 0))[0];
    if (oldest) {
      delete cache[oldest];
    }
  }

  saveCache(cache);
}

function getToolsAndSystems(info: CompanyInfo): string[] {
  return info.toolsAndSystems ?? info.techStack ?? [];
}

// Well-known companies database (local fallback when live lookup is unavailable)
const KNOWN_COMPANIES: Record<string, Partial<CompanyInfo>> = {
  // Healthcare and care delivery
  'kaiser': {
    industry: 'Healthcare / Care Delivery',
    employeeCount: 'Large employer',
    website: 'https://www.kaiserpermanente.org',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Patient scheduling', 'Electronic health records', 'Care coordination', 'Member services'],
  },
  'mayo': {
    industry: 'Healthcare / Research',
    employeeCount: 'Large employer',
    website: 'https://www.mayoclinic.org',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Patient care', 'Clinical research', 'Scheduling', 'Care coordination'],
  },
  'cvs': {
    industry: 'Healthcare / Retail',
    employeeCount: 'Large employer',
    website: 'https://www.cvshealth.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Pharmacy systems', 'Customer service', 'Inventory', 'Benefits coordination'],
  },
  'cleveland clinic': {
    industry: 'Healthcare / Care Delivery',
    employeeCount: 'Large employer',
    website: 'https://my.clevelandclinic.org',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Patient care', 'Scheduling', 'Care coordination', 'Clinical operations'],
  },
  'hca healthcare': {
    industry: 'Healthcare / Hospital Operations',
    employeeCount: 'Large employer',
    website: 'https://hcahealthcare.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Patient registration', 'Clinical support', 'Case management', 'Hospital operations'],
  },
  'unitedhealth group': {
    industry: 'Healthcare / Insurance',
    employeeCount: 'Large employer',
    website: 'https://www.unitedhealthgroup.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Member services', 'Claims support', 'Care coordination', 'Benefits operations'],
  },
  // Retail, service, and trades
  'walmart': {
    industry: 'Retail / Operations',
    employeeCount: 'Large employer',
    website: 'https://www.walmart.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Store operations', 'Inventory', 'Customer service', 'Supply chain'],
  },
  'target': {
    industry: 'Retail',
    employeeCount: 'Large employer',
    website: 'https://www.target.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Guest service', 'Merchandising', 'Inventory', 'Fulfillment'],
  },
  'home depot': {
    industry: 'Retail / Trades',
    employeeCount: 'Large employer',
    website: 'https://www.homedepot.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Customer projects', 'Merchandising', 'Inventory', 'Pro desk support'],
  },
  'starbucks': {
    industry: 'Food Service / Retail',
    employeeCount: 'Large employer',
    website: 'https://www.starbucks.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Guest service', 'Scheduling', 'Store operations', 'Training'],
  },
  'costco': {
    industry: 'Retail / Warehouse',
    employeeCount: 'Large employer',
    website: 'https://www.costco.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Member service', 'Warehouse operations', 'Inventory', 'Merchandising'],
  },
  'lowes': {
    industry: 'Retail / Home Improvement',
    employeeCount: 'Large employer',
    website: 'https://www.lowes.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Customer projects', 'Store operations', 'Inventory', 'Pro services'],
  },
  'mcdonalds': {
    industry: 'Food Service',
    employeeCount: 'Large employer',
    website: 'https://www.mcdonalds.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Guest service', 'Store operations', 'Training', 'Scheduling'],
  },
  // Logistics, hospitality, finance, and public service
  'ups': {
    industry: 'Logistics',
    employeeCount: 'Large employer',
    website: 'https://www.ups.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Route planning', 'Package handling', 'Dispatch', 'Customer support'],
  },
  'marriott': {
    industry: 'Hospitality',
    employeeCount: 'Large employer',
    website: 'https://www.marriott.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Guest service', 'Reservations', 'Event support', 'Property operations'],
  },
  'fedex': {
    industry: 'Logistics',
    employeeCount: 'Large employer',
    website: 'https://www.fedex.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Package handling', 'Dispatch', 'Route planning', 'Customer support'],
  },
  'southwest airlines': {
    industry: 'Airlines / Travel',
    employeeCount: 'Large employer',
    website: 'https://www.southwest.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Guest service', 'Reservations', 'Airport operations', 'Scheduling'],
  },
  'hilton': {
    industry: 'Hospitality',
    employeeCount: 'Large employer',
    website: 'https://www.hilton.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Guest service', 'Reservations', 'Property operations', 'Event support'],
  },
  'state farm': {
    industry: 'Insurance',
    employeeCount: 'Large employer',
    website: 'https://www.statefarm.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Claims support', 'Customer service', 'Policy servicing', 'Sales support'],
  },
  'bank of america': {
    industry: 'Banking / Financial Services',
    employeeCount: 'Large employer',
    website: 'https://www.bankofamerica.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Customer accounts', 'Financial services', 'Risk controls', 'Branch operations'],
  },
  'city of phoenix': {
    industry: 'Government / Public Service',
    employeeCount: 'Public employer',
    website: 'https://www.phoenix.gov',
    remotePolicy: 'Varies by department',
    toolsAndSystems: ['Public service', 'Case tracking', 'Community programs', 'Resident support'],
  },
  'usps': {
    industry: 'Government / Postal Service',
    employeeCount: 'Public employer',
    website: 'https://www.usps.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Mail handling', 'Route operations', 'Customer service', 'Distribution'],
  },
  'denver public schools': {
    industry: 'Education / Public Service',
    employeeCount: 'Public employer',
    website: 'https://www.dpsk12.org',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Student support', 'School operations', 'Family services', 'Program coordination'],
  },
  'progressive': {
    industry: 'Insurance',
    employeeCount: 'Large employer',
    website: 'https://www.progressive.com',
    remotePolicy: 'Varies by role',
    toolsAndSystems: ['Claims support', 'Customer service', 'Policy servicing', 'Sales support'],
  },
  // Large technology and online service employers
  'google': {
    industry: 'Technology',
    founded: '1998',
    headquarters: 'Mountain View, CA',
    employeeCount: '180,000+',
    website: 'https://google.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Search operations', 'Advertising tools', 'Customer support', 'Data reporting', 'Program coordination'],
  },
  'meta': {
    industry: 'Technology / Social Media',
    founded: '2004',
    headquarters: 'Menlo Park, CA',
    employeeCount: '67,000+',
    website: 'https://meta.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Content operations', 'Community support', 'Advertising tools', 'Trust and safety', 'Partner support'],
  },
  'amazon': {
    industry: 'Technology / E-commerce',
    founded: '1994',
    headquarters: 'Seattle, WA',
    employeeCount: '1,500,000+',
    website: 'https://amazon.com',
    remotePolicy: 'Varies by team',
    toolsAndSystems: ['Fulfillment operations', 'Seller support', 'Inventory systems', 'Customer service', 'Workforce scheduling'],
  },
  'microsoft': {
    industry: 'Technology',
    founded: '1975',
    headquarters: 'Redmond, WA',
    employeeCount: '220,000+',
    website: 'https://microsoft.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer success', 'Business applications', 'Support operations', 'Partner programs', 'Documentation'],
  },
  'apple': {
    industry: 'Technology / Consumer Electronics',
    founded: '1976',
    headquarters: 'Cupertino, CA',
    employeeCount: '160,000+',
    website: 'https://apple.com',
    remotePolicy: 'Mostly On-site',
    toolsAndSystems: ['Retail operations', 'Customer support', 'Product support', 'Inventory systems', 'Training'],
  },
  'netflix': {
    industry: 'Entertainment / Streaming',
    founded: '1997',
    headquarters: 'Los Gatos, CA',
    employeeCount: '13,000+',
    website: 'https://netflix.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Content operations', 'Member support', 'Production coordination', 'Localization', 'Partner support'],
  },
  // AI Companies
  'openai': {
    industry: 'AI / Research',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,500+',
    website: 'https://openai.com',
    fundingStage: 'Late Stage',
    remotePolicy: 'On-site preferred',
    toolsAndSystems: ['Research operations', 'Safety review', 'Customer education', 'Documentation', 'Partner support'],
  },
  'anthropic': {
    industry: 'AI / Research',
    founded: '2021',
    headquarters: 'San Francisco, CA',
    employeeCount: '500+',
    website: 'https://anthropic.com',
    fundingStage: 'Series D',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Research operations', 'Policy review', 'Customer education', 'Support operations', 'Documentation'],
  },
  'deepmind': {
    industry: 'AI / Research',
    founded: '2010',
    headquarters: 'London, UK',
    employeeCount: '1,500+',
    website: 'https://deepmind.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Research operations', 'Data review', 'Academic partnerships', 'Documentation', 'Program support'],
  },
  'huggingface': {
    industry: 'AI / ML Platform',
    founded: '2016',
    headquarters: 'New York, NY',
    employeeCount: '200+',
    website: 'https://huggingface.co',
    fundingStage: 'Series D',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Community support', 'Documentation', 'Partner programs', 'Content review', 'Education support'],
  },
  // Fintech
  'stripe': {
    industry: 'Fintech',
    founded: '2010',
    headquarters: 'San Francisco, CA',
    employeeCount: '8,000+',
    website: 'https://stripe.com',
    fundingStage: 'Late Stage',
    remotePolicy: 'Remote-friendly',
    toolsAndSystems: ['Payment operations', 'Risk review', 'Customer accounts', 'Compliance support', 'Partner support'],
  },
  'plaid': {
    industry: 'Fintech',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,500+',
    website: 'https://plaid.com',
    fundingStage: 'Series D',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Account connections', 'Customer support', 'Risk review', 'Compliance support', 'Partner operations'],
  },
  'square': {
    industry: 'Fintech',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '12,000+',
    website: 'https://squareup.com',
    remotePolicy: 'Remote-friendly',
    toolsAndSystems: ['Merchant support', 'Payment operations', 'Point-of-sale systems', 'Risk review', 'Customer accounts'],
  },
  'coinbase': {
    industry: 'Crypto / Fintech',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '3,500+',
    website: 'https://coinbase.com',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer accounts', 'Compliance support', 'Risk review', 'Fraud operations', 'Partner support'],
  },
  'robinhood': {
    industry: 'Fintech',
    founded: '2013',
    headquarters: 'Menlo Park, CA',
    employeeCount: '3,000+',
    website: 'https://robinhood.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer accounts', 'Brokerage operations', 'Risk review', 'Support operations', 'Compliance support'],
  },
  // Cloud / Infrastructure
  'cloudflare': {
    industry: 'Cloud / Security',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '3,500+',
    website: 'https://cloudflare.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer support', 'Security operations', 'Incident coordination', 'Account operations', 'Documentation'],
  },
  'datadog': {
    industry: 'Cloud / Monitoring',
    founded: '2010',
    headquarters: 'New York, NY',
    employeeCount: '5,000+',
    website: 'https://datadoghq.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer support', 'Incident coordination', 'Account operations', 'Usage reporting', 'Documentation'],
  },
  'snowflake': {
    industry: 'Cloud / Data',
    founded: '2012',
    headquarters: 'Bozeman, MT',
    employeeCount: '6,000+',
    website: 'https://snowflake.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer success', 'Data operations', 'Account support', 'Implementation support', 'Documentation'],
  },
  'databricks': {
    industry: 'Cloud / Data',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '5,500+',
    website: 'https://databricks.com',
    fundingStage: 'Late Stage',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer success', 'Data operations', 'Training', 'Implementation support', 'Documentation'],
  },
  'vercel': {
    industry: 'Cloud / Developer Tools',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    employeeCount: '500+',
    website: 'https://vercel.com',
    fundingStage: 'Series D',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Account operations', 'Documentation', 'Implementation support', 'Partner support'],
  },
  'supabase': {
    industry: 'Cloud / Developer Tools',
    founded: '2020',
    headquarters: 'San Francisco, CA',
    employeeCount: '200+',
    website: 'https://supabase.com',
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Documentation', 'Implementation support', 'Community programs', 'Account operations'],
  },
  // E-commerce / Retail
  'shopify': {
    industry: 'E-commerce',
    founded: '2006',
    headquarters: 'Ottawa, Canada',
    employeeCount: '10,000+',
    website: 'https://shopify.com',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Merchant support', 'E-commerce operations', 'Customer accounts', 'Order management', 'Training'],
  },
  'instacart': {
    industry: 'E-commerce / Delivery',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '3,000+',
    website: 'https://instacart.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Shopper support', 'Retail operations', 'Delivery coordination', 'Customer accounts', 'Inventory systems'],
  },
  'doordash': {
    industry: 'Delivery / Logistics',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '7,000+',
    website: 'https://doordash.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Delivery operations', 'Merchant support', 'Driver support', 'Customer service', 'Logistics planning'],
  },
  // Travel / Hospitality
  'airbnb': {
    industry: 'Travel / Hospitality',
    founded: '2008',
    headquarters: 'San Francisco, CA',
    employeeCount: '6,500+',
    website: 'https://airbnb.com',
    remotePolicy: 'Remote-friendly',
    toolsAndSystems: ['Host support', 'Guest support', 'Trust operations', 'Case management', 'Marketplace operations'],
  },
  'uber': {
    industry: 'Transportation / Tech',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '32,000+',
    website: 'https://uber.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Driver support', 'Marketplace operations', 'Customer service', 'Safety operations', 'Logistics planning'],
  },
  'lyft': {
    industry: 'Transportation / Tech',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '4,000+',
    website: 'https://lyft.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Driver support', 'Rider support', 'Safety operations', 'Customer service', 'Marketplace operations'],
  },
  // Social / Communication
  'discord': {
    industry: 'Social / Communication',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,000+',
    website: 'https://discord.com',
    remotePolicy: 'Remote-friendly',
    toolsAndSystems: ['Community support', 'Trust and safety', 'Content review', 'Partner support', 'Customer education'],
  },
  'slack': {
    industry: 'Enterprise / Communication',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '2,500+',
    website: 'https://slack.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer success', 'Account operations', 'Implementation support', 'Training', 'Documentation'],
  },
  'zoom': {
    industry: 'Communication / Video',
    founded: '2011',
    headquarters: 'San Jose, CA',
    employeeCount: '8,000+',
    website: 'https://zoom.us',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer support', 'Account operations', 'Implementation support', 'Event support', 'Training'],
  },
  'figma': {
    industry: 'Design / Collaboration',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,500+',
    website: 'https://figma.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Design operations', 'Customer education', 'Account support', 'Community programs', 'Documentation'],
  },
  'notion': {
    industry: 'Productivity / Collaboration',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '500+',
    website: 'https://notion.so',
    fundingStage: 'Series C',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Customer education', 'Account support', 'Documentation', 'Template operations', 'Community programs'],
  },
  'linear': {
    industry: 'Productivity / Developer Tools',
    founded: '2019',
    headquarters: 'San Francisco, CA',
    employeeCount: '100+',
    website: 'https://linear.app',
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Account operations', 'Documentation', 'Workflow planning', 'Implementation support'],
  },
  // Security
  '1password': {
    industry: 'Security',
    founded: '2005',
    headquarters: 'Toronto, Canada',
    employeeCount: '900+',
    website: 'https://1password.com',
    fundingStage: 'Series C',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Security operations', 'Account recovery', 'Documentation', 'Implementation support'],
  },
  'crowdstrike': {
    industry: 'Cybersecurity',
    founded: '2011',
    headquarters: 'Austin, TX',
    employeeCount: '8,000+',
    website: 'https://crowdstrike.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Security operations', 'Incident coordination', 'Customer support', 'Account operations', 'Documentation'],
  },
  'paloalto': {
    industry: 'Cybersecurity',
    founded: '2005',
    headquarters: 'Santa Clara, CA',
    employeeCount: '12,000+',
    website: 'https://paloaltonetworks.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Security operations', 'Customer support', 'Incident coordination', 'Account operations', 'Training'],
  },
  // Gaming
  'roblox': {
    industry: 'Gaming / Metaverse',
    founded: '2004',
    headquarters: 'San Mateo, CA',
    employeeCount: '2,000+',
    website: 'https://roblox.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Player support', 'Creator support', 'Trust and safety', 'Community programs', 'Content operations'],
  },
  'epic': {
    industry: 'Gaming',
    founded: '1991',
    headquarters: 'Cary, NC',
    employeeCount: '4,000+',
    website: 'https://epicgames.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Player support', 'Creator programs', 'Production support', 'Community operations', 'Training'],
  },
  // Healthcare Tech
  'oscar': {
    industry: 'Healthcare / Insurance',
    founded: '2012',
    headquarters: 'New York, NY',
    employeeCount: '3,000+',
    website: 'https://hioscar.com',
    remotePolicy: 'Hybrid',
    toolsAndSystems: ['Member support', 'Claims operations', 'Provider support', 'Care coordination', 'Compliance support'],
  },
  // Startups / Hot Companies
  'cursor': {
    industry: 'AI / Developer Tools',
    founded: '2022',
    headquarters: 'San Francisco, CA',
    employeeCount: '50+',
    website: 'https://cursor.sh',
    fundingStage: 'Series A',
    remotePolicy: 'Remote-friendly',
    toolsAndSystems: ['Customer support', 'Documentation', 'Education support', 'Account operations', 'Community programs'],
  },
  'replit': {
    industry: 'Developer Tools / Education',
    founded: '2016',
    headquarters: 'San Francisco, CA',
    employeeCount: '200+',
    website: 'https://replit.com',
    fundingStage: 'Series B',
    remotePolicy: 'Remote-friendly',
    toolsAndSystems: ['Education support', 'Customer support', 'Community programs', 'Documentation', 'Account operations'],
  },
  'railway': {
    industry: 'Cloud / Developer Tools',
    founded: '2020',
    headquarters: 'San Francisco, CA',
    employeeCount: '50+',
    website: 'https://railway.app',
    fundingStage: 'Series A',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Account operations', 'Documentation', 'Implementation support', 'Incident coordination'],
  },
  'fly': {
    industry: 'Cloud / Developer Tools',
    founded: '2017',
    headquarters: 'Chicago, IL',
    employeeCount: '100+',
    website: 'https://fly.io',
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Account operations', 'Incident coordination', 'Documentation', 'Implementation support'],
  },
  'planetscale': {
    industry: 'Cloud / Database',
    founded: '2018',
    headquarters: 'San Francisco, CA',
    employeeCount: '200+',
    website: 'https://planetscale.com',
    fundingStage: 'Series C',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Account operations', 'Documentation', 'Implementation support', 'Data operations'],
  },
  'neon': {
    industry: 'Cloud / Database',
    founded: '2021',
    headquarters: 'San Francisco, CA',
    employeeCount: '100+',
    website: 'https://neon.tech',
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Account operations', 'Documentation', 'Implementation support', 'Data operations'],
  },
  'turso': {
    industry: 'Cloud / Database',
    founded: '2022',
    headquarters: 'San Francisco, CA',
    employeeCount: '30+',
    website: 'https://turso.tech',
    fundingStage: 'Series A',
    remotePolicy: 'Remote-first',
    toolsAndSystems: ['Customer support', 'Account operations', 'Documentation', 'Implementation support', 'Data operations'],
  },
};

async function fetchCompanyInfo(companyName: string): Promise<CompanyInfo> {
  // Check cache first
  const cached = getCachedCompany(companyName);
  if (cached) {
    return cached;
  }

  // Check known companies database
  const normalizedName = companyName.toLowerCase().trim();
  const knownCompany = Object.entries(KNOWN_COMPANIES).find(([key]) =>
    normalizedName.includes(key) || key.includes(normalizedName)
  );

  if (knownCompany) {
    const info: CompanyInfo = {
      name: companyName,
      ...knownCompany[1],
    };
    setCachedCompany(companyName, info);
    return info;
  }

  // For unknown companies, return basic info
  // In a real implementation, this would call external APIs
  const info: CompanyInfo = {
    name: companyName,
    description: `Information about ${companyName} is being gathered. Check back later for more details.`,
  };

  // Cache even basic info to avoid repeated lookups
  setCachedCompany(companyName, info);
  return info;
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${
            star <= fullStars
              ? 'text-yellow-400'
              : star === fullStars + 1 && hasHalf
              ? 'text-yellow-400'
              : 'text-surface-300 dark:text-surface-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-medium text-surface-700 dark:text-surface-300">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

const InfoRow = memo(function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && (
        <div className="w-5 h-5 text-surface-400 flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{value}</p>
      </div>
    </div>
  );
});

export const CompanyResearchPanel = memo(function CompanyResearchPanel({ companyName, onClose }: CompanyResearchPanelProps) {
  const [loading, setLoading] = useState(true);
  const [takingLong, setTakingLong] = useState(false);
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Show "taking longer than expected" after 5 seconds
    const slowLoadingId = setTimeout(() => {
      if (!cancelled) {
        setTakingLong(true);
      }
    }, 5000);

    // Timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError('Request timed out. The company lookup is taking too long.');
        setLoading(false);
      }
    }, 15000);

    async function loadInfo() {
      setLoading(true);
      setTakingLong(false);
      setError(null);

      try {
        const data = await fetchCompanyInfo(companyName);
        if (!cancelled) {
          setInfo(data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load company information');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTakingLong(false);
          clearTimeout(timeoutId);
          clearTimeout(slowLoadingId);
        }
      }
    }

    loadInfo();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(slowLoadingId);
    };
  }, [companyName, retryCount]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
  };

  const toolsAndSystems = info ? getToolsAndSystems(info) : [];
  const hasDetailedInfo = info && (info.industry || info.founded || info.headquarters);

  return (
    <Card className="w-full max-w-md">
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400" />
            </div>
            <div>
              <h3 className="font-medium text-surface-900 dark:text-white">
                {companyName}
              </h3>
              <p className="text-xs text-surface-500">Company Research</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Close"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner />
            {takingLong && (
              <p className="mt-3 text-sm text-surface-500 dark:text-surface-400 text-center">
                Taking longer than expected...
              </p>
            )}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRetry}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : info ? (
          <div className="space-y-4">
            {/* Rating */}
            {info.glassdoorRating && (
              <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700">
                <span className="text-sm text-surface-600 dark:text-surface-400">Glassdoor Rating</span>
                <RatingStars rating={info.glassdoorRating} />
              </div>
            )}

            {/* Quick badges */}
            <div className="flex flex-wrap gap-2">
              {info.industry && (
                <Badge variant="sentinel">{info.industry}</Badge>
              )}
              {info.fundingStage && (
                <Badge variant="alert">{info.fundingStage}</Badge>
              )}
              {info.remotePolicy && (
                <Badge variant="surface">{info.remotePolicy}</Badge>
              )}
            </div>

            {/* Detailed info */}
            {hasDetailedInfo && (
              <div className="grid grid-cols-2 gap-x-4">
                {info.founded && (
                  <InfoRow
                    label="Founded"
                    value={info.founded}
                    icon={<CalendarIcon />}
                  />
                )}
                {info.headquarters && (
                  <InfoRow
                    label="Headquarters"
                    value={info.headquarters}
                    icon={<LocationIcon />}
                  />
                )}
                {info.employeeCount && (
                  <InfoRow
                    label="Employees"
                    value={info.employeeCount}
                    icon={<UsersIcon />}
                  />
                )}
                {info.totalFunding && (
                  <InfoRow
                    label="Total Funding"
                    value={info.totalFunding}
                    icon={<CurrencyIcon />}
                  />
                )}
              </div>
            )}

            {/* Tools and systems */}
            {toolsAndSystems.length > 0 && (
              <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                  Tools and systems
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {toolsAndSystems.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-md"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {info.description && (
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                {info.description}
              </p>
            )}

            {/* Links */}
            {info.website && (
              <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                <a
                  href={info.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
                >
                  <LinkIcon className="w-4 h-4" />
                  Visit Website
                </a>
              </div>
            )}

            {/* No detailed info message */}
            {!hasDetailedInfo && !info.glassdoorRating && (
              <div className="text-center py-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Limited information available for this company.
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  Try the official careers page and public job or review pages for "{companyName}".
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
});

// Icons
function BuildingIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
