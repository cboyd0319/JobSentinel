
from utils.ats_analyzer import ATSAnalyzer, analyze_resume

SAMPLE_RESUME = """John Doe\nEmail: john@example.com\nPhone: 555-123-4567\n\nExperience\nSenior Software Engineer at ExampleCorp 2021 - Present\nBuilt scalable Python microservices on AWS (EC2, S3, Lambda) using Docker and Kubernetes.\nImplemented CI/CD pipelines with Terraform and GitHub Actions improving deployment speed.\n\nEducation\nB.S. Computer Science\n\nSkills\nPython, AWS, Docker, Kubernetes, Terraform, Git, SQL, Linux, Leadership\n"""

SAMPLE_JD = """Seeking a Software Engineer with 3+ years experience. Must have: Python, AWS, Docker, Kubernetes, CI/CD, Terraform, Linux, SQL. Bonus: Observability, Leadership."""


def test_basic_analysis_no_jd():
    analyzer = ATSAnalyzer()
    result = analyzer.analyze(resume_text=SAMPLE_RESUME)
    assert 0 <= result.overall_score <= 100
    assert "keywords" in result.component_scores
    assert result.keyword_overlap["score"] == 75.0  # default when no JD


def test_with_job_description():
    analyzer = ATSAnalyzer()
    result = analyzer.analyze(resume_text=SAMPLE_RESUME, job_description=SAMPLE_JD)
    assert result.keyword_overlap["found"], "Should find overlapping keywords"
    assert result.component_scores["keywords"] >= 60
    assert result.experience_alignment["required"] == 3
    assert result.experience_alignment["extracted"] >= 0


def test_empty_resume():
    analyzer = ATSAnalyzer()
    result = analyzer.analyze(resume_text="")
    # With empty resume, many scores fall but still within 0-100
    for score in result.component_scores.values():
        assert 0 <= score <= 100


def test_partial_fuzzy(monkeypatch):
    # Force fuzzy off to ensure deterministic missing vs partial
    analyzer = ATSAnalyzer(enable_fuzzy=False)
    jd = "Looking for engineer with kubernetes experience"
    resume = "kubernets expert"  # misspelled
    result = analyzer.analyze(resume_text=resume, job_description=jd)
    # Without fuzzy, should treat as missing
    assert "kubernetes" in result.keyword_overlap["missing"]


def test_analyze_resume_wrapper():
    res = analyze_resume(resume_text=SAMPLE_RESUME, job_description=SAMPLE_JD)
    assert res.overall_score <= 100
