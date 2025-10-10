"""
ATS Report Generator

Generates detailed reports from ATS compatibility analysis results.
"""

import logging
from datetime import datetime
from pathlib import Path

from ..models import ATSCompatibilityScore, ATSIssueLevel

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generates comprehensive ATS compatibility reports."""

    def generate_text_report(self, score: ATSCompatibilityScore) -> str:
        """Generate a detailed text report."""
        lines = []

        # Header
        lines.append("=" * 80)
        lines.append("ATS COMPATIBILITY ANALYSIS REPORT")
        lines.append("=" * 80)
        lines.append(f"Generated: {score.analysis_timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        lines.append(f"Resume Word Count: {score.resume_word_count}")
        lines.append("")

        # Overall Score
        lines.append("OVERALL COMPATIBILITY SCORE")
        lines.append("-" * 40)
        lines.append(f"Score: {score.overall_score}/100")

        # Rating interpretation
        rating = self._get_score_rating(score.overall_score)
        lines.append(f"Rating: {rating}")
        lines.append("")

        # Component Breakdown
        lines.append("COMPONENT SCORES")
        lines.append("-" * 40)
        for component, component_score in score.component_scores.items():
            lines.append(f"{component.title()}: {component_score}/100")
        lines.append("")

        # System-Specific Scores
        lines.append("ATS SYSTEM COMPATIBILITY")
        lines.append("-" * 40)
        for ats_system, system_score in score.system_scores.items():
            system_name = ats_system.value.title()
            lines.append(f"{system_name}: {system_score}/100")
        lines.append("")

        # Issues by Severity
        lines.append("IDENTIFIED ISSUES")
        lines.append("-" * 40)

        for level in [
            ATSIssueLevel.CRITICAL,
            ATSIssueLevel.HIGH,
            ATSIssueLevel.MEDIUM,
            ATSIssueLevel.LOW,
        ]:
            issues_at_level = score.get_issues_by_level(level)
            if issues_at_level:
                lines.append(f"\n{level.value.upper()} ISSUES ({len(issues_at_level)}):")
                for i, issue in enumerate(issues_at_level, 1):
                    lines.append(f"  {i}. {issue.description}")
                    if issue.location:
                        lines.append(f"     Location: {issue.location}")
                    if issue.recommendations:
                        lines.append(f"     Recommendation: {issue.recommendations[0]}")

        # Priority Recommendations
        if score.priority_recommendations:
            lines.append("\nPRIORITY RECOMMENDATIONS")
            lines.append("-" * 40)
            for i, rec in enumerate(score.priority_recommendations, 1):
                lines.append(f"{i}. {rec}")

        # Quick Wins
        if score.quick_wins:
            lines.append("\nQUICK WINS")
            lines.append("-" * 40)
            for i, win in enumerate(score.quick_wins, 1):
                lines.append(f"{i}. {win}")

        # Top Keyword Matches
        if score.keyword_matches:
            lines.append("\nTOP KEYWORD MATCHES")
            lines.append("-" * 40)
            top_matches = sorted(
                score.keyword_matches, key=lambda x: x.relevance_score, reverse=True
            )[:10]
            for match in top_matches:
                status = "✓" if match.is_skill else "○"
                lines.append(
                    f"{status} {match.keyword} (Relevance: {match.relevance_score:.2f}, Matches: {match.matches})"
                )

        lines.append("\n" + "=" * 80)

        return "\n".join(lines)

    def generate_html_report(self, score: ATSCompatibilityScore) -> str:
        """Generate an HTML report with styling."""

        # HTML template
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ATS Compatibility Report</title>
    <style>
        {self._get_css_styles()}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>ATS Compatibility Analysis Report</h1>
            <p class="timestamp">Generated: {score.analysis_timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        </header>
        
        <section class="score-summary">
            <div class="overall-score">
                <h2>Overall Score</h2>
                <div class="score-circle {self._get_score_class(score.overall_score)}">
                    <span class="score-number">{score.overall_score}</span>
                    <span class="score-total">/100</span>
                </div>
                <p class="score-rating">{self._get_score_rating(score.overall_score)}</p>
            </div>
        </section>
        
        <section class="component-scores">
            <h2>Component Breakdown</h2>
            <div class="component-grid">
                {self._generate_component_html(score.component_scores)}
            </div>
        </section>
        
        <section class="system-scores">
            <h2>ATS System Compatibility</h2>
            <div class="system-grid">
                {self._generate_system_html(score.system_scores)}
            </div>
        </section>
        
        <section class="issues">
            <h2>Issues & Recommendations</h2>
            {self._generate_issues_html(score)}
        </section>
        
        {self._generate_recommendations_html(score)}
        
        {self._generate_keywords_html(score)}
        
    </div>
</body>
</html>
        """

        return html

    def save_report(
        self, score: ATSCompatibilityScore, output_path: str | None = None, format: str = "text"
    ) -> str:
        """Save report to file and return the file path."""

        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            extension = "html" if format == "html" else "txt"
            output_path = f"ats_report_{timestamp}.{extension}"

        try:
            output_file = Path(output_path)

            if format == "html":
                content = self.generate_html_report(score)
            else:
                content = self.generate_text_report(score)

            output_file.write_text(content, encoding="utf-8")
            logger.info(f"Report saved to: {output_file.absolute()}")

            return str(output_file.absolute())

        except Exception as e:
            logger.error(f"Failed to save report: {e}")
            raise

    def _get_score_rating(self, score: float) -> str:
        """Get text rating for numerical score."""
        if score >= 90:
            return "Excellent - Resume is highly ATS-compatible"
        elif score >= 80:
            return "Good - Minor improvements recommended"
        elif score >= 70:
            return "Fair - Several issues to address"
        elif score >= 60:
            return "Poor - Major improvements needed"
        else:
            return "Critical - Resume likely to be rejected by ATS"

    def _get_score_class(self, score: float) -> str:
        """Get CSS class for score styling."""
        if score >= 80:
            return "score-good"
        elif score >= 60:
            return "score-fair"
        else:
            return "score-poor"

    def _get_css_styles(self) -> str:
        """Return CSS styles for HTML report."""
        return """
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        header {
            text-align: center;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        h1 { color: #2c3e50; margin-bottom: 10px; }
        h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
        
        .score-summary {
            text-align: center;
            margin: 30px 0;
        }
        
        .score-circle {
            display: inline-block;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            border: 8px solid;
            position: relative;
            margin: 20px;
        }
        
        .score-good { border-color: #27ae60; }
        .score-fair { border-color: #f39c12; }
        .score-poor { border-color: #e74c3c; }
        
        .score-number {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2.5em;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .score-total {
            position: absolute;
            top: 70%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1em;
            color: #7f8c8d;
        }
        
        .component-grid, .system-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .component-item, .system-item {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
        }
        
        .issue-critical { color: #e74c3c; font-weight: bold; }
        .issue-high { color: #e67e22; font-weight: bold; }
        .issue-medium { color: #f39c12; }
        .issue-low { color: #3498db; }
        
        .recommendations {
            background: #d5f4e6;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        
        .keyword-match {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            margin: 3px;
            font-size: 0.9em;
        }
        """

    def _generate_component_html(self, component_scores: dict) -> str:
        """Generate HTML for component scores."""
        html = []
        for component, score in component_scores.items():
            html.append(
                f"""
                <div class="component-item">
                    <h3>{component.title()}</h3>
                    <div class="score {self._get_score_class(score)}">{score}/100</div>
                </div>
            """
            )
        return "".join(html)

    def _generate_system_html(self, system_scores: dict) -> str:
        """Generate HTML for system scores."""
        html = []
        for system, score in system_scores.items():
            html.append(
                f"""
                <div class="system-item">
                    <h4>{system.value.title()}</h4>
                    <div class="score {self._get_score_class(score)}">{score}/100</div>
                </div>
            """
            )
        return "".join(html)

    def _generate_issues_html(self, score: ATSCompatibilityScore) -> str:
        """Generate HTML for issues section."""
        html = []

        for level in [
            ATSIssueLevel.CRITICAL,
            ATSIssueLevel.HIGH,
            ATSIssueLevel.MEDIUM,
            ATSIssueLevel.LOW,
        ]:
            issues_at_level = score.get_issues_by_level(level)
            if issues_at_level:
                html.append(
                    f'<h3 class="issue-{level.value}">{level.value.upper()} Issues ({len(issues_at_level)})</h3>'
                )
                html.append("<ul>")
                for issue in issues_at_level:
                    html.append(f"<li>{issue.description}")
                    if issue.recommendations:
                        html.append(f"<br><em>Recommendation: {issue.recommendations[0]}</em>")
                    html.append("</li>")
                html.append("</ul>")

        return "".join(html)

    def _generate_recommendations_html(self, score: ATSCompatibilityScore) -> str:
        """Generate HTML for recommendations section."""
        if not score.priority_recommendations and not score.quick_wins:
            return ""

        html = ['<section class="recommendations">']

        if score.priority_recommendations:
            html.append("<h3>Priority Recommendations</h3>")
            html.append("<ol>")
            for rec in score.priority_recommendations:
                html.append(f"<li>{rec}</li>")
            html.append("</ol>")

        if score.quick_wins:
            html.append("<h3>Quick Wins</h3>")
            html.append("<ul>")
            for win in score.quick_wins:
                html.append(f"<li>{win}</li>")
            html.append("</ul>")

        html.append("</section>")
        return "".join(html)

    def _generate_keywords_html(self, score: ATSCompatibilityScore) -> str:
        """Generate HTML for keywords section."""
        if not score.keyword_matches:
            return ""

        html = ['<section class="keywords">']
        html.append("<h2>Top Keyword Matches</h2>")

        top_matches = sorted(score.keyword_matches, key=lambda x: x.relevance_score, reverse=True)[
            :15
        ]
        for match in top_matches:
            html.append(f'<span class="keyword-match">{match.keyword} ({match.matches})</span>')

        html.append("</section>")
        return "".join(html)
