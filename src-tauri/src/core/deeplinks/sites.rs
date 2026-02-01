//! Job Site Configurations
//!
//! URL patterns and metadata for supported job sites.

use super::types::{SiteCategory, SiteInfo};

/// Get all supported job sites
pub fn get_all_sites() -> Vec<SiteInfo> {
    vec![
        // General job boards
        SiteInfo {
            id: "indeed".to_string(),
            name: "Indeed".to_string(),
            category: SiteCategory::General,
            requires_login: false,
            logo_url: Some("https://www.indeed.com/apple-touch-icon.png".to_string()),
            notes: Some("Largest job board with millions of listings".to_string()),
        },
        SiteInfo {
            id: "monster".to_string(),
            name: "Monster".to_string(),
            category: SiteCategory::General,
            requires_login: false,
            logo_url: Some("https://www.monster.com/favicon.ico".to_string()),
            notes: Some("Established job board with career resources".to_string()),
        },
        SiteInfo {
            id: "careerbuilder".to_string(),
            name: "CareerBuilder".to_string(),
            category: SiteCategory::General,
            requires_login: false,
            logo_url: Some("https://www.careerbuilder.com/favicon.ico".to_string()),
            notes: None,
        },
        SiteInfo {
            id: "simplyhired".to_string(),
            name: "SimplyHired".to_string(),
            category: SiteCategory::General,
            requires_login: false,
            logo_url: Some("https://www.simplyhired.com/favicon.ico".to_string()),
            notes: Some("Job aggregator with salary estimates".to_string()),
        },
        SiteInfo {
            id: "ziprecruiter".to_string(),
            name: "ZipRecruiter".to_string(),
            category: SiteCategory::General,
            requires_login: false,
            logo_url: Some("https://www.ziprecruiter.com/favicon.ico".to_string()),
            notes: Some("Fast-growing job board with one-click apply".to_string()),
        },
        // Professional networking
        SiteInfo {
            id: "linkedin".to_string(),
            name: "LinkedIn".to_string(),
            category: SiteCategory::Professional,
            requires_login: true,
            logo_url: Some("https://www.linkedin.com/favicon.ico".to_string()),
            notes: Some("Professional network with extensive job listings".to_string()),
        },
        SiteInfo {
            id: "glassdoor".to_string(),
            name: "Glassdoor".to_string(),
            category: SiteCategory::Professional,
            requires_login: true,
            logo_url: Some("https://www.glassdoor.com/favicon.ico".to_string()),
            notes: Some("Job board with company reviews and salaries".to_string()),
        },
        // Tech-specific
        SiteInfo {
            id: "dice".to_string(),
            name: "Dice".to_string(),
            category: SiteCategory::Tech,
            requires_login: false,
            logo_url: Some("https://www.dice.com/favicon.ico".to_string()),
            notes: Some("Tech-focused job board for IT professionals".to_string()),
        },
        SiteInfo {
            id: "stackoverflow".to_string(),
            name: "Stack Overflow Jobs".to_string(),
            category: SiteCategory::Tech,
            requires_login: false,
            logo_url: Some("https://stackoverflow.com/favicon.ico".to_string()),
            notes: Some("Developer-focused jobs from Stack Overflow".to_string()),
        },
        // Government
        SiteInfo {
            id: "usajobs".to_string(),
            name: "USAJobs".to_string(),
            category: SiteCategory::Government,
            requires_login: false,
            logo_url: Some("https://www.usajobs.gov/favicon.ico".to_string()),
            notes: Some("Official federal government job board".to_string()),
        },
        SiteInfo {
            id: "governmentjobs".to_string(),
            name: "GovernmentJobs".to_string(),
            category: SiteCategory::Government,
            requires_login: false,
            logo_url: Some("https://www.governmentjobs.com/favicon.ico".to_string()),
            notes: Some("State and local government positions".to_string()),
        },
        SiteInfo {
            id: "cajobs".to_string(),
            name: "CalCareers (California)".to_string(),
            category: SiteCategory::Government,
            requires_login: false,
            logo_url: None,
            notes: Some("California state government jobs".to_string()),
        },
        SiteInfo {
            id: "texasjobs".to_string(),
            name: "CAPPS (Texas)".to_string(),
            category: SiteCategory::Government,
            requires_login: false,
            logo_url: None,
            notes: Some("Texas state government jobs".to_string()),
        },
        // Cleared/Security
        SiteInfo {
            id: "clearancejobs".to_string(),
            name: "ClearanceJobs".to_string(),
            category: SiteCategory::Cleared,
            requires_login: false,
            logo_url: Some("https://www.clearancejobs.com/favicon.ico".to_string()),
            notes: Some("Jobs requiring security clearances".to_string()),
        },
        // Remote-specific
        SiteInfo {
            id: "flexjobs".to_string(),
            name: "FlexJobs".to_string(),
            category: SiteCategory::Remote,
            requires_login: true,
            logo_url: Some("https://www.flexjobs.com/favicon.ico".to_string()),
            notes: Some("Curated remote and flexible jobs (subscription)".to_string()),
        },
        SiteInfo {
            id: "weworkremotely".to_string(),
            name: "We Work Remotely".to_string(),
            category: SiteCategory::Remote,
            requires_login: false,
            logo_url: Some("https://weworkremotely.com/favicon.ico".to_string()),
            notes: Some("Popular remote job board".to_string()),
        },
        SiteInfo {
            id: "remoteok".to_string(),
            name: "Remote OK".to_string(),
            category: SiteCategory::Remote,
            requires_login: false,
            logo_url: Some("https://remoteok.com/favicon.ico".to_string()),
            notes: Some("Remote jobs aggregator".to_string()),
        },
        // Startups
        SiteInfo {
            id: "wellfound".to_string(),
            name: "Wellfound (AngelList)".to_string(),
            category: SiteCategory::Startups,
            requires_login: true,
            logo_url: Some("https://wellfound.com/favicon.ico".to_string()),
            notes: Some("Startup jobs with equity information".to_string()),
        },
        SiteInfo {
            id: "ycombinator".to_string(),
            name: "Y Combinator Jobs".to_string(),
            category: SiteCategory::Startups,
            requires_login: false,
            logo_url: Some("https://www.ycombinator.com/favicon.ico".to_string()),
            notes: Some("Jobs at Y Combinator companies".to_string()),
        },
    ]
}

/// Get site info by ID
pub fn get_site_by_id(id: &str) -> Option<SiteInfo> {
    get_all_sites().into_iter().find(|s| s.id == id)
}

/// Get sites by category
pub fn get_sites_by_category(category: SiteCategory) -> Vec<SiteInfo> {
    get_all_sites()
        .into_iter()
        .filter(|s| s.category == category)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_all_sites() {
        let sites = get_all_sites();
        assert!(!sites.is_empty());
        assert!(sites.len() >= 15);
    }

    #[test]
    fn test_get_site_by_id() {
        assert!(get_site_by_id("linkedin").is_some());
        assert!(get_site_by_id("indeed").is_some());
        assert!(get_site_by_id("nonexistent").is_none());
    }

    #[test]
    fn test_get_sites_by_category() {
        let tech_sites = get_sites_by_category(SiteCategory::Tech);
        assert!(!tech_sites.is_empty());
        assert!(tech_sites.iter().all(|s| s.category == SiteCategory::Tech));

        let gov_sites = get_sites_by_category(SiteCategory::Government);
        assert!(!gov_sites.is_empty());
        assert!(gov_sites.iter().all(|s| s.category == SiteCategory::Government));
    }

    #[test]
    fn test_all_sites_have_unique_ids() {
        let sites = get_all_sites();
        let mut ids: Vec<_> = sites.iter().map(|s| &s.id).collect();
        ids.sort();
        let unique_count = ids.len();
        ids.dedup();
        assert_eq!(ids.len(), unique_count, "Duplicate site IDs found");
    }

    #[test]
    fn test_site_categories_represented() {
        let sites = get_all_sites();
        let categories: std::collections::HashSet<_> =
            sites.iter().map(|s| s.category).collect();

        // Should have at least these categories
        assert!(categories.contains(&SiteCategory::General));
        assert!(categories.contains(&SiteCategory::Tech));
        assert!(categories.contains(&SiteCategory::Government));
        assert!(categories.contains(&SiteCategory::Remote));
    }
}
