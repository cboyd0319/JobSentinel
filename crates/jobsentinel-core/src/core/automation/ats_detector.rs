//! ATS Platform Detector
//!
//! Identifies which ATS (Applicant Tracking System) platform a job posting uses
//! based on parsed URL host/path rules and page structure.

use super::AtsPlatform;
use url::Url;

/// ATS detector
pub struct AtsDetector;

mod url_patterns;

use url_patterns::{host_matches_domain, path_contains, path_has_segment};
impl AtsDetector {
    /// Detect ATS platform from job URL
    ///
    /// # Examples
    /// ```
    /// use jobsentinel_core::automation::{AtsDetector, AtsPlatform};
    ///
    /// let platform = AtsDetector::detect_from_url("https://boards.greenhouse.io/company/jobs/123");
    /// assert_eq!(platform, AtsPlatform::Greenhouse);
    ///
    /// let platform = AtsDetector::detect_from_url("https://jobs.lever.co/company/abc-123");
    /// assert_eq!(platform, AtsPlatform::Lever);
    /// ```
    pub fn detect_from_url(url: &str) -> AtsPlatform {
        let Ok(parsed_url) = Url::parse(url) else {
            return AtsPlatform::Unknown;
        };

        let scheme = parsed_url.scheme();
        if scheme != "https" && scheme != "http" {
            return AtsPlatform::Unknown;
        }

        let Some(host) = parsed_url.host_str().map(|host| host.to_ascii_lowercase()) else {
            return AtsPlatform::Unknown;
        };

        if host_matches_domain(&host, "greenhouse.io") {
            return AtsPlatform::Greenhouse;
        }

        if host_matches_domain(&host, "lever.co") {
            return AtsPlatform::Lever;
        }

        if host_matches_domain(&host, "myworkdayjobs.com")
            || (host_matches_domain(&host, "workday.com") && path_has_segment(&parsed_url, "job"))
        {
            return AtsPlatform::Workday;
        }

        if host == "jobs.smartrecruiters.com" || host == "careers.smartrecruiters.com" {
            return AtsPlatform::SmartRecruiters;
        }

        if host == "apply.workable.com" || host == "jobs.workable.com" {
            return AtsPlatform::Workable;
        }

        if host_matches_domain(&host, "recruitee.com") {
            return AtsPlatform::Recruitee;
        }

        if host_matches_domain(&host, "taleo.net") {
            return AtsPlatform::Taleo;
        }

        if host_matches_domain(&host, "icims.com") {
            return AtsPlatform::Icims;
        }

        if host_matches_domain(&host, "bamboohr.com") && path_has_segment(&parsed_url, "careers") {
            return AtsPlatform::BambooHr;
        }

        if host_matches_domain(&host, "ashbyhq.com") {
            return AtsPlatform::AshbyHq;
        }

        if host_matches_domain(&host, "breezy.hr") {
            return AtsPlatform::BreezyHr;
        }

        if host_matches_domain(&host, "applytojob.com")
            || host_matches_domain(&host, "jazzhr.com")
            || host_matches_domain(&host, "jazz.co")
        {
            return AtsPlatform::JazzHr;
        }

        if host_matches_domain(&host, "bullhornstaffing.com")
            || (host_matches_domain(&host, "bullhorn.com") && path_contains(&parsed_url, "job"))
        {
            return AtsPlatform::Bullhorn;
        }

        if host == "jobs.jobvite.com"
            || (host_matches_domain(&host, "jobvite.com") && path_contains(&parsed_url, "job"))
        {
            return AtsPlatform::Jobvite;
        }

        if host_matches_domain(&host, "teamtailor.com") {
            return AtsPlatform::Teamtailor;
        }

        if host_matches_domain(&host, "successfactors.com")
            || host_matches_domain(&host, "sapsf.com")
            || host_matches_domain(&host, "successfactors.eu")
        {
            return AtsPlatform::SuccessFactors;
        }

        if host == "careers.oracle.com"
            || (host_matches_domain(&host, "oraclecloud.com")
                && (path_contains(&parsed_url, "career")
                    || path_contains(&parsed_url, "recruit")
                    || path_has_segment(&parsed_url, "job")))
        {
            return AtsPlatform::OracleRecruiting;
        }

        if host_matches_domain(&host, "phenompeople.com") {
            return AtsPlatform::Phenom;
        }

        if host_matches_domain(&host, "personio.de") || host_matches_domain(&host, "personio.com") {
            return AtsPlatform::Personio;
        }

        if host_matches_domain(&host, "comeet.com")
            || host_matches_domain(&host, "comeet.co")
            || host_matches_domain(&host, "sparkhire.com")
        {
            return AtsPlatform::Comeet;
        }

        if host_matches_domain(&host, "jobylon.com") {
            return AtsPlatform::Jobylon;
        }

        if host == "careers.microsoft.com" || host_matches_domain(&host, "eightfold.ai") {
            return AtsPlatform::Eightfold;
        }

        if host_matches_domain(&host, "workforcenow.adp.com") {
            return AtsPlatform::AdpRecruiting;
        }

        if host_matches_domain(&host, "ultipro.com")
            || (host_matches_domain(&host, "ukg.com") && path_contains(&parsed_url, "career"))
        {
            return AtsPlatform::Ukg;
        }

        if host == "hiring.rippling.com" {
            return AtsPlatform::Rippling;
        }

        if host_matches_domain(&host, "zohorecruit.com")
            || host_matches_domain(&host, "zohorecruit.in")
            || host_matches_domain(&host, "zohorecruit.eu")
        {
            return AtsPlatform::ZohoRecruit;
        }

        if host_matches_domain(&host, "freshteam.com") || host_matches_domain(&host, "freshteam.io")
        {
            return AtsPlatform::Freshteam;
        }

        if host_matches_domain(&host, "pinpointhq.com") {
            return AtsPlatform::Pinpoint;
        }

        if host_matches_domain(&host, "jobscore.com") {
            return AtsPlatform::JobScore;
        }

        AtsPlatform::Unknown
    }

    /// Get company career page pattern for detecting ATS
    ///
    /// Some companies host ATS on their own domain. This detects embedded ATS.
    pub fn detect_from_html(html: &str) -> AtsPlatform {
        let html_lower = html.to_lowercase();

        // Greenhouse indicators
        if html_lower.contains("greenhouse.io")
            || html_lower.contains("id=\"grnhse")
            || html_lower.contains("data-gh-")
        {
            return AtsPlatform::Greenhouse;
        }

        // Lever indicators
        if html_lower.contains("lever.co") || html_lower.contains("data-qa=\"btn-apply\"") {
            return AtsPlatform::Lever;
        }

        // Workday indicators
        if html_lower.contains("workday.com") || html_lower.contains("workday-") {
            return AtsPlatform::Workday;
        }

        if html_lower.contains("jobs.smartrecruiters.com")
            || html_lower.contains("smartrecruiters.com")
        {
            return AtsPlatform::SmartRecruiters;
        }

        if html_lower.contains("apply.workable.com") || html_lower.contains("workable.com") {
            return AtsPlatform::Workable;
        }

        if html_lower.contains("recruitee.com") {
            return AtsPlatform::Recruitee;
        }

        // Taleo indicators
        if html_lower.contains("taleo.net") || html_lower.contains("taleocentral") {
            return AtsPlatform::Taleo;
        }

        // iCIMS indicators
        if html_lower.contains("icims.com") || html_lower.contains("iCIMS") {
            return AtsPlatform::Icims;
        }

        // BambooHR indicators
        if html_lower.contains("bamboohr.com") {
            return AtsPlatform::BambooHr;
        }

        // Ashby indicators
        if html_lower.contains("ashbyhq.com") || html_lower.contains("ashby-") {
            return AtsPlatform::AshbyHq;
        }

        if html_lower.contains("breezy.hr") {
            return AtsPlatform::BreezyHr;
        }

        if html_lower.contains("applytojob.com")
            || html_lower.contains("jazzhr.com")
            || html_lower.contains("jazz.co")
        {
            return AtsPlatform::JazzHr;
        }

        if html_lower.contains("bullhornstaffing.com") || html_lower.contains("bullhorn.com") {
            return AtsPlatform::Bullhorn;
        }

        if html_lower.contains("jobs.jobvite.com") || html_lower.contains("jobvite.com") {
            return AtsPlatform::Jobvite;
        }

        if html_lower.contains("teamtailor.com") {
            return AtsPlatform::Teamtailor;
        }

        if html_lower.contains("successfactors.com") || html_lower.contains("sapsf.com") {
            return AtsPlatform::SuccessFactors;
        }

        if html_lower.contains("oraclecloud.com") || html_lower.contains("careers.oracle.com") {
            return AtsPlatform::OracleRecruiting;
        }

        if html_lower.contains("phenompeople.com") {
            return AtsPlatform::Phenom;
        }

        if html_lower.contains("personio.de") || html_lower.contains("personio.com") {
            return AtsPlatform::Personio;
        }

        if html_lower.contains("comeet.com")
            || html_lower.contains("comeet.co")
            || html_lower.contains("sparkhire.com")
        {
            return AtsPlatform::Comeet;
        }

        if html_lower.contains("jobylon.com") {
            return AtsPlatform::Jobylon;
        }

        if html_lower.contains("eightfold.ai") || html_lower.contains("careers.microsoft.com") {
            return AtsPlatform::Eightfold;
        }

        if html_lower.contains("workforcenow.adp.com") {
            return AtsPlatform::AdpRecruiting;
        }

        if html_lower.contains("ultipro.com") || html_lower.contains("ukg.com") {
            return AtsPlatform::Ukg;
        }

        if html_lower.contains("hiring.rippling.com") {
            return AtsPlatform::Rippling;
        }

        if html_lower.contains("zohorecruit.com")
            || html_lower.contains("zohorecruit.in")
            || html_lower.contains("zohorecruit.eu")
        {
            return AtsPlatform::ZohoRecruit;
        }

        if html_lower.contains("freshteam.com") || html_lower.contains("freshteam.io") {
            return AtsPlatform::Freshteam;
        }

        if html_lower.contains("pinpointhq.com") {
            return AtsPlatform::Pinpoint;
        }

        if html_lower.contains("jobscore.com") {
            return AtsPlatform::JobScore;
        }

        AtsPlatform::Unknown
    }

    /// Get known form fields for an ATS platform
    ///
    /// Returns common field names/IDs used by the platform
    pub fn get_common_fields(platform: &AtsPlatform) -> Vec<&'static str> {
        match platform {
            AtsPlatform::Greenhouse => vec![
                "first_name",
                "last_name",
                "email",
                "phone",
                "resume",
                "cover_letter",
                "linkedin",
            ],
            AtsPlatform::Lever => vec![
                "name",
                "email",
                "phone",
                "resume",
                "org",
                "cards[Apply].fields[Full name]",
            ],
            AtsPlatform::Workday => vec![
                "input-1",             // First Name
                "input-2",             // Last Name
                "input-3",             // Email
                "input-4",             // Phone
                "input-file-upload-0", // Resume
            ],
            AtsPlatform::Taleo => vec![
                "text1", // First Name
                "text2", // Last Name
                "text3", // Email
                "text4", // Phone
                "file_resume",
            ],
            AtsPlatform::Icims => vec![
                "applicant.firstName",
                "applicant.lastName",
                "applicant.email",
                "applicant.phone",
                "resumeUpload",
            ],
            AtsPlatform::BambooHr => vec!["first_name", "last_name", "email", "phone", "resume"],
            AtsPlatform::AshbyHq => vec!["name", "email", "phone", "resume", "linkedin_url"],
            AtsPlatform::SmartRecruiters => vec![
                "firstName",
                "lastName",
                "email",
                "phoneNumber",
                "resume",
                "linkedin",
            ],
            AtsPlatform::Workable
            | AtsPlatform::Recruitee
            | AtsPlatform::BreezyHr
            | AtsPlatform::JazzHr
            | AtsPlatform::Bullhorn
            | AtsPlatform::Jobvite
            | AtsPlatform::Teamtailor
            | AtsPlatform::SuccessFactors
            | AtsPlatform::OracleRecruiting
            | AtsPlatform::Phenom
            | AtsPlatform::Personio
            | AtsPlatform::Comeet
            | AtsPlatform::Jobylon
            | AtsPlatform::Eightfold
            | AtsPlatform::AdpRecruiting
            | AtsPlatform::Ukg
            | AtsPlatform::Rippling
            | AtsPlatform::ZohoRecruit
            | AtsPlatform::Freshteam
            | AtsPlatform::Pinpoint
            | AtsPlatform::JobScore => {
                vec![
                    "name",
                    "first_name",
                    "last_name",
                    "email",
                    "phone",
                    "resume",
                ]
            }
            AtsPlatform::Unknown => vec![],
        }
    }

    /// Get platform-specific automation notes/tips
    pub fn get_automation_notes(platform: &AtsPlatform) -> &'static str {
        match platform {
            AtsPlatform::Greenhouse => {
                "Greenhouse: Usually has iframe embed. Look for #grnhse_app. \
                 May require clicking 'Submit Application' button."
            }
            AtsPlatform::Lever => {
                "Lever: Form fields use 'cards[Apply].fields[...]' naming. \
                 Resume upload is usually drag-and-drop or file input."
            }
            AtsPlatform::Workday => {
                "Workday: Complex multi-step form. Uses generic field IDs (input-1, input-2). \
                 Requires navigation through multiple pages. High automation difficulty."
            }
            AtsPlatform::SmartRecruiters => {
                "SmartRecruiters: Employer-scoped application forms with common contact, resume, \
                 and screening fields. Review before submitting."
            }
            AtsPlatform::Workable => {
                "Workable: Employer career pages often expose common contact and resume fields. \
                 Review every field before submitting."
            }
            AtsPlatform::Recruitee => {
                "Recruitee: Careers pages usually use modern forms with contact and resume fields. \
                 Review screening questions before submitting."
            }
            AtsPlatform::Taleo => {
                "Taleo: Legacy ATS with clunky UI. Uses generic field names (text1, text2). \
                 May have long load times."
            }
            AtsPlatform::Icims => {
                "iCIMS: Field names use applicant.* prefix. \
                 Often has screening questions on separate pages."
            }
            AtsPlatform::BambooHr => {
                "BambooHR: Simple, clean forms. Standard field names. \
                 Good candidate for automation."
            }
            AtsPlatform::AshbyHq => {
                "Ashby: Modern ATS with clean UI. Usually single-page application. \
                 Good automation candidate."
            }
            AtsPlatform::BreezyHr
            | AtsPlatform::JazzHr
            | AtsPlatform::Bullhorn
            | AtsPlatform::Jobvite
            | AtsPlatform::Teamtailor
            | AtsPlatform::SuccessFactors
            | AtsPlatform::OracleRecruiting
            | AtsPlatform::Phenom
            | AtsPlatform::Personio
            | AtsPlatform::Comeet
            | AtsPlatform::Jobylon
            | AtsPlatform::Eightfold
            | AtsPlatform::AdpRecruiting
            | AtsPlatform::Ukg
            | AtsPlatform::Rippling
            | AtsPlatform::ZohoRecruit
            | AtsPlatform::Freshteam
            | AtsPlatform::Pinpoint
            | AtsPlatform::JobScore => {
                "Recognized employer application system. JobSentinel can prepare common fields, \
                 but the user must review the page and submit manually."
            }
            AtsPlatform::Unknown => "Unknown ATS platform. Manual detection required.",
        }
    }
}

#[cfg(test)]
mod tests;
