//! Local resume document parsing, analysis, rendering, and export.

mod ats_analyzer;
mod ats_types;
mod export;
mod format_taxonomy;
mod parser;
mod resume_match_score;
mod skills;
mod templates;
mod types;

pub use ats_analyzer::AtsAnalyzer;
pub use ats_types::{
    AtsAnalysisResult, AtsSuggestion, FormatIssue, HardConstraintCategory, HardConstraintRisk,
    IssueSeverity, KeywordImportance, KeywordMatch, MissingKeyword, RequirementMatchState,
    RequirementReview, SuggestionCategory,
};
pub use export::{
    Certification as ExportCertification, EducationEntry, ExperienceEntry, PersonalInfo,
    Project as ExportProject, ResumeData as ExportResumeData, ResumeExporter,
    SkillCategory as ExportSkillCategory, TemplateId as ExportTemplateId,
};
pub use parser::ResumeParser;
pub use resume_match_score::calculate_resume_match_score;
pub use skills::{ExtractedSkill, SkillExtractor};
pub use templates::{
    Certification, ContactInfo, Education, Experience, ResumeData, SkillCategory, Template,
    TemplateId, TemplateRenderer,
};
pub use types::{
    ContactInfo as AtsContactInfo, DegreeLevel, Education as AtsEducation, EducationRequirement,
    Experience as AtsExperience, ExperienceRequirement, JobSkill, MatchResult, MatchResultWithJob,
    NewSkill, NullableFieldUpdate, Resume, ResumeData as AtsResumeData, Skill, SkillUpdate,
    UserSkill,
};
