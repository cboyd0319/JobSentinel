use chrono::{Days, NaiveDate};

use crate::{
    v3_foundation::{SourceAccess, SourcePolicy},
    v3_source_manifest::{
        SourceManifest, SourceOperation, SourcePermission, SourceReview, SourceReviewStatus,
        SourceStopCondition,
    },
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SourceGrantState {
    NotRequired,
    Missing,
    Granted {
        source_id: String,
        policy_ref: String,
        permission: SourcePermission,
        operation: SourceOperation,
        policy_revision: u32,
    },
    Revoked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceActionDecision {
    Allowed {
        request_limit_per_hour: u16,
        connectivity_required: bool,
    },
    ReviewRequired,
    Blocked(SourceStopCondition),
    Stale,
    Revoked,
    Unsupported,
}

impl SourceManifest {
    pub fn authorize(
        &self,
        policy: &SourcePolicy,
        operation: SourceOperation,
        today: NaiveDate,
        grant: SourceGrantState,
    ) -> Result<SourceActionDecision, String> {
        policy.validate()?;
        if self.source_id != policy.source_id || self.source_class != policy.source_class {
            return Err("source manifest does not match the current policy".to_string());
        }
        if self.policy_ref != policy.policy_ref {
            return Ok(SourceActionDecision::Blocked(
                SourceStopCondition::PolicyChanged,
            ));
        }
        if self.policy_revision != policy.revision {
            return Ok(SourceActionDecision::Blocked(
                SourceStopCondition::PolicyChanged,
            ));
        }
        self.validate(policy)?;
        if today < self.verified_on {
            return Err("source verification date cannot be in the future".to_string());
        }
        if matches!(policy.access, SourceAccess::Disabled) {
            return Ok(SourceActionDecision::Blocked(
                SourceStopCondition::PolicyDisabled,
            ));
        }
        let Some(rule) = self.actions.iter().find(|rule| rule.operation == operation) else {
            return Ok(SourceActionDecision::Unsupported);
        };
        let expires_on = self
            .verified_on
            .checked_add_days(Days::new(self.max_age_days.into()))
            .ok_or_else(|| "source freshness window is invalid".to_string())?;
        if today > expires_on {
            return Ok(SourceActionDecision::Stale);
        }
        for review in [&self.terms_review, &self.robots_review] {
            if let Some(decision) = review.action_decision(today, self.max_age_days)? {
                return Ok(decision);
            }
        }

        let grant_matches = matches!(
            &grant,
            SourceGrantState::Granted {
                source_id,
                policy_ref,
                permission,
                operation: granted_operation,
                policy_revision,
            } if source_id == &self.source_id
                && policy_ref == &self.policy_ref
                && *permission == rule.permission
                && *granted_operation == operation
                && *policy_revision == policy.revision
        );
        match (rule.permission, &grant) {
            (SourcePermission::None, SourceGrantState::NotRequired) => {}
            (
                SourcePermission::UserReview | SourcePermission::PairedBrowserGrant,
                SourceGrantState::Missing | SourceGrantState::NotRequired,
            ) => return Ok(SourceActionDecision::ReviewRequired),
            (SourcePermission::UserReview | SourcePermission::PairedBrowserGrant, _)
                if grant_matches => {}
            _ => return Ok(SourceActionDecision::Revoked),
        }
        Ok(SourceActionDecision::Allowed {
            request_limit_per_hour: policy.request_limit_per_hour,
            connectivity_required: operation.connectivity_required(),
        })
    }
}

impl SourceReview {
    fn action_decision(
        &self,
        today: NaiveDate,
        max_age_days: u16,
    ) -> Result<Option<SourceActionDecision>, String> {
        match (self.status, self.reviewed_on) {
            (SourceReviewStatus::ReviewRequired, _) => {
                Ok(Some(SourceActionDecision::ReviewRequired))
            }
            (SourceReviewStatus::Reviewed, Some(reviewed_on)) if reviewed_on > today => {
                Err("source review date cannot be in the future".to_string())
            }
            (SourceReviewStatus::Reviewed, Some(reviewed_on)) => {
                let expires_on = reviewed_on
                    .checked_add_days(Days::new(max_age_days.into()))
                    .ok_or_else(|| "source review freshness window is invalid".to_string())?;
                Ok(
                    (today > expires_on).then_some(SourceActionDecision::Blocked(
                        SourceStopCondition::ReviewExpired,
                    )),
                )
            }
            _ => Ok(None),
        }
    }
}

impl SourceOperation {
    const fn connectivity_required(self) -> bool {
        matches!(
            self,
            Self::ScheduledCheck
                | Self::ConnectivityCheck
                | Self::EmployerDiscovery
                | Self::RegionalPackCheck
                | Self::RestrictedWorkbench
        )
    }
}
