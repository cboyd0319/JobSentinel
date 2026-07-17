use serde::{Deserialize, Serialize};

// ============================================================================
// JSON Resume Schema Types (v1.0.0)
// https://jsonresume.org/schema/
// ============================================================================

/// Root JSON Resume structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct JsonResume {
    #[serde(default)]
    pub basics: Basics,
    #[serde(default)]
    pub work: Vec<Work>,
    #[serde(default)]
    pub volunteer: Vec<Volunteer>,
    #[serde(default)]
    pub education: Vec<EducationItem>,
    #[serde(default)]
    pub awards: Vec<Award>,
    #[serde(default)]
    pub certificates: Vec<Certificate>,
    #[serde(default)]
    pub publications: Vec<Publication>,
    #[serde(default)]
    pub skills: Vec<SkillItem>,
    #[serde(default)]
    pub languages: Vec<Language>,
    #[serde(default)]
    pub interests: Vec<Interest>,
    #[serde(default)]
    pub references: Vec<Reference>,
    #[serde(default)]
    pub projects: Vec<Project>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct Basics {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub label: String,
    #[serde(default)]
    pub image: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub location: Location,
    #[serde(default)]
    pub profiles: Vec<Profile>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Location {
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub postal_code: String,
    #[serde(default)]
    pub city: String,
    #[serde(default)]
    pub country_code: String,
    #[serde(default)]
    pub region: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct Profile {
    #[serde(default)]
    pub network: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Work {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub position: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub highlights: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Volunteer {
    #[serde(default)]
    pub organization: String,
    #[serde(default)]
    pub position: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub highlights: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EducationItem {
    #[serde(default)]
    pub institution: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub area: String,
    #[serde(default)]
    pub study_type: String,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub score: String,
    #[serde(default)]
    pub courses: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct Award {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub awarder: String,
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct Certificate {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub issuer: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Publication {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub publisher: String,
    #[serde(default)]
    pub release_date: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct SkillItem {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub level: String,
    #[serde(default)]
    pub keywords: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct Language {
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub fluency: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct Interest {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub keywords: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct Reference {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub reference: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Project {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub highlights: Vec<String>,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub end_date: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub roles: Vec<String>,
    #[serde(default)]
    pub entity: String,
    #[serde(default, rename = "type")]
    pub project_type: String,
    #[serde(default)]
    pub keywords: Vec<String>,
}
