//! Candidate-controlled application assistance.
//!
//! Users explicitly enable assistance, review every application before
//! submission, and remain responsible for the target site's terms. The app
//! stops at security challenges and does not bypass site protections.

mod ats_detector;
mod browser;
mod error;
mod form_filler;

pub use ats_detector::AtsDetector;
pub use browser::{AutomationPage, BrowserManager, FillResult};
pub use error::{AutomationError, AutomationResult};
pub use form_filler::FormFiller;
pub use jobsentinel_domain::{
    screening_question_matches, ApplicationAttempt, ApplicationProfile, ApplicationProfileInput,
    AtsPlatform, AutomationStats, AutomationStatus, ScreeningAnswer,
};

pub(super) const GENERIC_AUTOMATION_PLATFORMS: &[AtsPlatform] = &[
    AtsPlatform::BreezyHr,
    AtsPlatform::JazzHr,
    AtsPlatform::Bullhorn,
    AtsPlatform::Jobvite,
    AtsPlatform::Teamtailor,
    AtsPlatform::SuccessFactors,
    AtsPlatform::OracleRecruiting,
    AtsPlatform::Phenom,
    AtsPlatform::Personio,
    AtsPlatform::Comeet,
    AtsPlatform::Jobylon,
    AtsPlatform::Eightfold,
    AtsPlatform::AdpRecruiting,
    AtsPlatform::Ukg,
    AtsPlatform::Rippling,
    AtsPlatform::ZohoRecruit,
    AtsPlatform::Freshteam,
    AtsPlatform::Pinpoint,
    AtsPlatform::JobScore,
];

pub(super) fn has_generic_automation_contract(platform: &AtsPlatform) -> bool {
    GENERIC_AUTOMATION_PLATFORMS.contains(platform)
}
