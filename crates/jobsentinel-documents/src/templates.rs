//! Application-readable resume templates for HTML rendering
//!
//! Provides 5 professional resume templates that render structured resume data
//! to clear HTML. All templates follow application readability rules:
//! - Single-column layout only
//! - Standard fonts (Arial, Calibri, Times New Roman)
//! - No tables, graphics, or icons
//! - Clear section headers
//! - Proper heading hierarchy

use serde::{Deserialize, Serialize};

pub(crate) use crate::structured_resume::TemplateId;

mod styles;

mod renderer;
pub use renderer::TemplateRenderer;

/// Template metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: TemplateId,
    pub name: &'static str,
    pub description: &'static str,
    pub preview_image: &'static str,
}

#[cfg(test)]
#[path = "templates_tests.rs"]
mod tests;
