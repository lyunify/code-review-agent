from app.models.schemas import RepositoryAnalysis
from app.services.action_plan import generate_action_plan
from app.services.readiness import calculate_readiness


def test_action_plan_turns_failed_readiness_items_into_student_fixes() -> None:
    analysis = RepositoryAnalysis(
        total_files=4,
        total_directories=1,
        languages={"Python": 3, "Markdown": 1},
        largest_files=[],
        risks=[],
        has_readme=True,
        has_tests=False,
        has_gitignore=True,
        has_env_example=False,
        readme_has_setup=False,
        readme_has_usage=True,
        readme_has_project_purpose=True,
        readme_has_tech_stack=True,
        readme_has_demo_assets=False,
        has_dependency_file=True,
        has_docs=False,
        has_frontend_backend_structure=False,
    )
    readiness = calculate_readiness(analysis)

    action_plan = generate_action_plan(analysis=analysis, readiness=readiness)

    assert len(action_plan.items) == 5
    assert action_plan.items[0].title == "Add automated tests"
    assert action_plan.items[0].category == "Testing"
    assert "core workflow" in action_plan.items[0].how_to_improve
    assert action_plan.items[0].resume_impact == "Shows engineering discipline and reduces the project looking like a one-off demo."
    assert action_plan.items[1].title == "Document local setup"


def test_action_plan_gives_launch_polish_for_resume_ready_project() -> None:
    analysis = RepositoryAnalysis(
        total_files=12,
        total_directories=5,
        languages={"Python": 6, "TypeScript": 4, "Markdown": 2},
        largest_files=[],
        risks=[],
        has_readme=True,
        has_tests=True,
        has_gitignore=True,
        has_env_example=True,
        readme_has_setup=True,
        readme_has_usage=True,
        readme_has_project_purpose=True,
        readme_has_tech_stack=True,
        readme_has_demo_assets=True,
        has_dependency_file=True,
        has_docs=True,
        has_frontend_backend_structure=True,
    )
    readiness = calculate_readiness(analysis)

    action_plan = generate_action_plan(analysis=analysis, readiness=readiness)

    assert len(action_plan.items) == 1
    assert action_plan.items[0].title == "Prepare the interview story"
    assert action_plan.items[0].category == "Interview"
