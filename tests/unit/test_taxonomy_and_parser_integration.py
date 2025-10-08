
from utils.ats_analyzer import ATSAnalyzer

# These tests focus on:
# 1. Taxonomy version preference (v1 over base file)
# 2. Resume parser ingestion path for PDF/DOCX (simulated fallback since optional deps may be absent)


def test_taxonomy_version_preference(monkeypatch, tmp_path):
    # Create temp taxonomy files; analyzer should pick v1
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / "skills_taxonomy.json").write_text('{"legacy": ["foo"]}', encoding="utf-8")
    (config_dir / "skills_taxonomy_v1.json").write_text(
        '{"v1cat": ["bar", "baz"]}', encoding="utf-8"
    )

    # Monkeypatch Path to look into tmp config first by adjusting CWD-like behavior
    monkeypatch.chdir(tmp_path)
    analyzer = ATSAnalyzer(taxonomy_path=config_dir / "skills_taxonomy.json", enable_fuzzy=False)
    assert "v1cat" in analyzer.taxonomy and "legacy" not in analyzer.taxonomy


def test_parser_fallback_text_resume(tmp_path):
    # If resume_path points to text file (not PDF/DOCX), analyzer should raw read
    resume_file = tmp_path / "resume.txt"
    resume_file.write_text("John Doe\nExperience Python developer", encoding="utf-8")
    analyzer = ATSAnalyzer(enable_fuzzy=False, use_parser=True)
    result = analyzer.analyze(resume_path=str(resume_file))
    assert result.overall_score >= 0
    # Ensure some basic dimension keys exist
    assert "keywords" in result.component_scores
