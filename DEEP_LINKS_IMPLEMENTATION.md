# Deep Link Generator Implementation

**Status:** ✅ Complete
**Version:** v2.6
**Date:** 2026-01-30

## Overview

Added a Deep Link Generator feature that creates pre-filled job search URLs for 19 job sites we can't scrape. This approach is 100% legal (just building URLs), respects site ToS, and provides a better user experience.

## Implementation

### Backend (Rust)

#### Module Structure (`src-tauri/src/core/deeplinks/`)

```
deeplinks/
├── mod.rs          - Module entry point with documentation
├── types.rs        - Type definitions (SearchCriteria, DeepLink, SiteInfo, etc.)
├── sites.rs        - Site configurations and metadata
└── generator.rs    - URL generation logic for each site
```

#### Files Created

1. **`src-tauri/src/core/deeplinks/types.rs`**
   - `SearchCriteria` - Query, location, filters
   - `DeepLink` - Site info + generated URL
   - `SiteInfo` - Site metadata (name, category, logo, notes)
   - `SiteCategory` - Enum for categorization
   - `ExperienceLevel`, `JobType`, `RemoteType` - Filter enums

2. **`src-tauri/src/core/deeplinks/sites.rs`**
   - `get_all_sites()` - Returns all 19 supported sites
   - `get_site_by_id()` - Find site by ID
   - `get_sites_by_category()` - Filter by category
   - Metadata for all sites (logos, notes, login requirements)

3. **`src-tauri/src/core/deeplinks/generator.rs`**
   - `generate_all_links()` - Generate URLs for all sites
   - `generate_link_for_site()` - Generate URL for specific site
   - Site-specific URL generators (19 functions)
   - URL encoding and parameter handling

4. **`src-tauri/src/commands/deeplinks.rs`**
   - `generate_deep_links` - Tauri command
   - `generate_deep_link` - Tauri command (single site)
   - `get_supported_sites` - Tauri command
   - `get_sites_by_category_cmd` - Tauri command
   - `open_deep_link` - Tauri command (opens in browser)

#### Tauri Commands (5)

Commands registered in `src-tauri/src/main.rs`:

```rust
commands::deeplinks::generate_deep_links,
commands::deeplinks::generate_deep_link,
commands::deeplinks::get_supported_sites,
commands::deeplinks::get_sites_by_category_cmd,
commands::deeplinks::open_deep_link,
```

#### Supported Sites (19)

**General (5):**

- Indeed
- Monster
- CareerBuilder
- SimplyHired
- ZipRecruiter

**Professional (2):**

- LinkedIn
- Glassdoor

**Tech (2):**

- Dice
- Stack Overflow Jobs

**Government (4):**

- USAJobs
- GovernmentJobs
- CalCareers (California)
- CAPPS (Texas)

**Cleared (1):**

- ClearanceJobs

**Remote (3):**

- FlexJobs
- We Work Remotely
- Remote OK

**Startups (2):**

- Wellfound (AngelList)
- Y Combinator Jobs

#### URL Parameters Supported

Sites support different parameter combinations:

| Site | Query | Location | Job Type | Remote Filter |
|------|-------|----------|----------|---------------|
| Indeed | ✅ | ✅ | ✅ | ✅ |
| LinkedIn | ✅ | ✅ | ✅ | ✅ (3 modes) |
| Monster | ✅ | ✅ | ❌ | ✅ |
| Dice | ✅ | ✅ | ❌ | ✅ |
| USAJobs | ✅ | ✅ | ❌ | ✅ |
| Others | ✅ | ✅/❌ | ❌ | ❌/✅ |

### Frontend (React/TypeScript)

#### Files Created

1. **`src/types/deeplinks.ts`**
   - TypeScript type definitions matching Rust types
   - `CATEGORY_METADATA` - UI metadata (icons, colors, labels)
   - Enums for ExperienceLevel, JobType, RemoteType, SiteCategory

2. **`src/services/deeplinks.ts`**
   - `generateDeepLinks()` - Calls Tauri command
   - `generateDeepLink()` - Single site
   - `getSupportedSites()` - Fetch all sites
   - `getSitesByCategory()` - Filter by category
   - `openDeepLink()` - Open in browser
   - Helper functions for grouping/filtering/sorting

3. **`src/components/DeepLinkGenerator.tsx`**
   - Main UI component
   - Search form (query + location)
   - Category filters
   - Site cards with logos and metadata
   - Click-to-open functionality
   - Loading states and error handling

4. **`src/pages/DeepLinksPage.tsx`**
   - Dedicated page for the feature
   - Wraps DeepLinkGenerator component

### Documentation

**`docs/user/DEEP_LINKS.md`**

- User guide
- Site listings with categories
- Usage examples
- FAQ
- Privacy/legal explanation
- Comparison with scrapers
- Troubleshooting
- Roadmap

## Tests (21 passing)

### Rust Tests

**`src/core/deeplinks/generator.rs`:**

- `test_generate_indeed_url` - Basic URL generation
- `test_generate_indeed_url_with_remote` - Remote filter
- `test_generate_linkedin_url` - LinkedIn format
- `test_generate_linkedin_url_with_job_type` - Job type filter
- `test_generate_linkedin_url_with_remote` - Remote filter
- `test_job_type_filters` - All job types
- `test_remote_type_filters` - All remote types
- `test_generate_all_links` - Bulk generation
- `test_generate_link_for_specific_site` - Single site
- `test_generate_link_for_unknown_site` - Error handling
- `test_url_encoding` - Special character encoding
- `test_normalize_location_remote_variants` - Location normalization
- `test_normalize_location_empty` - Empty location
- `test_all_site_generators` - All 19 sites work

**`src/core/deeplinks/sites.rs`:**

- `test_get_all_sites` - Returns all sites
- `test_get_site_by_id` - Lookup by ID
- `test_get_sites_by_category` - Category filtering
- `test_all_sites_have_unique_ids` - No duplicates
- `test_site_categories_represented` - All categories present

**`src/commands/deeplinks.rs`:**

- `test_generate_deep_links_basic` - Command structure
- `test_search_criteria_serialization` - JSON serde

### Test Coverage

```bash
cd src-tauri
cargo test --lib deeplinks
```

**Result:** 21 tests passed

## URL Format Examples

### Indeed

```
https://www.indeed.com/jobs?q=Software%20Engineer&l=San%20Francisco%2C%20CA&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11
```

### LinkedIn

```
https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer&location=San%20Francisco%2C%20CA&f_JT=F&f_WT=2
```

### Dice (Tech)

```
https://www.dice.com/jobs?q=Software%20Engineer&location=San%20Francisco%2C%20CA&filters.isRemote=true
```

### USAJobs (Government)

```
https://www.usajobs.gov/Search/Results?k=Software%20Engineer&l=San%20Francisco%2C%20CA
```

## Integration Points

### Core Module (`src-tauri/src/core/mod.rs`)

```rust
// v2.6+ modules - Deep link generation for non-scrapable sites
pub mod deeplinks;

// Re-exports
pub use deeplinks::{
    generate_all_links, generate_link_for_site, get_all_sites, get_site_by_id,
    get_sites_by_category, DeepLink, ExperienceLevel, JobType as DeepLinkJobType,
    RemoteType, SearchCriteria, SiteCategory, SiteInfo,
};
```

### Commands Module (`src-tauri/src/commands/mod.rs`)

```rust
pub mod deeplinks;

pub use deeplinks::{
    generate_deep_link, generate_deep_links, get_sites_by_category_cmd,
    get_supported_sites, open_deep_link,
};
```

### Main App (`src-tauri/src/main.rs`)

Commands registered in `invoke_handler![]`:

- `commands::deeplinks::generate_deep_links`
- `commands::deeplinks::generate_deep_link`
- `commands::deeplinks::get_supported_sites`
- `commands::deeplinks::get_sites_by_category_cmd`
- `commands::deeplinks::open_deep_link`

## UI/UX Design

### Component Structure

```
DeepLinksPage
└── DeepLinkGenerator
    ├── Search Form (query + location)
    ├── Category Filter Bar (7 categories + "All")
    └── Results Grid
        └── Site Cards (logo, name, notes, open button)
```

### Category Icons & Colors

- 🌐 General (blue)
- 💻 Tech (purple)
- 🏛️ Government (indigo)
- 🌍 Remote (green)
- 🚀 Startups (orange)
- 🔒 Cleared (red)
- 👔 Professional (sky)

### Site Cards Include

- Site logo (favicon)
- Site name
- Category icon
- Notes/description
- "Login required" badge (if applicable)
- "Open Search" button
- Truncated URL preview

## Privacy & Legal

**100% Legal:**

- Only generates URLs - no scraping
- Respects all site Terms of Service
- User's browser makes the request (same as manual search)
- No automation or bots involved

**100% Private:**

- URLs generated locally in the app
- No data sent to JobSentinel servers
- No tracking or analytics
- User controls when links are opened

## Future Enhancements (v2.7+)

### Planned Features

1. **Saved Searches**
   - Save favorite deep link searches
   - Quick search from dashboard
   - Search history

2. **Bulk Operations**
   - Open multiple sites at once
   - Export link list
   - Share searches

3. **Advanced Filters**
   - Salary range
   - Experience level
   - Job type (full-time, contract, etc.)

4. **Browser Extension**
   - Generate deep links from any page
   - Quick search from context menu
   - Integration with browser bookmarks

5. **More Sites (50+ total)**
   - International job boards
   - Industry-specific boards (healthcare, finance, etc.)
   - Regional/local job boards

### Code Extensibility

Adding a new site requires:

1. Add site info to `sites.rs::get_all_sites()`
2. Add URL generator function to `generator.rs`
3. Add function call to `generate_url_for_site()` match statement
4. Add tests

Example:

```rust
// In sites.rs
SiteInfo {
    id: "newsite".to_string(),
    name: "New Job Site".to_string(),
    category: SiteCategory::General,
    requires_login: false,
    logo_url: Some("https://newsite.com/favicon.ico".to_string()),
    notes: Some("Description of the site".to_string()),
}

// In generator.rs
fn generate_newsite_url(criteria: &SearchCriteria) -> Result<String> {
    let url = format!(
        "https://newsite.com/jobs?q={}",
        encode(&criteria.query)
    );
    Ok(url)
}

// In generate_url_for_site()
"newsite" => generate_newsite_url(criteria),
```

## Performance

- URL generation is instant (<1ms per site)
- No network requests during generation
- Opening links uses OS default browser (async)
- No impact on app performance

## Error Handling

- Invalid site ID → Error message
- Malformed URLs → Logged and skipped
- Browser open failure → Error message
- Empty query → Validation error

## Event Emission

When a deep link is opened:

```typescript
app.emit("deep-link-opened", { url: "https://..." });
```

Frontend can listen for analytics/tracking.

## Related Features

- **Scrapers** - Automated scraping for sites that allow it
- **Universal Importer** (v2.2) - Import jobs from any URL
- **Bookmarklet** (v2.6) - Browser integration

## Migration Guide

No migration needed - new feature, no breaking changes.

## Dependencies

**Rust:**

- `urlencoding = "2.1"` - Already in Cargo.toml
- `url = "2.5"` - Already in Cargo.toml
- `tauri-plugin-shell = "2"` - Already in dependencies

**TypeScript:**

- No new dependencies
- Uses existing `@tauri-apps/api`

## Known Limitations

1. **URL Parameter Support**
   - Not all sites support all parameters
   - Some sites require location IDs (Glassdoor)
   - Limited to GET parameters only

2. **Site Changes**
   - Sites may change URL formats
   - Requires app updates to fix
   - Users can report broken links

3. **No Automation**
   - User must manually search each site
   - No bulk apply or auto-scraping
   - Intentional to respect ToS

## Conclusion

The Deep Link Generator provides a legal, privacy-respecting way to search 19 job sites that block automated scraping. It's fast, simple, and extensible.

**Total Implementation:**

- 4 Rust modules
- 5 Tauri commands
- 4 frontend files
- 21 unit tests (all passing)
- Comprehensive documentation

**Status:** ✅ Ready for production
