def score_job(job: dict, prefs: dict, use_llm: bool = None) -> tuple[float, list[str], dict]:
    """
    Applies rule-based scoring to a job, with optional LLM enhancement.

    Args:
        job: Job data dictionary
        prefs: User preferences
        use_llm: Whether to use LLM scoring (None = auto-detect from env)

    Returns:
        Tuple of (score, reasons, metadata)
    """
    # Get rule-based score first
    rules_score, rules_reasons = score_job_rules_only(job, prefs)

    # Try LLM enhancement if enabled and job passed basic rules
    llm_result = None
    if rules_score > 0 and _should_use_llm(use_llm, prefs):
        try:
            from utils.llm import score_job_with_llm

            llm_result = score_job_with_llm(job, prefs)
        except ImportError:
            pass  # LLM not available, continue with rules only
        except Exception as e:
            from utils.logging import get_logger

            logger = get_logger("scoring")
            logger.debug(f"LLM scoring failed for {job.get('title', 'Unknown')}: {e}")

    # Create hybrid score
    if llm_result:
        from utils.llm import create_hybrid_score

        llm_weight = prefs.get("llm_weight", 0.5)
        rules_weight = 1.0 - llm_weight
        final_score, combined_reasons, metadata = create_hybrid_score(
            rules_score, rules_reasons, llm_result, rules_weight
        )
        return final_score, combined_reasons, metadata
    else:
        # Rules only
        metadata = {
            "rules_score": rules_score,
            "llm_score": None,
            "llm_used": False,
            "tokens_used": 0,
            "scoring_method": "rules_only",
        }
        return rules_score, rules_reasons, metadata


def score_job_rules_only(job: dict, prefs: dict) -> tuple[float, list[str]]:
    """Legacy rule-based scoring function (backward compatible)."""
    score = 0.0
    reasons = []

    title = job.get("title", "").lower()

    # --- GHOST JOB FILTER ---
    # Penalize old jobs
    created_at = job.get("created_at")
    if created_at:
        from datetime import datetime, timedelta

        try:
            post_date = datetime.fromisoformat(created_at)
            age = datetime.now() - post_date
            if age > timedelta(days=30):
                score -= 0.2
                reasons.append("Job is over 30 days old")
            elif age > timedelta(days=14):
                score -= 0.1
                reasons.append("Job is over 14 days old")
        except (ValueError, TypeError):
            pass  # Ignore parsing errors

    # Penalize jobs that have been seen many times without changes
    times_seen = job.get("times_seen", 0)
    if times_seen > 5:
        score -= 0.1 * (min(times_seen, 10) - 5)  # Penalize up to 0.5 for 10+ sightings
        reasons.append(f"Job has been seen {times_seen} times")

    # --- BLOCKLIST FILTER (IMMEDIATE REJECTION) ---
    for blocked_word in prefs.get("title_blocklist", []):
        if blocked_word.lower() in title:
            return 0.0, [f"Rejected: Title contains blocked word '{blocked_word}'"]

    # --- ALLOWLIST FILTER (MUST MATCH ONE) ---
    has_allowed_title = False
    for allowed_word in prefs.get("title_allowlist", []):
        if allowed_word.lower() in title:
            score += 0.6  # Base score for matching title
            reasons.append(f"Title matched '{allowed_word}'")
            has_allowed_title = True
            break
    if not has_allowed_title:
        return 0.0, ["Rejected: Title did not match allowlist"]

    # --- LOCATION SCORING ---
    location = job.get("location", "").lower()
    loc_prefs = prefs.get("location_preferences", {})
    location_score = 0
    location_reasons = []

    if loc_prefs.get("allow_remote") and "remote" in location:
        location_score = 0.2
        location_reasons.append("Remote work allowed")
    else:
        for city in loc_prefs.get("cities", []):
            if city.lower() in location:
                location_score = 0.3
                location_reasons.append(f"City matched '{city}'")
                break
        if location_score == 0:
            for state in loc_prefs.get("states", []):
                if state.lower() in location:
                    location_score = 0.2
                    location_reasons.append(f"State matched '{state}'")
                    break
        if location_score == 0 and loc_prefs.get("country"):
            country_pref = loc_prefs.get("country")
            if country_pref and country_pref.lower() in location:
                location_score = 0.1
                # Use variable in f-string to avoid nested quote parsing issues on <3.12
                location_reasons.append(f"Country matched '{country_pref}'")

    score += location_score
    reasons.extend(location_reasons)

    # --- KEYWORD BOOSTS ---
    description = job.get("description", "").lower()
    full_text = title + " " + description
    for boost_word in prefs.get("keywords_boost", []):
        if boost_word.lower() in full_text:
            score += 0.05
            reasons.append(f"Keyword boost: '{boost_word}'")

    # --- SALARY FILTER ---
    salary_floor = prefs.get("salary_floor_usd")
    if salary_floor:
        # Try to extract salary from description
        salary_found = _extract_salary(full_text)
        if salary_found:
            if salary_found < salary_floor:
                return 0.0, [f"Rejected: Salary ${salary_found:,} below floor ${salary_floor:,}"]
            else:
                score += 0.1
                reasons.append(f"Salary ${salary_found:,} meets requirements")

    return min(score, 1.0), reasons  # Cap score at 1.0


def _should_use_llm(use_llm: bool, prefs: dict) -> bool:
    """Determine if LLM should be used for scoring."""
    if use_llm is not None:
        return use_llm

    # Check preferences
    if "use_llm" in prefs:
        return prefs["use_llm"]

    # Check environment
    import os

    return os.getenv("LLM_ENABLED", "false").lower() == "true"


def _extract_salary(text: str) -> int:
    """Try to extract salary information from job text."""
    import re

    # Common salary patterns
    patterns = [
        r"\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[kK]?",  # $150k, $150,000
        r"(\d{1,3}(?:,\d{3})*)[kK]",  # 150k, 150,000
        r"salary.*?(\d{1,3}(?:,\d{3})*)",  # salary of 150000
        r"compensation.*?(\d{1,3}(?:,\d{3})*)",  # compensation 150000
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                # Clean and convert to integer
                salary_str = match.replace(",", "").replace("$", "")
                salary = int(salary_str)

                # Handle 'k' suffix
                if "k" in match.lower():
                    salary *= 1000

                # Reasonable salary range check
                if 30000 <= salary <= 1000000:
                    return salary
            except (ValueError, TypeError):
                continue

    return None
