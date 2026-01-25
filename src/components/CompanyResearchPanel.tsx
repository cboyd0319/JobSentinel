import { useState, useEffect, memo } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import { COMPANY_CACHE_TTL } from '../utils/constants';

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
  // Culture signals
  remotePolicy?: string;
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
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
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
    const oldest = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
    delete cache[oldest];
  }

  saveCache(cache);
}

// Well-known companies database (fallback when APIs aren't available)
const KNOWN_COMPANIES: Record<string, Partial<CompanyInfo>> = {
  // FAANG / Big Tech
  'google': {
    industry: 'Technology',
    founded: '1998',
    headquarters: 'Mountain View, CA',
    employeeCount: '180,000+',
    website: 'https://google.com',
    glassdoorRating: 4.4,
    remotePolicy: 'Hybrid',
    techStack: ['Go', 'Python', 'C++', 'Java', 'Angular', 'Kubernetes', 'BigQuery', 'TensorFlow'],
  },
  'meta': {
    industry: 'Technology / Social Media',
    founded: '2004',
    headquarters: 'Menlo Park, CA',
    employeeCount: '67,000+',
    website: 'https://meta.com',
    glassdoorRating: 4.1,
    remotePolicy: 'Hybrid',
    techStack: ['React', 'Hack/PHP', 'Python', 'C++', 'GraphQL', 'PyTorch', 'Presto'],
  },
  'amazon': {
    industry: 'Technology / E-commerce',
    founded: '1994',
    headquarters: 'Seattle, WA',
    employeeCount: '1,500,000+',
    website: 'https://amazon.com',
    glassdoorRating: 3.9,
    remotePolicy: 'Varies by team',
    techStack: ['Java', 'Python', 'TypeScript', 'React', 'AWS', 'DynamoDB', 'Redshift'],
  },
  'microsoft': {
    industry: 'Technology',
    founded: '1975',
    headquarters: 'Redmond, WA',
    employeeCount: '220,000+',
    website: 'https://microsoft.com',
    glassdoorRating: 4.3,
    remotePolicy: 'Hybrid',
    techStack: ['C#', '.NET', 'TypeScript', 'React', 'Azure', 'SQL Server', 'PowerShell'],
  },
  'apple': {
    industry: 'Technology / Consumer Electronics',
    founded: '1976',
    headquarters: 'Cupertino, CA',
    employeeCount: '160,000+',
    website: 'https://apple.com',
    glassdoorRating: 4.2,
    remotePolicy: 'Mostly On-site',
    techStack: ['Swift', 'Objective-C', 'Python', 'C++', 'Metal', 'Core ML'],
  },
  'netflix': {
    industry: 'Entertainment / Streaming',
    founded: '1997',
    headquarters: 'Los Gatos, CA',
    employeeCount: '13,000+',
    website: 'https://netflix.com',
    glassdoorRating: 4.0,
    remotePolicy: 'Hybrid',
    techStack: ['Java', 'Python', 'Node.js', 'React', 'AWS', 'Cassandra', 'Kafka'],
  },
  // AI Companies
  'openai': {
    industry: 'AI / Research',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,500+',
    website: 'https://openai.com',
    glassdoorRating: 4.1,
    fundingStage: 'Late Stage',
    remotePolicy: 'On-site preferred',
    techStack: ['Python', 'PyTorch', 'Rust', 'Go', 'Kubernetes', 'Azure'],
  },
  'anthropic': {
    industry: 'AI / Research',
    founded: '2021',
    headquarters: 'San Francisco, CA',
    employeeCount: '500+',
    website: 'https://anthropic.com',
    fundingStage: 'Series D',
    remotePolicy: 'Hybrid',
    techStack: ['Python', 'Rust', 'TypeScript', 'JAX', 'AWS', 'GCP'],
  },
  'deepmind': {
    industry: 'AI / Research',
    founded: '2010',
    headquarters: 'London, UK',
    employeeCount: '1,500+',
    website: 'https://deepmind.com',
    glassdoorRating: 4.5,
    remotePolicy: 'Hybrid',
    techStack: ['Python', 'JAX', 'TensorFlow', 'C++', 'GCP'],
  },
  'huggingface': {
    industry: 'AI / ML Platform',
    founded: '2016',
    headquarters: 'New York, NY',
    employeeCount: '200+',
    website: 'https://huggingface.co',
    glassdoorRating: 4.6,
    fundingStage: 'Series D',
    remotePolicy: 'Remote-first',
    techStack: ['Python', 'Rust', 'PyTorch', 'TypeScript', 'React'],
  },
  // Fintech
  'stripe': {
    industry: 'Fintech',
    founded: '2010',
    headquarters: 'San Francisco, CA',
    employeeCount: '8,000+',
    website: 'https://stripe.com',
    glassdoorRating: 4.3,
    fundingStage: 'Late Stage',
    remotePolicy: 'Remote-friendly',
    techStack: ['Ruby', 'Go', 'Scala', 'React', 'TypeScript', 'AWS'],
  },
  'plaid': {
    industry: 'Fintech',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,500+',
    website: 'https://plaid.com',
    glassdoorRating: 4.1,
    fundingStage: 'Series D',
    remotePolicy: 'Hybrid',
    techStack: ['Go', 'Python', 'TypeScript', 'React', 'PostgreSQL', 'Kafka'],
  },
  'square': {
    industry: 'Fintech',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '12,000+',
    website: 'https://squareup.com',
    glassdoorRating: 4.0,
    remotePolicy: 'Remote-friendly',
    techStack: ['Java', 'Kotlin', 'Ruby', 'Go', 'React Native', 'MySQL'],
  },
  'coinbase': {
    industry: 'Crypto / Fintech',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '3,500+',
    website: 'https://coinbase.com',
    glassdoorRating: 3.9,
    remotePolicy: 'Remote-first',
    techStack: ['Go', 'Ruby', 'React', 'TypeScript', 'PostgreSQL', 'MongoDB'],
  },
  'robinhood': {
    industry: 'Fintech',
    founded: '2013',
    headquarters: 'Menlo Park, CA',
    employeeCount: '3,000+',
    website: 'https://robinhood.com',
    glassdoorRating: 3.7,
    remotePolicy: 'Hybrid',
    techStack: ['Python', 'Go', 'Elixir', 'React Native', 'PostgreSQL', 'Kafka'],
  },
  // Cloud / Infrastructure
  'cloudflare': {
    industry: 'Cloud / Security',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '3,500+',
    website: 'https://cloudflare.com',
    glassdoorRating: 4.2,
    remotePolicy: 'Hybrid',
    techStack: ['Go', 'Rust', 'TypeScript', 'Lua', 'Workers', 'ClickHouse'],
  },
  'datadog': {
    industry: 'Cloud / Monitoring',
    founded: '2010',
    headquarters: 'New York, NY',
    employeeCount: '5,000+',
    website: 'https://datadoghq.com',
    glassdoorRating: 4.2,
    remotePolicy: 'Hybrid',
    techStack: ['Go', 'Python', 'React', 'Kubernetes', 'Cassandra', 'Kafka'],
  },
  'snowflake': {
    industry: 'Cloud / Data',
    founded: '2012',
    headquarters: 'Bozeman, MT',
    employeeCount: '6,000+',
    website: 'https://snowflake.com',
    glassdoorRating: 4.2,
    remotePolicy: 'Hybrid',
    techStack: ['Java', 'C++', 'Python', 'React', 'AWS', 'Azure', 'GCP'],
  },
  'databricks': {
    industry: 'Cloud / Data',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '5,500+',
    website: 'https://databricks.com',
    glassdoorRating: 4.4,
    fundingStage: 'Late Stage',
    remotePolicy: 'Hybrid',
    techStack: ['Scala', 'Python', 'Spark', 'React', 'Delta Lake', 'Kubernetes'],
  },
  'vercel': {
    industry: 'Cloud / Developer Tools',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    employeeCount: '500+',
    website: 'https://vercel.com',
    glassdoorRating: 4.5,
    fundingStage: 'Series D',
    remotePolicy: 'Remote-first',
    techStack: ['TypeScript', 'React', 'Next.js', 'Go', 'Rust', 'Edge Functions'],
  },
  'supabase': {
    industry: 'Cloud / Developer Tools',
    founded: '2020',
    headquarters: 'San Francisco, CA',
    employeeCount: '200+',
    website: 'https://supabase.com',
    glassdoorRating: 4.6,
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    techStack: ['TypeScript', 'PostgreSQL', 'Go', 'Elixir', 'React', 'Edge Functions'],
  },
  // E-commerce / Retail
  'shopify': {
    industry: 'E-commerce',
    founded: '2006',
    headquarters: 'Ottawa, Canada',
    employeeCount: '10,000+',
    website: 'https://shopify.com',
    glassdoorRating: 4.0,
    remotePolicy: 'Remote-first',
    techStack: ['Ruby', 'Go', 'React', 'TypeScript', 'GraphQL', 'MySQL'],
  },
  'instacart': {
    industry: 'E-commerce / Delivery',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '3,000+',
    website: 'https://instacart.com',
    glassdoorRating: 3.8,
    remotePolicy: 'Hybrid',
    techStack: ['Ruby', 'Python', 'Go', 'React Native', 'PostgreSQL', 'Kafka'],
  },
  'doordash': {
    industry: 'Delivery / Logistics',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '7,000+',
    website: 'https://doordash.com',
    glassdoorRating: 3.8,
    remotePolicy: 'Hybrid',
    techStack: ['Kotlin', 'Python', 'Go', 'React Native', 'PostgreSQL', 'Kafka'],
  },
  // Travel / Hospitality
  'airbnb': {
    industry: 'Travel / Hospitality',
    founded: '2008',
    headquarters: 'San Francisco, CA',
    employeeCount: '6,500+',
    website: 'https://airbnb.com',
    glassdoorRating: 4.1,
    remotePolicy: 'Remote-friendly',
    techStack: ['Ruby', 'Java', 'React', 'TypeScript', 'Airflow', 'Spark'],
  },
  'uber': {
    industry: 'Transportation / Tech',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '32,000+',
    website: 'https://uber.com',
    glassdoorRating: 4.0,
    remotePolicy: 'Hybrid',
    techStack: ['Go', 'Java', 'Python', 'Node.js', 'React', 'Cassandra', 'Kafka'],
  },
  'lyft': {
    industry: 'Transportation / Tech',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '4,000+',
    website: 'https://lyft.com',
    glassdoorRating: 3.9,
    remotePolicy: 'Hybrid',
    techStack: ['Python', 'Go', 'React Native', 'PostgreSQL', 'Kubernetes'],
  },
  // Social / Communication
  'discord': {
    industry: 'Social / Communication',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,000+',
    website: 'https://discord.com',
    glassdoorRating: 4.2,
    remotePolicy: 'Remote-friendly',
    techStack: ['Rust', 'Python', 'React', 'Elixir', 'Cassandra', 'ScyllaDB'],
  },
  'slack': {
    industry: 'Enterprise / Communication',
    founded: '2009',
    headquarters: 'San Francisco, CA',
    employeeCount: '2,500+',
    website: 'https://slack.com',
    glassdoorRating: 4.2,
    remotePolicy: 'Hybrid',
    techStack: ['Java', 'PHP', 'Go', 'React', 'MySQL', 'Kafka'],
  },
  'zoom': {
    industry: 'Communication / Video',
    founded: '2011',
    headquarters: 'San Jose, CA',
    employeeCount: '8,000+',
    website: 'https://zoom.us',
    glassdoorRating: 4.0,
    remotePolicy: 'Hybrid',
    techStack: ['C++', 'Python', 'React', 'Node.js', 'WebRTC', 'AWS'],
  },
  'figma': {
    industry: 'Design / Collaboration',
    founded: '2012',
    headquarters: 'San Francisco, CA',
    employeeCount: '1,500+',
    website: 'https://figma.com',
    glassdoorRating: 4.5,
    remotePolicy: 'Hybrid',
    techStack: ['TypeScript', 'C++', 'React', 'WebGL', 'WebAssembly', 'Rust'],
  },
  'notion': {
    industry: 'Productivity / Collaboration',
    founded: '2013',
    headquarters: 'San Francisco, CA',
    employeeCount: '500+',
    website: 'https://notion.so',
    glassdoorRating: 4.4,
    fundingStage: 'Series C',
    remotePolicy: 'Hybrid',
    techStack: ['TypeScript', 'React', 'Kotlin', 'PostgreSQL', 'Redis'],
  },
  'linear': {
    industry: 'Productivity / Developer Tools',
    founded: '2019',
    headquarters: 'San Francisco, CA',
    employeeCount: '100+',
    website: 'https://linear.app',
    glassdoorRating: 4.8,
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'GraphQL'],
  },
  // Security
  '1password': {
    industry: 'Security',
    founded: '2005',
    headquarters: 'Toronto, Canada',
    employeeCount: '900+',
    website: 'https://1password.com',
    glassdoorRating: 4.5,
    fundingStage: 'Series C',
    remotePolicy: 'Remote-first',
    techStack: ['Rust', 'Go', 'TypeScript', 'React', 'Swift', 'Electron'],
  },
  'crowdstrike': {
    industry: 'Cybersecurity',
    founded: '2011',
    headquarters: 'Austin, TX',
    employeeCount: '8,000+',
    website: 'https://crowdstrike.com',
    glassdoorRating: 4.1,
    remotePolicy: 'Hybrid',
    techStack: ['Go', 'Python', 'C++', 'Kafka', 'Cassandra', 'AWS'],
  },
  'paloalto': {
    industry: 'Cybersecurity',
    founded: '2005',
    headquarters: 'Santa Clara, CA',
    employeeCount: '12,000+',
    website: 'https://paloaltonetworks.com',
    glassdoorRating: 4.1,
    remotePolicy: 'Hybrid',
    techStack: ['Python', 'Go', 'C', 'React', 'Kubernetes', 'GCP'],
  },
  // Gaming
  'roblox': {
    industry: 'Gaming / Metaverse',
    founded: '2004',
    headquarters: 'San Mateo, CA',
    employeeCount: '2,000+',
    website: 'https://roblox.com',
    glassdoorRating: 4.0,
    remotePolicy: 'Hybrid',
    techStack: ['C++', 'Lua', 'Go', 'React', 'Kubernetes'],
  },
  'epic': {
    industry: 'Gaming',
    founded: '1991',
    headquarters: 'Cary, NC',
    employeeCount: '4,000+',
    website: 'https://epicgames.com',
    glassdoorRating: 4.0,
    remotePolicy: 'Hybrid',
    techStack: ['C++', 'Unreal Engine', 'Python', 'Go', 'AWS'],
  },
  // Healthcare Tech
  'oscar': {
    industry: 'Healthcare / Insurance',
    founded: '2012',
    headquarters: 'New York, NY',
    employeeCount: '3,000+',
    website: 'https://hioscar.com',
    glassdoorRating: 3.8,
    remotePolicy: 'Hybrid',
    techStack: ['Python', 'Go', 'React', 'PostgreSQL', 'Kubernetes'],
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
    techStack: ['TypeScript', 'Rust', 'Python', 'Electron', 'VS Code'],
  },
  'replit': {
    industry: 'Developer Tools / Education',
    founded: '2016',
    headquarters: 'San Francisco, CA',
    employeeCount: '200+',
    website: 'https://replit.com',
    glassdoorRating: 4.3,
    fundingStage: 'Series B',
    remotePolicy: 'Remote-friendly',
    techStack: ['Go', 'Python', 'TypeScript', 'React', 'Nix', 'GCP'],
  },
  'railway': {
    industry: 'Cloud / Developer Tools',
    founded: '2020',
    headquarters: 'San Francisco, CA',
    employeeCount: '50+',
    website: 'https://railway.app',
    fundingStage: 'Series A',
    remotePolicy: 'Remote-first',
    techStack: ['Rust', 'TypeScript', 'Go', 'React', 'Kubernetes'],
  },
  'fly': {
    industry: 'Cloud / Developer Tools',
    founded: '2017',
    headquarters: 'Chicago, IL',
    employeeCount: '100+',
    website: 'https://fly.io',
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    techStack: ['Elixir', 'Rust', 'Go', 'React', 'Firecracker'],
  },
  'planetscale': {
    industry: 'Cloud / Database',
    founded: '2018',
    headquarters: 'San Francisco, CA',
    employeeCount: '200+',
    website: 'https://planetscale.com',
    glassdoorRating: 4.5,
    fundingStage: 'Series C',
    remotePolicy: 'Remote-first',
    techStack: ['Go', 'Vitess', 'MySQL', 'TypeScript', 'React'],
  },
  'neon': {
    industry: 'Cloud / Database',
    founded: '2021',
    headquarters: 'San Francisco, CA',
    employeeCount: '100+',
    website: 'https://neon.tech',
    fundingStage: 'Series B',
    remotePolicy: 'Remote-first',
    techStack: ['Rust', 'PostgreSQL', 'TypeScript', 'React', 'Kubernetes'],
  },
  'turso': {
    industry: 'Cloud / Database',
    founded: '2022',
    headquarters: 'San Francisco, CA',
    employeeCount: '30+',
    website: 'https://turso.tech',
    fundingStage: 'Series A',
    remotePolicy: 'Remote-first',
    techStack: ['Rust', 'SQLite', 'libSQL', 'TypeScript', 'Go'],
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

export function CompanyResearchPanel({ companyName, onClose }: CompanyResearchPanelProps) {
  const [loading, setLoading] = useState(true);
  const [takingLong, setTakingLong] = useState(false);
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Show "taking longer than expected" after 5 seconds
    const slowLoadingId = setTimeout(() => {
      if (!cancelled && loading) {
        setTakingLong(true);
      }
    }, 5000);

    // Timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
      if (!cancelled && loading) {
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
      } catch (err) {
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

            {/* Tech Stack */}
            {info.techStack && info.techStack.length > 0 && (
              <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                  Tech Stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {info.techStack.map((tech) => (
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
                  Try searching for "{companyName}" on LinkedIn or Glassdoor.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

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
