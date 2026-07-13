use super::*;

impl ScoringEngine {
    /// Calculate keyword boost ratio (used in combined resume+keyword scoring)
    pub(super) fn calculate_keyword_boost_ratio(&self, job: &Job) -> f64 {
        if self.config.keywords_boost.is_empty() {
            return 1.0; // No keywords configured = full keyword score
        }

        // Build description text only once
        let description_text = match &job.description {
            Some(desc) => format!("{} {}", job.title, desc),
            None => job.title.clone(),
        };

        let matches = self
            .config
            .keywords_boost
            .iter()
            .filter(|keyword| {
                self.synonym_map
                    .matches_with_synonyms(keyword, &description_text)
            })
            .count();

        (matches as f64 / self.config.keywords_boost.len() as f64).min(1.0)
    }

    /// Score skills match (40% weight)
    pub(super) fn score_skills(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.skills_weight;
        let mut reasons = Vec::new();

        // Check if title is in allowlist
        let title_match = self.config.title_allowlist.iter().any(|allowed_title| {
            job.title
                .to_lowercase()
                .contains(&allowed_title.to_lowercase())
        });

        if !title_match {
            return (0.0, vec!["Title not in allowlist".to_string()]);
        }

        reasons.push(format!("Title matches: {}", job.title));

        // Check if title is in blocklist
        let title_blocked = self.config.title_blocklist.iter().any(|blocked_title| {
            job.title
                .to_lowercase()
                .contains(&blocked_title.to_lowercase())
        });

        if title_blocked {
            return (0.0, vec!["Title in blocklist".to_string()]);
        }

        // Check for excluded keywords (with synonym matching)
        // Build description text only once, reuse for all keyword checks
        let description_text = match &job.description {
            Some(desc) => format!("{} {}", job.title, desc),
            None => job.title.clone(),
        };

        let has_excluded_keyword = self.config.keywords_exclude.iter().any(|keyword| {
            self.synonym_map
                .matches_with_synonyms(keyword, &description_text)
        });

        if has_excluded_keyword {
            return (0.0, vec!["Contains excluded keyword".to_string()]);
        }

        // Count boost keywords matches (with synonym matching)
        let mut boost_matches = 0;
        for keyword in &self.config.keywords_boost {
            if self
                .synonym_map
                .matches_with_synonyms(keyword, &description_text)
            {
                boost_matches += 1;
                reasons.push(format!("Keyword match: {}", keyword));
            }
        }

        // Calculate skills score based on boost keyword matches
        let score = if self.config.keywords_boost.is_empty() {
            max_score // Full score if no boost keywords configured
        } else {
            let match_ratio = boost_matches as f64 / self.config.keywords_boost.len() as f64;
            max_score * match_ratio.min(1.0)
        };

        (score, reasons)
    }

    /// Score salary match (25% weight)
    ///
    /// Graduated scoring based on comparison to target salary:
    /// - >= target: 1.0 (full score)
    /// - 90-99% of target: 0.9
    /// - 80-89% of target: 0.8
    /// - 70-79% of target: 0.6
    /// - < 70% of target: 0.3
    /// - Significantly above target (120%+): 1.0 + bonus (capped at 1.2)
    ///
    /// For salary ranges (min-max), uses midpoint for comparison.
    pub(super) fn score_salary(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.salary_weight;
        let mut reasons = Vec::new();

        // If no salary requirements configured, give full score
        if self.config.salary_floor_usd == 0 {
            return (max_score, vec!["No salary requirement".to_string()]);
        }

        // Determine target salary (use salary_target_usd if set, otherwise salary_floor_usd)
        let target_salary = self
            .config
            .salary_target_usd
            .unwrap_or(self.config.salary_floor_usd) as f64;

        // Handle missing salary data
        if job.salary_min.is_none() && job.salary_max.is_none() {
            let penalty_score = if self.config.penalize_missing_salary {
                0.3
            } else {
                0.5
            };
            reasons.push(format!(
                "Salary not specified ({}% credit)",
                (penalty_score * 100.0) as i32
            ));
            return (max_score * penalty_score, reasons);
        }

        // Calculate effective salary for comparison
        // If both min and max are available, use midpoint
        // Otherwise use whichever is available
        let effective_salary = match (job.salary_min, job.salary_max) {
            (Some(min), Some(max)) => {
                let midpoint = (min + max) as f64 / 2.0;
                reasons.push(format!(
                    "Salary range: ${}-${} (midpoint: ${})",
                    min, max, midpoint as i64
                ));
                midpoint
            }
            (Some(min), None) => {
                reasons.push(format!("Salary: ${} (minimum only)", min));
                min as f64
            }
            (None, Some(max)) => {
                reasons.push(format!("Salary: ${} (maximum only)", max));
                max as f64
            }
            (None, None) => unreachable!(), // Already handled above
        };

        // Calculate percentage of target
        let percentage = effective_salary / target_salary;

        // Graduated scoring
        let multiplier = if percentage >= 1.2 {
            // Significantly above target - give bonus (capped)
            reasons.push(format!(
                "Salary {}% of target ({}% credit + bonus)",
                (percentage * 100.0) as i32,
                120
            ));
            1.2
        } else if percentage >= 1.0 {
            // At or above target - full score
            reasons.push(format!(
                "Salary {}% of target (100% credit)",
                (percentage * 100.0) as i32
            ));
            1.0
        } else if percentage >= 0.9 {
            // 90-99% of target
            reasons.push(format!(
                "Salary {}% of target (90% credit)",
                (percentage * 100.0) as i32
            ));
            0.9
        } else if percentage >= 0.8 {
            // 80-89% of target
            reasons.push(format!(
                "Salary {}% of target (80% credit)",
                (percentage * 100.0) as i32
            ));
            0.8
        } else if percentage >= 0.7 {
            // 70-79% of target
            reasons.push(format!(
                "Salary {}% of target (60% credit)",
                (percentage * 100.0) as i32
            ));
            0.6
        } else {
            // Below 70% of target
            reasons.push(format!(
                "Salary below target: {}% of target (30% credit)",
                (percentage * 100.0) as i32
            ));
            0.3
        };

        (max_score * multiplier, reasons)
    }

    /// Score location match (20% weight)
    pub(super) fn score_location(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.location_weight;
        let mut reasons = Vec::new();

        let remote_status = match detect_remote_status(job) {
            RemoteStatus::Unspecified => RemoteStatus::Onsite,
            status => status,
        };

        if remote_status == RemoteStatus::Remote && self.config.location_preferences.allow_remote {
            reasons.push("Remote job (matches preference)".to_string());
            return (max_score, reasons);
        }

        if remote_status == RemoteStatus::Hybrid && self.config.location_preferences.allow_hybrid {
            reasons.push("Hybrid job (matches preference)".to_string());
            return (max_score, reasons);
        }

        if remote_status == RemoteStatus::Onsite && self.config.location_preferences.allow_onsite {
            reasons.push("Onsite job (matches preference)".to_string());
            return (max_score, reasons);
        }

        // Location doesn't match preferences
        reasons.push("Location doesn't match preferences".to_string());
        (0.0, reasons)
    }

    /// Score company preference (10% weight)
    pub(super) fn score_company(&self, job: &Job) -> (f64, Vec<String>) {
        let base_score = self.scoring_config.company_weight;
        let mut reasons = Vec::new();

        // Check if any preferences are configured
        let has_preferred_companies = !self.config.preferred_companies.is_empty();
        let has_blocked_companies = !self.config.blocked_companies.is_empty();

        if !has_preferred_companies && !has_blocked_companies {
            reasons.push("No company preferences configured".to_string());
            return (base_score, reasons);
        }

        // Blocked companies take precedence.
        for blocked in &self.config.blocked_companies {
            if fuzzy_match_company(&job.company, blocked) {
                reasons.push(format!("Company '{}' is blocklisted", job.company));
                return (0.0, reasons);
            }
        }

        // Preferred companies receive a bonus.
        for preferred in &self.config.preferred_companies {
            if fuzzy_match_company(&job.company, preferred) {
                let bonus_score = base_score * 1.5; // 50% bonus
                reasons.push(format!(
                    "Company '{}' is preferred (+50% bonus)",
                    job.company
                ));
                return (bonus_score, reasons);
            }
        }

        // Neutral company - base score
        reasons.push(format!("Company '{}' is neutral", job.company));
        (base_score, reasons)
    }

    /// Score recency (5% weight)
    pub(super) fn score_recency(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.recency_weight;
        let mut reasons = Vec::new();

        let now = Utc::now();
        let age = now.signed_duration_since(job.created_at);
        let days_old = age.num_days();

        if days_old <= 7 {
            reasons.push(format!("Posted {} days ago (fresh)", days_old));
            (max_score, reasons)
        } else if days_old <= 30 {
            let score = max_score * (1.0 - (days_old as f64 - 7.0) / 23.0);
            reasons.push(format!(
                "Posted {} days ago ({}% credit)",
                days_old,
                (score / max_score * 100.0) as i32
            ));
            (score, reasons)
        } else {
            reasons.push(format!("Posted {} days ago (too old)", days_old));
            (0.0, reasons)
        }
    }
}
