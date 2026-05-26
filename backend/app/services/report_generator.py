from app.models.schemas import RepositoryAnalysis, ReviewReport


def generate_report(analysis: RepositoryAnalysis) -> ReviewReport:
    top_languages = sorted(
        analysis.languages.items(),
        key=lambda item: item[1],
        reverse=True,
    )[:3]
    language_summary = ", ".join(f"{name} ({count})" for name, count in top_languages) or "no source files"

    summary = (
        f"Scanned {analysis.total_files} files across {analysis.total_directories} directories. "
        f"Most common languages: {language_summary}. "
        f"Found {len(analysis.risks)} review signal(s)."
    )

    recommendations: list[str] = []
    if not analysis.has_readme:
        recommendations.append("Add a README with setup steps, project purpose, and examples.")
    if not analysis.has_tests:
        recommendations.append("Add automated tests for core behavior before expanding features.")
    if any(risk.path for risk in analysis.risks):
        recommendations.append("Review long files and consider splitting responsibilities.")
    if not recommendations:
        recommendations.append("Project hygiene looks solid for this first-pass scan.")

    return ReviewReport(summary=summary, recommendations=recommendations)
