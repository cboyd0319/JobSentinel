# Resume Builder + ATS Optimizer Enhancements Plan

## Status: READY FOR IMPLEMENTATION

## Overview

Enhance JobSentinel's resume features with 15 improvements across 5 phases.
All backend commands already exist - this is purely frontend enhancement work.

**Existing Files:**
- `src/pages/Resume.tsx` (823 lines) - Upload, skills, matching
- `src/pages/ResumeBuilder.tsx` (1315 lines) - 7-step wizard
- `src/pages/ResumeOptimizer.tsx` (583 lines) - ATS analysis

**Backend Status:** 30+ Tauri commands ready, 95% complete

---

## Phase 1: Resume.tsx Quick Wins (6 tasks, parallel)

All tasks modify `src/pages/Resume.tsx`

| Task | Description | Lines | Agent |
|------|-------------|-------|-------|
| 1.1 | Show confidence scores on skill badges | ~25 | typescript-expert |
| 1.2 | Display years of experience per skill | ~20 | typescript-expert |
| 1.3 | Add skill category filter dropdown | ~70 | typescript-expert |
| 1.4 | Visual score breakdown (skills/exp/edu) | ~60 | typescript-expert |
| 1.5 | Style gap analysis as colored list | ~35 | typescript-expert |
| 1.6 | Add proficiency distribution chart | ~90 | typescript-expert |

**Total: ~300 lines**

---

## Phase 2: ResumeOptimizer.tsx Enhancements (3 tasks, parallel)

All tasks modify `src/pages/ResumeOptimizer.tsx`

| Task | Description | Lines | Agent |
|------|-------------|-------|-------|
| 2.1 | Resume-Job side-by-side comparison view | ~180 | typescript-expert |
| 2.2 | Keyword density heatmap visualization | ~120 | typescript-expert |
| 2.3 | "Tailor Resume" button → ResumeBuilder | ~90 | typescript-expert |

**Total: ~390 lines**

---

## Phase 3: ResumeBuilder.tsx Enhancements (3 tasks, parallel)

All tasks modify `src/pages/ResumeBuilder.tsx`

| Task | Description | Lines | Agent |
|------|-------------|-------|-------|
| 3.1 | Import skills from uploaded resume | ~50 | typescript-expert |
| 3.2 | ATS score preview in Step 6 | ~60 | typescript-expert |
| 3.3 | Template thumbnail previews | ~40 | typescript-expert |

**Total: ~150 lines**

---

## Phase 4: New Reusable Components (2 tasks, sequential)

| Task | File | Lines | Agent |
|------|------|-------|-------|
| 4.1 | `src/components/ResumeMatchScoreBreakdown.tsx` | ~150 | typescript-expert |
| 4.2 | `src/components/SkillCategoryFilter.tsx` | ~80 | typescript-expert |

**Also update:** `src/components/index.ts` to export new components

**Total: ~230 lines**

---

## Phase 5: Documentation (3 tasks, parallel)

| Task | File | Agent |
|------|------|-------|
| 5.1 | `docs/features/resume-matcher.md` - Add new UI features | docs-expert |
| 5.2 | `CHANGELOG.md` - Add v2.4.0 section | docs-expert |
| 5.3 | `docs/ROADMAP.md` - Update completed items | docs-expert |

---

## Execution Strategy

```
WAVE 1 (6 parallel agents)
├── 1.1 Confidence scores
├── 1.2 Years experience
├── 1.3 Category filtering
├── 1.4 Score breakdown
├── 1.5 Gap analysis styling
└── 1.6 Proficiency chart

WAVE 2 (6 parallel agents - can start immediately)
├── 2.1 Comparison view
├── 2.2 Keyword heatmap
├── 2.3 Tailor wizard button
├── 3.1 Import skills
├── 3.2 ATS preview
└── 3.3 Template thumbnails

WAVE 3 (after Wave 1-2 complete)
├── 4.1 ResumeMatchScoreBreakdown component
└── 4.2 SkillCategoryFilter component

WAVE 4 (after all code complete)
├── 5.1 Update resume-matcher.md
├── 5.2 Update CHANGELOG.md
└── 5.3 Update ROADMAP.md

FINAL: Build verification + commit
```

---

## Files to Modify

**Frontend Pages:**
- `src/pages/Resume.tsx` - Phase 1 enhancements
- `src/pages/ResumeOptimizer.tsx` - Phase 2 enhancements
- `src/pages/ResumeBuilder.tsx` - Phase 3 enhancements

**New Components:**
- `src/components/ResumeMatchScoreBreakdown.tsx` - NEW
- `src/components/SkillCategoryFilter.tsx` - NEW
- `src/components/index.ts` - Add exports

**Documentation:**
- `docs/features/resume-matcher.md`
- `CHANGELOG.md`
- `docs/ROADMAP.md`

---

## Implementation Details

### 1.1 Confidence Scores on Skills

```tsx
// In skill badge, add confidence indicator
<Badge>
  {skill.skill_name}
  <span className="text-xs opacity-60 ml-1">
    {Math.round(skill.confidence_score * 100)}%
  </span>
</Badge>
```

### 1.3 Category Filter

```tsx
const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

const filteredSkills = categoryFilter
  ? skills.filter(s => s.skill_category === categoryFilter)
  : skills;

// Add dropdown above skills list
<select value={categoryFilter || ''} onChange={e => setCategoryFilter(e.target.value || null)}>
  <option value="">All Categories</option>
  {SKILL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
</select>
```

### 1.4 Score Breakdown

```tsx
// Use existing ScoreBar or create inline bars
<div className="flex gap-2">
  <ScoreBar label="Skills" value={match.skills_match_score} weight="50%" />
  <ScoreBar label="Experience" value={match.experience_match_score} weight="30%" />
  <ScoreBar label="Education" value={match.education_match_score} weight="20%" />
</div>
```

### 2.1 Comparison View

```tsx
const [showComparison, setShowComparison] = useState(false);

{showComparison && (
  <div className="grid grid-cols-2 gap-4">
    <div className="border-r pr-4">
      <h3>Job Requirements</h3>
      {/* Highlight matched keywords in green */}
    </div>
    <div className="pl-4">
      <h3>Your Resume</h3>
      {/* Highlight found keywords in green, missing in red */}
    </div>
  </div>
)}
```

### 2.2 Keyword Heatmap

```tsx
// Group by importance, show frequency as color intensity
<div className="grid grid-cols-3 gap-4">
  <div>
    <h4>Required</h4>
    {requiredKeywords.map(kw => (
      <Badge style={{ opacity: 0.3 + (kw.frequency / maxFreq) * 0.7 }}>
        {kw.keyword} ({kw.frequency})
      </Badge>
    ))}
  </div>
  {/* Similar for Preferred and Industry */}
</div>
```

### 3.1 Import Skills from Resume

```tsx
const handleImportSkills = async () => {
  const activeResume = await invoke<Resume>('get_active_resume');
  if (activeResume) {
    const userSkills = await invoke<UserSkill[]>('get_user_skills', { resumeId: activeResume.id });
    const mapped = userSkills.map(s => ({
      name: s.skill_name,
      category: s.skill_category || 'Other',
      proficiency: s.proficiency_level || 'Intermediate',
      years_experience: s.years_experience
    }));
    setSkills(prev => [...prev, ...mapped]);
  }
};
```

---

## Verification Plan

1. **TypeScript Check:** `npm run build` - no type errors
2. **Visual Check:** Open each page, verify dark mode
3. **Functional Check:**
   - Resume.tsx: Upload resume, see confidence scores, filter by category
   - ResumeOptimizer.tsx: Paste job, see heatmap, click comparison view
   - ResumeBuilder.tsx: Import skills from resume, see ATS preview
4. **Keyboard Check:** Cmd+3, Cmd+7, Cmd+8 navigate correctly
5. **Run tests:** `npm test` (if any exist)

---

## Estimated Effort

| Phase | Tasks | Est. Lines | Parallel Agents |
|-------|-------|------------|-----------------|
| 1 | 6 | ~300 | 6 |
| 2 | 3 | ~390 | 3 |
| 3 | 3 | ~150 | 3 |
| 4 | 2 | ~230 | 1-2 |
| 5 | 3 | ~100 | 3 |

**Total: ~1,170 new/modified lines**
**Max parallel agents: 12 (Wave 1+2 combined)**
