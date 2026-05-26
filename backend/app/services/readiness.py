from app.models.schemas import ReadinessChecklistItem, RepositoryAnalysis, ResumeReadiness


def calculate_readiness(analysis: RepositoryAnalysis) -> ResumeReadiness:
    long_file_count = sum(1 for risk in analysis.risks if "Long file detected" in risk.message)
    checklist = [
        ReadinessChecklistItem(
            name="README exists",
            passed=analysis.has_readme,
            points=15,
            recommendation="Write a README that explains what the project does.",
        ),
        ReadinessChecklistItem(
            name="README includes setup instructions",
            passed=analysis.readme_has_setup,
            points=15,
            recommendation="Add setup instructions so an interviewer can run the project locally.",
        ),
        ReadinessChecklistItem(
            name="README includes usage or demo details",
            passed=analysis.readme_has_usage,
            points=10,
            recommendation="Add usage examples, screenshots, or a short demo section.",
        ),
        ReadinessChecklistItem(
            name="Automated tests exist",
            passed=analysis.has_tests,
            points=20,
            recommendation="Add automated tests for the core project workflow.",
        ),
        ReadinessChecklistItem(
            name=".gitignore exists",
            passed=analysis.has_gitignore,
            points=10,
            recommendation="Add a .gitignore so generated files and secrets stay out of git.",
        ),
        ReadinessChecklistItem(
            name=".env.example exists",
            passed=analysis.has_env_example,
            points=10,
            recommendation="Add a .env.example to document required environment variables.",
        ),
        ReadinessChecklistItem(
            name="No long files detected",
            passed=long_file_count == 0,
            points=10,
            recommendation="Split long files into smaller modules with clearer responsibilities.",
        ),
        ReadinessChecklistItem(
            name="Project has multiple organized directories",
            passed=analysis.total_directories >= 2,
            points=10,
            recommendation="Organize code into directories such as app, services, tests, and docs.",
        ),
    ]

    score = sum(item.points for item in checklist if item.passed)
    failed_items = [item for item in checklist if not item.passed]
    priority_fixes = _prioritize_fixes(failed_items)

    if not priority_fixes:
        priority_fixes = ["Project looks ready for a resume review pass."]

    return ResumeReadiness(
        score=score,
        status=_status_for_score(score),
        checklist=checklist,
        priority_fixes=priority_fixes,
    )


def _status_for_score(score: int) -> str:
    if score >= 85:
        return "Resume-ready"
    if score >= 65:
        return "Almost ready"
    if score >= 40:
        return "Needs polish"
    return "Needs work"


def _prioritize_fixes(failed_items: list[ReadinessChecklistItem]) -> list[str]:
    priority_order = [
        "Automated tests exist",
        "README exists",
        "README includes setup instructions",
        "README includes usage or demo details",
        ".env.example exists",
        ".gitignore exists",
        "No long files detected",
        "Project has multiple organized directories",
    ]
    failed_by_name = {item.name: item for item in failed_items}
    return [
        failed_by_name[name].recommendation
        for name in priority_order
        if name in failed_by_name
    ][:5]
