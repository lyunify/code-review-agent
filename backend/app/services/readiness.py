import logging

from app.models.schemas import ReadinessChecklistItem, RepositoryAnalysis, ResumeReadiness

logger = logging.getLogger(__name__)


def calculate_readiness(analysis: RepositoryAnalysis) -> ResumeReadiness:
    long_file_count = sum(1 for risk in analysis.risks if "Long file detected" in risk.message)
    risk_density = len(analysis.risks) / max(analysis.total_files, 1)
    base_checklist = [
        ReadinessChecklistItem(
            name="README exists",
            passed=analysis.has_readme,
            points=10,
            recommendation="Write a README that explains what the project does.",
        ),
        ReadinessChecklistItem(
            name="README explains project purpose",
            passed=analysis.readme_has_project_purpose,
            points=8,
            recommendation="Add a short overview that explains the problem, user, and purpose.",
        ),
        ReadinessChecklistItem(
            name="README includes setup instructions",
            passed=analysis.readme_has_setup,
            points=10,
            recommendation="Add setup instructions so an interviewer can run the project locally.",
        ),
        ReadinessChecklistItem(
            name="README includes usage or demo details",
            passed=analysis.readme_has_usage,
            points=8,
            recommendation="Add usage examples, screenshots, or a short demo section.",
        ),
        ReadinessChecklistItem(
            name="README lists tech stack",
            passed=analysis.readme_has_tech_stack,
            points=7,
            recommendation="Add a tech stack section that names the main frameworks and tools.",
        ),
        ReadinessChecklistItem(
            name="README includes screenshots or demo assets",
            passed=analysis.readme_has_demo_assets,
            points=7,
            recommendation="Add screenshots or a short demo GIF so reviewers can inspect the project quickly.",
        ),
        ReadinessChecklistItem(
            name="Automated tests exist",
            passed=analysis.has_tests,
            points=15,
            recommendation="Add automated tests for the core project workflow.",
        ),
        ReadinessChecklistItem(
            name="Dependency file exists",
            passed=analysis.has_dependency_file,
            points=5,
            recommendation="Add requirements.txt, pyproject.toml, package.json, or another dependency manifest.",
        ),
        ReadinessChecklistItem(
            name=".gitignore exists",
            passed=analysis.has_gitignore,
            points=6,
            recommendation="Add a .gitignore so generated files and secrets stay out of git.",
        ),
        ReadinessChecklistItem(
            name=".env.example exists",
            passed=analysis.has_env_example,
            points=5,
            recommendation="Add a .env.example to document required environment variables.",
        ),
        ReadinessChecklistItem(
            name="Architecture docs exist",
            passed=analysis.has_docs,
            points=4,
            recommendation="Add a docs/ folder with a short architecture or design note.",
        ),
        ReadinessChecklistItem(
            name="No long files detected",
            passed=long_file_count == 0,
            points=5,
            recommendation="Split long files into smaller modules with clearer responsibilities.",
        ),
        ReadinessChecklistItem(
            name="Risk density is low",
            passed=risk_density <= 0.20,
            points=5,
            recommendation="Reduce repeated risk signals such as many long files or missing project hygiene.",
        ),
        ReadinessChecklistItem(
            name="Project has multiple organized directories",
            passed=analysis.total_directories >= 2,
            points=3,
            recommendation="Organize code into directories such as app, services, tests, and docs.",
        ),
        ReadinessChecklistItem(
            name="Frontend/backend boundaries are clear",
            passed=analysis.has_frontend_backend_structure,
            points=2,
            recommendation="Use clear top-level boundaries such as frontend/ and backend/ when the project is full-stack.",
        ),
    ]
    production_checklist = [
        ReadinessChecklistItem(
            name="License file exists",
            passed=analysis.has_license,
            points=0,
            recommendation="Add a LICENSE file so the repository has clear usage terms.",
        ),
        ReadinessChecklistItem(
            name="CI workflow exists",
            passed=analysis.has_ci_config,
            points=0,
            recommendation="Add GitHub Actions or another CI workflow to run tests automatically.",
        ),
        ReadinessChecklistItem(
            name="Deployment configuration exists",
            passed=analysis.has_deployment_config,
            points=0,
            recommendation="Add Docker, Render, Vercel, or another deployment configuration when the project is meant to be demoed.",
        ),
        ReadinessChecklistItem(
            name="API documentation exists",
            passed=analysis.has_api_documentation,
            points=0,
            recommendation="Document API endpoints with examples so full-stack behavior is easier to evaluate.",
        ),
        ReadinessChecklistItem(
            name="Frontend calls backend API",
            passed=analysis.has_frontend_backend_integration,
            points=0,
            recommendation="Connect the frontend to backend API endpoints instead of leaving the layers isolated.",
        ),
    ]
    checklist = base_checklist + production_checklist

    score = sum(item.points for item in checklist if item.passed)
    failed_items = [item for item in checklist if not item.passed]
    priority_fixes = _prioritize_fixes(failed_items)

    if not priority_fixes:
        priority_fixes = ["Project looks ready for a resume review pass."]

    logger.info("Readiness score: %d/100 status=%s", score, _status_for_score(score))
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
        "README explains project purpose",
        "README includes usage or demo details",
        "README lists tech stack",
        "README includes screenshots or demo assets",
        "Dependency file exists",
        "License file exists",
        "CI workflow exists",
        "API documentation exists",
        "Frontend calls backend API",
        "Deployment configuration exists",
        ".env.example exists",
        ".gitignore exists",
        "Architecture docs exist",
        "No long files detected",
        "Risk density is low",
        "Project has multiple organized directories",
        "Frontend/backend boundaries are clear",
    ]
    failed_by_name = {item.name: item for item in failed_items}
    return [
        failed_by_name[name].recommendation
        for name in priority_order
        if name in failed_by_name
    ][:5]
