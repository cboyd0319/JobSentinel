# ML Feature Quick Start

Get semantic skill matching running in 5 minutes.

## Build with ML

```bash
cd src-tauri
cargo build --release --features embedded-ml
```

## Frontend Integration

### 1. Download Model (First Use)

```typescript
import { invoke } from '@tauri-apps/api/core';

async function downloadModel() {
  try {
    const result = await invoke('download_ml_model');
    console.log('Model downloaded:', result);
  } catch (error) {
    console.error('Download failed:', error);
  }
}
```

### 2. Check ML Status

```typescript
interface ModelStatus {
  is_downloaded: boolean;
  model_path: string;
  model_size_bytes?: number;
}

async function checkMLStatus(): Promise<ModelStatus> {
  return await invoke('get_ml_status');
}
```

### 3. Semantic Skill Matching

```typescript
interface SkillMatch {
  job_skill: string;
  user_skill: string;
  similarity: number; // 0.0-1.0
}

interface SemanticMatchResult {
  overall_score: number; // 0.0-1.0
  matched_skills: SkillMatch[];
  unmatched_requirements: string[];
  unused_skills: string[];
}

async function matchSkills(
  userSkills: string[],
  jobRequirements: string[]
): Promise<SemanticMatchResult> {
  return await invoke('semantic_match_skills', {
    userSkills,
    jobRequirements,
  });
}

// Example usage
const result = await matchSkills(
  ['Python programming', 'Machine Learning', 'Data Analysis'],
  ['Python', 'ML experience', 'Statistical analysis', 'Java']
);

console.log('Match score:', result.overall_score);
console.log('Matched:', result.matched_skills);
console.log('Missing:', result.unmatched_requirements);
```

### 4. Enhanced Resume Matching

```typescript
async function matchResumeSemanticAsync(
  resumeId: number,
  jobHash: string
): Promise<SemanticMatchResult> {
  return await invoke('match_resume_semantic', {
    resumeId,
    jobHash,
  });
}
```

## UI Component Example

```tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

function MLStatusIndicator() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const s = await invoke<ModelStatus>('get_ml_status');
    setStatus(s);
  };

  const downloadModel = async () => {
    setDownloading(true);
    try {
      await invoke('download_ml_model');
      await checkStatus();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (!status) return <div>Loading...</div>;

  return (
    <div className="ml-status">
      {status.is_downloaded ? (
        <span className="text-green-600">✓ ML Ready</span>
      ) : (
        <button onClick={downloadModel} disabled={downloading}>
          {downloading ? 'Downloading...' : 'Download ML Model'}
        </button>
      )}
    </div>
  );
}
```

## Example: Skill Matching Results

```tsx
function SkillMatchResults({ result }: { result: SemanticMatchResult }) {
  return (
    <div>
      <h3>Match Score: {(result.overall_score * 100).toFixed(1)}%</h3>

      <div className="matched-skills">
        <h4>Matched Skills:</h4>
        {result.matched_skills.map((match, i) => (
          <div key={i} className="skill-match">
            <span className="user-skill">{match.user_skill}</span>
            <span className="similarity">{(match.similarity * 100).toFixed(0)}%</span>
            <span className="job-skill">{match.job_skill}</span>
          </div>
        ))}
      </div>

      {result.unmatched_requirements.length > 0 && (
        <div className="missing-skills">
          <h4>Skills to Learn:</h4>
          <ul>
            {result.unmatched_requirements.map((skill, i) => (
              <li key={i}>{skill}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Real-World Example

```typescript
// Complete workflow: Check status -> Download if needed -> Match skills
async function performSemanticMatch(userSkills: string[], jobSkills: string[]) {
  // 1. Check if ML is ready
  const status = await invoke<ModelStatus>('get_ml_status');

  if (!status.is_downloaded) {
    console.log('Downloading ML model (one-time, ~20MB)...');
    await invoke('download_ml_model');
  }

  // 2. Perform semantic matching
  const result = await invoke<SemanticMatchResult>('semantic_match_skills', {
    userSkills,
    jobRequirements: jobSkills,
  });

  // 3. Display results
  console.log(`Overall Match: ${(result.overall_score * 100).toFixed(1)}%`);

  result.matched_skills.forEach(match => {
    console.log(`✓ "${match.user_skill}" matches "${match.job_skill}" (${(match.similarity * 100).toFixed(0)}%)`);
  });

  if (result.unmatched_requirements.length > 0) {
    console.log('\nSkills to learn:');
    result.unmatched_requirements.forEach(skill => {
      console.log(`  - ${skill}`);
    });
  }

  return result;
}
```

## Performance Tips

### 1. Batch Processing

Process multiple skills at once for better performance:

```typescript
// Good: Single batch
const result = await matchSkills(
  ['Python', 'JavaScript', 'React', 'Node.js'],
  ['Python', 'JS', 'React', 'TypeScript']
);

// Bad: Multiple separate calls
const r1 = await matchSkills(['Python'], ['Python']);
const r2 = await matchSkills(['JavaScript'], ['JS']);
// ... (much slower)
```

### 2. Cache Results

Cache match results to avoid redundant computations:

```typescript
const matchCache = new Map<string, SemanticMatchResult>();

async function getCachedMatch(
  userSkills: string[],
  jobRequirements: string[]
): Promise<SemanticMatchResult> {
  const key = `${userSkills.sort().join(',')}:${jobRequirements.sort().join(',')}`;

  if (matchCache.has(key)) {
    return matchCache.get(key)!;
  }

  const result = await matchSkills(userSkills, jobRequirements);
  matchCache.set(key, result);
  return result;
}
```

### 3. Progressive Enhancement

Fall back gracefully if ML is unavailable:

```typescript
async function matchSkillsWithFallback(
  userSkills: string[],
  jobRequirements: string[]
): Promise<SemanticMatchResult> {
  try {
    const status = await invoke<ModelStatus>('get_ml_status');

    if (status.is_downloaded) {
      return await invoke('semantic_match_skills', { userSkills, jobRequirements });
    }
  } catch (error) {
    console.warn('ML not available, using keyword matching');
  }

  // Fallback to simple keyword matching
  return keywordMatch(userSkills, jobRequirements);
}

function keywordMatch(userSkills: string[], jobRequirements: string[]): SemanticMatchResult {
  const userLower = userSkills.map(s => s.toLowerCase());
  const jobLower = jobRequirements.map(s => s.toLowerCase());

  const matched_skills = jobRequirements
    .filter(req => userLower.some(skill => skill.includes(req.toLowerCase())))
    .map(job_skill => ({
      job_skill,
      user_skill: userSkills.find(s => s.toLowerCase().includes(job_skill.toLowerCase()))!,
      similarity: 1.0,
    }));

  return {
    overall_score: matched_skills.length / jobRequirements.length,
    matched_skills,
    unmatched_requirements: jobRequirements.filter(
      req => !matched_skills.some(m => m.job_skill === req)
    ),
    unused_skills: [],
  };
}
```

## Troubleshooting

### Model Download Fails

```typescript
try {
  await invoke('download_ml_model');
} catch (error) {
  if (error.includes('Failed to download')) {
    // Network issue - retry with exponential backoff
    await retryDownload();
  }
}
```

### Metal Not Available (macOS)

The system automatically falls back to CPU - no action needed.

### Out of Memory

Reduce batch size:

```typescript
// Instead of all at once
const largeSkillList = [...100 skills...];

// Process in chunks
const chunkSize = 20;
for (let i = 0; i < largeSkillList.length; i += chunkSize) {
  const chunk = largeSkillList.slice(i, i + chunkSize);
  const result = await matchSkills(chunk, jobRequirements);
  // Process result
}
```

## Testing

Mock for unit tests:

```typescript
// __mocks__/@tauri-apps/api/core.ts
export const invoke = jest.fn((cmd: string, args?: any) => {
  if (cmd === 'get_ml_status') {
    return Promise.resolve({ is_downloaded: true });
  }
  if (cmd === 'semantic_match_skills') {
    return Promise.resolve({
      overall_score: 0.75,
      matched_skills: [],
      unmatched_requirements: [],
      unused_skills: [],
    });
  }
  return Promise.resolve();
});
```

## Next Steps

1. Build the app with ML enabled
2. Add UI for model download
3. Integrate semantic matching into resume matcher
4. Add visual indicators for match quality
5. Implement caching for performance

For more details, see [ML_FEATURE.md](./ML_FEATURE.md).
