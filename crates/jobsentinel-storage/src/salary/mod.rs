//! Salary Negotiation AI
//!
//! Provides salary benchmarking, prediction, and negotiation assistance.
//!
//! ## Features
//!
//! - **Salary Benchmarks** - Based on H1B public data (legal, free)
//! - **Offer Tracking** - Track and compare multiple offers
//! - **Salary Prediction** - Estimate fair market value for jobs
//! - **Negotiation Scripts** - AI-generated negotiation templates
//!
//! ## Data Sources
//!
//! 1. **H1B Salary Database** (Primary)
//!    - Source: U.S. Department of Labor (public data)
//!    - Coverage: 500K+ salaries annually
//!    - Legal: Public domain
//!
//! 2. **User-Reported Salaries** (Secondary)
//!    - Crowdsourced from JobSentinel users (opt-in)
//!    - Verified through offer letters
//!
//! ## Usage
//!
//! ```rust,ignore
//! use jobsentinel_core::salary::SalaryAnalyzer;
//!
//! let analyzer = SalaryAnalyzer::new(db_pool);
//!
//! // Predict salary for a job
//! let prediction = analyzer.predict_salary(
//!     "Care Coordinator",
//!     "Denver, CO",
//!     5 // years of experience
//! ).await?;
//!
//! println!("Expected range: ${}-${}", prediction.min, prediction.max);
//! println!("Market median: ${}", prediction.median);
//! ```

mod analyzer;
mod benchmarks;
mod negotiation;
mod predictor;
mod types;

pub use analyzer::SalaryAnalyzer;
pub use benchmarks::SalaryBenchmark;
pub use types::{OfferComparison, SalaryPrediction, SeniorityLevel};

// Tests module
#[cfg(test)]
mod tests;
