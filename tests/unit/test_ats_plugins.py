
from utils.ats_analyzer import (
    ATSAnalyzer,
    register_analyzer_plugin,
    register_default_plugins,
)

SIMPLE_RESUME = (
    "Action oriented engineer. Led migration. Implemented system. Increased performance 50%."
)


def test_default_plugins_metadata_collection():
    register_default_plugins(force=True)
    analyzer = ATSAnalyzer()
    result = analyzer.analyze(resume_text=SIMPLE_RESUME)
    # Ensure plugin metadata captured
    assert result.plugin_metadata, "Expected plugin metadata to be present"
    for key in ["achievements", "leadership_signal", "action_verb_density"]:
        assert key in result.plugin_metadata, f"Missing metadata for {key}"


def test_plugin_failure_isolated():
    def boom_plugin(text: str, ctx: dict):  # pragma: no cover - we assert handling
        raise RuntimeError("boom")

    register_analyzer_plugin("_boom_test", 0.01, boom_plugin)
    analyzer = ATSAnalyzer()
    result = analyzer.analyze(resume_text=SIMPLE_RESUME)
    # Score should exist and be zero for failing plugin
    assert result.component_scores.get("_boom_test") == 0.0
    # Issue logged
    assert any(
        iss.category == "_boom_test" and "Plugin error" in iss.message for iss in result.issues
    )
    # Metadata contains error field
    assert "_boom_test" in result.plugin_metadata
    assert "error" in result.plugin_metadata["_boom_test"]
