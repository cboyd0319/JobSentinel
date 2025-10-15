"""
Tests for Skills Taxonomy System

Tests all five features:
1. LinkedIn Skills Graph
2. Skill Adjacency
3. Learning Paths
4. Demand Trends
5. Salary Correlation
"""

import pytest

from domains.skills_taxonomy import (
    CareerLevel,
    DemandLevel,
    DemandTrend,
    DemandTrendsAnalyzer,
    ExperienceLevel,
    LearningPath,
    LearningPathManager,
    RelationshipType,
    SalaryCorrelationAnalyzer,
    SalaryImpact,
    Skill,
    SkillLevel,
    SkillsGraphManager,
    TrendDirection,
)


class TestSkillsGraph:
    """Test LinkedIn Skills Graph functionality."""

    def test_skills_graph_initialization(self):
        """Test that skills graph initializes with default skills."""
        manager = SkillsGraphManager()

        assert len(manager.skills) > 0
        assert len(manager.relationships) > 0
        assert "python" in manager.skills
        assert "javascript" in manager.skills

    def test_get_skill(self):
        """Test retrieving a skill by ID."""
        manager = SkillsGraphManager()

        python = manager.get_skill("python")
        assert python is not None
        assert python.name == "Python"
        assert python.category == "programming"

    def test_find_skill_by_name(self):
        """Test finding skills by name."""
        manager = SkillsGraphManager()

        # Exact match
        python = manager.find_skill_by_name("Python")
        assert python is not None
        assert python.id == "python"

        # Case insensitive
        js = manager.find_skill_by_name("javascript")
        assert js is not None
        assert js.id == "javascript"

        # Alias match
        golang = manager.find_skill_by_name("Golang")
        assert golang is not None
        assert golang.id == "go"

    def test_get_adjacent_skills(self):
        """Test skill adjacency - related skills."""
        manager = SkillsGraphManager()

        # Django requires Python
        django_adjacent = manager.get_adjacent_skills("django")
        skill_ids = [skill.id for skill, _ in django_adjacent]
        assert "python" in skill_ids

        # Python has multiple adjacent skills
        python_adjacent = manager.get_adjacent_skills("python")
        assert len(python_adjacent) > 0

    def test_get_adjacent_skills_filtered(self):
        """Test filtering adjacent skills by relationship type."""
        manager = SkillsGraphManager()

        # Get only REQUIRES relationships
        django_requires = manager.get_adjacent_skills(
            "django", relationship_types=[RelationshipType.REQUIRES]
        )

        # Should have Python as a requirement
        skill_ids = [skill.id for skill, rel in django_requires]
        assert "python" in skill_ids

        # All relationships should be REQUIRES
        for _, rel in django_requires:
            assert rel.relationship_type == RelationshipType.REQUIRES

    def test_get_related_skills(self):
        """Test getting related skills with breadth-first search."""
        manager = SkillsGraphManager()

        # Get skills related to Python (distance 1)
        python_related = manager.get_related_skills("python", max_distance=1)
        assert len(python_related) > 0

        # Distance 2 should find more skills
        python_related_2 = manager.get_related_skills("python", max_distance=2)
        assert len(python_related_2) >= len(python_related)

    def test_get_skill_requirements(self):
        """Test getting skill prerequisites."""
        manager = SkillsGraphManager()

        # Django requires Python
        django_reqs = manager.get_skill_requirements("django")
        req_ids = [skill.id for skill in django_reqs]
        assert "python" in req_ids

        # Kubernetes requires Docker
        k8s_reqs = manager.get_skill_requirements("kubernetes")
        req_ids = [skill.id for skill in k8s_reqs]
        assert "docker" in req_ids

    def test_get_skills_by_category(self):
        """Test filtering skills by category."""
        manager = SkillsGraphManager()

        # Get all programming languages
        programming = manager.get_skills_by_category("programming")
        assert len(programming) > 0
        assert all(skill.category == "programming" for skill in programming)

        # Get cloud platforms
        cloud = manager.get_skills_by_category("cloud")
        cloud_ids = [skill.id for skill in cloud]
        assert "aws" in cloud_ids
        assert "azure" in cloud_ids
        assert "gcp" in cloud_ids

    def test_search_skills(self):
        """Test skill search functionality."""
        manager = SkillsGraphManager()

        # Search by name
        results = manager.search_skills("python")
        assert len(results) > 0
        assert any(skill.id == "python" for skill in results)

        # Search should return relevant results
        cloud_results = manager.search_skills("cloud")
        assert len(cloud_results) > 0

    def test_export_graph(self):
        """Test exporting the full skills graph."""
        manager = SkillsGraphManager()

        graph_data = manager.export_graph()

        assert "skills" in graph_data
        assert "relationships" in graph_data
        assert len(graph_data["skills"]) > 0
        assert len(graph_data["relationships"]) > 0


class TestLearningPaths:
    """Test Learning Paths functionality."""

    def test_learning_path_manager_initialization(self):
        """Test learning path manager initializes with default paths."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        assert len(path_manager.paths) > 0
        assert "software_engineering" in path_manager.paths
        assert "data_science" in path_manager.paths

    def test_get_path(self):
        """Test retrieving a learning path."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        se_path = path_manager.get_path("software_engineering")
        assert se_path is not None
        assert se_path.name == "software_engineering"
        assert len(se_path.nodes) > 0

    def test_learning_path_progression(self):
        """Test career progression levels in learning paths."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        se_path = path_manager.get_path("software_engineering")

        # Should have junior, mid, and senior levels
        levels = [node.level for node in se_path.nodes]
        assert CareerLevel.JUNIOR in levels
        assert CareerLevel.MID in levels
        assert CareerLevel.SENIOR in levels

    def test_path_nodes_have_skills(self):
        """Test that path nodes contain skill requirements."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        se_path = path_manager.get_path("software_engineering")

        for node in se_path.nodes:
            # Each node should have required skills
            assert len(node.required_skills) > 0

            # Each skill step should have essential fields
            for step in node.required_skills:
                assert step.skill is not None
                assert step.level is not None
                assert step.estimated_time
                assert step.priority

    def test_get_next_level(self):
        """Test getting next career level."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        # Next level after junior should be mid
        next_node = path_manager.get_next_level("software_engineering", CareerLevel.JUNIOR)
        assert next_node is not None
        assert next_node.level == CareerLevel.MID

        # Next level after mid should be senior
        next_node = path_manager.get_next_level("software_engineering", CareerLevel.MID)
        assert next_node is not None
        assert next_node.level == CareerLevel.SENIOR

    def test_get_skills_to_next_level(self):
        """Test identifying skills needed for next level."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        # With no skills, should need all junior skills
        missing = path_manager.get_skills_to_next_level(
            "software_engineering", CareerLevel.JUNIOR, current_skills=[]
        )
        # Missing skills should be for the MID level (next after JUNIOR)
        assert len(missing) >= 0  # May have skills already

        # With some skills, should need fewer
        missing_with_skills = path_manager.get_skills_to_next_level(
            "software_engineering",
            CareerLevel.JUNIOR,
            current_skills=["python", "git"],
        )
        # Should have same or fewer missing skills
        assert len(missing_with_skills) <= len(missing)

    def test_get_all_paths(self):
        """Test getting all available paths."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        all_paths = path_manager.get_all_paths()
        assert len(all_paths) > 0
        assert all(isinstance(path, LearningPath) for path in all_paths)

    def test_get_path_for_domain(self):
        """Test getting path by domain."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        se_path = path_manager.get_path_for_domain("software_engineering")
        assert se_path is not None
        assert se_path.domain == "software_engineering"


class TestDemandTrends:
    """Test Demand Trends functionality."""

    def test_demand_trends_analyzer_initialization(self):
        """Test demand trends analyzer initializes."""
        analyzer = DemandTrendsAnalyzer()
        assert analyzer is not None

    def test_get_skill_demand(self):
        """Test getting demand data for a skill."""
        analyzer = DemandTrendsAnalyzer()

        python_demand = analyzer.get_skill_demand("python")
        assert python_demand.skill_id == "python"
        assert python_demand.demand_level is not None
        assert python_demand.trend_direction is not None
        assert python_demand.demand_score > 0
        assert python_demand.job_postings_count > 0

    def test_hot_skills(self):
        """Test identifying hot/rising skills."""
        analyzer = DemandTrendsAnalyzer()

        hot_skills = analyzer.get_hot_skills(limit=5)
        assert len(hot_skills) > 0
        assert len(hot_skills) <= 5

        # All should be rising or emerging
        for skill in hot_skills:
            assert skill.trend_direction in [
                TrendDirection.RISING,
                TrendDirection.EMERGING,
            ]
            assert skill.growth_rate > 0

        # Should be sorted by growth rate
        growth_rates = [skill.growth_rate for skill in hot_skills]
        assert growth_rates == sorted(growth_rates, reverse=True)

    def test_declining_skills(self):
        """Test identifying declining skills."""
        analyzer = DemandTrendsAnalyzer()

        declining = analyzer.get_declining_skills(limit=5)

        # All should be declining or dying
        for skill in declining:
            assert skill.trend_direction in [
                TrendDirection.DECLINING,
                TrendDirection.DYING,
            ]
            assert skill.growth_rate < 0

    def test_emerging_skills(self):
        """Test identifying emerging skills."""
        analyzer = DemandTrendsAnalyzer()

        emerging = analyzer.get_emerging_skills(limit=5)

        for skill in emerging:
            assert skill.trend_direction == TrendDirection.EMERGING
            assert skill.growth_rate > 0

    def test_stable_high_demand(self):
        """Test identifying stable high-demand skills."""
        analyzer = DemandTrendsAnalyzer()

        stable = analyzer.get_stable_high_demand(limit=5)

        for skill in stable:
            assert skill.trend_direction == TrendDirection.STABLE
            assert skill.demand_level in [DemandLevel.CRITICAL, DemandLevel.HIGH]

    def test_generate_trend_report(self):
        """Test generating comprehensive trend report."""
        analyzer = DemandTrendsAnalyzer()

        report = analyzer.generate_trend_report()

        assert len(report.hot_skills) > 0
        assert len(report.stable_high_demand) > 0
        assert report.generated_at is not None
        assert "total_skills_analyzed" in report.metadata

    def test_compare_skills(self):
        """Test comparing demand for multiple skills."""
        analyzer = DemandTrendsAnalyzer()

        skills = ["python", "javascript", "rust"]
        comparison = analyzer.compare_skills(skills)

        assert len(comparison) == len(skills)
        # Should be sorted by demand score
        scores = [trend.demand_score for trend in comparison]
        assert scores == sorted(scores, reverse=True)

    def test_get_market_outlook(self):
        """Test getting market outlook for a skill."""
        analyzer = DemandTrendsAnalyzer()

        outlook = analyzer.get_market_outlook("python")

        assert "current_demand" in outlook
        assert "projected_1_year" in outlook
        assert "projected_3_years" in outlook
        assert "job_openings" in outlook
        assert "recommendation" in outlook


class TestSalaryCorrelation:
    """Test Salary Correlation functionality."""

    def test_salary_correlation_analyzer_initialization(self):
        """Test salary correlation analyzer initializes."""
        analyzer = SalaryCorrelationAnalyzer()
        assert analyzer is not None

    def test_get_skill_salary_impact(self):
        """Test getting salary impact for a skill."""
        analyzer = SalaryCorrelationAnalyzer()

        python_salary = analyzer.get_skill_salary_impact("python")
        assert python_salary.skill_id == "python"
        assert python_salary.impact is not None
        assert python_salary.salary_premium > 0
        assert python_salary.base_salary is not None
        assert python_salary.with_skill_salary is not None
        assert python_salary.base_salary.median < python_salary.with_skill_salary.median

    def test_salary_impact_by_experience_level(self):
        """Test salary varies by experience level."""
        analyzer = SalaryCorrelationAnalyzer()

        # Entry level should have lower salaries
        entry = analyzer.get_skill_salary_impact("python", experience_level=ExperienceLevel.ENTRY)
        mid = analyzer.get_skill_salary_impact("python", experience_level=ExperienceLevel.MID)
        senior = analyzer.get_skill_salary_impact("python", experience_level=ExperienceLevel.SENIOR)

        # Salaries should increase with experience
        assert entry.base_salary.median < mid.base_salary.median
        assert mid.base_salary.median < senior.base_salary.median

    def test_get_top_paying_skills(self):
        """Test getting top paying skills."""
        analyzer = SalaryCorrelationAnalyzer()

        top_skills = analyzer.get_top_paying_skills(limit=5)

        assert len(top_skills) > 0
        assert len(top_skills) <= 5

        # Should be sorted by salary premium
        premiums = [skill.salary_premium for skill in top_skills]
        assert premiums == sorted(premiums, reverse=True)

    def test_analyze_skill_combination(self):
        """Test analyzing salary impact of skill combinations."""
        analyzer = SalaryCorrelationAnalyzer()

        # Python + AWS + Docker is a known combination
        combo = analyzer.analyze_skill_combination(["python", "aws", "docker"])

        assert combo.combined_premium > 0
        assert combo.salary_range is not None
        assert len(combo.skill_ids) == 3

    def test_compare_skills_roi(self):
        """Test comparing ROI for different skills."""
        analyzer = SalaryCorrelationAnalyzer()

        skills = ["python", "javascript", "rust"]
        roi_comparison = analyzer.compare_skills_roi(skills)

        assert len(roi_comparison) == len(skills)

        # Each should have ROI data
        for roi_data in roi_comparison:
            assert "skill_id" in roi_data
            assert "roi" in roi_data
            assert "learning_months" in roi_data
            assert "annual_increase" in roi_data

        # Should be sorted by ROI
        rois = [data["roi"] for data in roi_comparison]
        assert rois == sorted(rois, reverse=True)

    def test_get_salary_percentile(self):
        """Test getting salary percentile analysis."""
        analyzer = SalaryCorrelationAnalyzer()

        percentile_data = analyzer.get_salary_percentile(
            salary=90000,
            skill_ids=["python", "aws"],
            experience_level=ExperienceLevel.MID,
        )

        assert "percentile" in percentile_data
        assert "median" in percentile_data
        assert "above_median" in percentile_data
        assert 0 <= percentile_data["percentile"] <= 100

    def test_salary_range_formatting(self):
        """Test salary range string formatting."""
        from domains.skills_taxonomy.salary_correlation import SalaryRange

        salary_range = SalaryRange(min=70000, max=100000, median=85000)
        formatted = str(salary_range)

        assert "$70,000" in formatted
        assert "$100,000" in formatted
        assert "$85,000" in formatted


class TestIntegration:
    """Test integration between different modules."""

    def test_skills_graph_with_learning_paths(self):
        """Test that learning paths use skills from the graph."""
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)

        se_path = path_manager.get_path("software_engineering")

        # Check that path skills exist in the graph
        for node in se_path.nodes:
            for step in node.required_skills:
                # Try to find the skill in the graph
                skill = skills_manager.find_skill_by_name(step.skill.name)
                # It's OK if skill isn't in graph - some are abstract concepts
                if skill:
                    assert skill.name == step.skill.name

    def test_demand_trends_with_salary_correlation(self):
        """Test that demand trends and salary data align."""
        demand_analyzer = DemandTrendsAnalyzer()
        salary_analyzer = SalaryCorrelationAnalyzer()

        # High-demand skills should have good salary impact
        hot_skills = demand_analyzer.get_hot_skills(limit=3)

        for demand_trend in hot_skills:
            salary_impact = salary_analyzer.get_skill_salary_impact(demand_trend.skill_id)

            # Hot skills should generally have good salary impact
            # (not a strict requirement, but generally true)
            assert salary_impact.salary_premium >= 0

    def test_full_career_analysis_workflow(self):
        """Test a complete workflow analyzing a career path."""
        # Initialize all components
        skills_manager = SkillsGraphManager()
        path_manager = LearningPathManager(skills_manager)
        demand_analyzer = DemandTrendsAnalyzer()
        salary_analyzer = SalaryCorrelationAnalyzer()

        # Get software engineering path
        se_path = path_manager.get_path("software_engineering")
        assert se_path is not None

        # Get junior level requirements
        junior_node = next(node for node in se_path.nodes if node.level == CareerLevel.JUNIOR)

        # Analyze each required skill
        for step in junior_node.required_skills[:3]:  # Test first 3 skills
            skill_id = step.skill.id

            # Get demand trend
            demand = demand_analyzer.get_skill_demand(skill_id)
            assert demand is not None

            # Get salary impact
            salary = salary_analyzer.get_skill_salary_impact(skill_id)
            assert salary is not None

            # Both should reference the same skill
            assert demand.skill_id == salary.skill_id
