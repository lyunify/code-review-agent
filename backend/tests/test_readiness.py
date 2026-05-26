from app.models.schemas import RepositoryAnalysis, RiskSignal
from app.services.readiness import calculate_readiness


def test_readiness_score_rewards_resume_ready_project() -> None:
    analysis = RepositoryAnalysis(
        total_files=8,
        total_directories=4,
        languages={"Python": 5, "Markdown": 1, "TOML": 1, "Other": 1},
        largest_files=[],
        risks=[],
        has_readme=True,
        has_tests=True,
        has_gitignore=True,
        has_env_example=True,
        readme_has_setup=True,
        readme_has_usage=True,
    )

    readiness = calculate_readiness(analysis)

    assert readiness.score == 100
    assert readiness.status == "Resume-ready"
    assert all(item.passed for item in readiness.checklist)
    assert readiness.priority_fixes == ["Project looks ready for a resume review pass."]


def test_readiness_score_prioritizes_missing_project_hygiene() -> None:
    analysis = RepositoryAnalysis(
        total_files=2,
        total_directories=1,
        languages={"Python": 2},
        largest_files=[],
        risks=[
            RiskSignal(severity="medium", message="Repository does not contain a README file."),
            RiskSignal(severity="high", message="Repository does not appear to contain tests."),
            RiskSignal(severity="medium", message="Long file detected (350 lines).", path="app.py"),
        ],
        has_readme=False,
        has_tests=False,
        has_gitignore=False,
        has_env_example=False,
        readme_has_setup=False,
        readme_has_usage=False,
    )

    readiness = calculate_readiness(analysis)
    checklist = {item.name: item for item in readiness.checklist}

    assert readiness.score == 0
    assert readiness.status == "Needs work"
    assert checklist["README exists"].passed is False
    assert checklist["Automated tests exist"].passed is False
    assert checklist["No long files detected"].passed is False
    assert readiness.priority_fixes[:3] == [
        "Add automated tests for the core project workflow.",
        "Write a README that explains what the project does.",
        "Add setup instructions so an interviewer can run the project locally.",
    ]
