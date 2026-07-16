//! SQL-backed application-assistance repositories.

mod answer_learning;
mod attempts;
mod profile;

pub use answer_learning::AnswerLearningManager;
pub use attempts::AutomationManager;
pub use profile::ProfileManager;

pub use jobsentinel_domain::{
    AnswerSource, AnswerStatistics, AnswerSuggestion, ModificationExample,
};
