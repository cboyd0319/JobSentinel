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
