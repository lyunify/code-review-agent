from app.models.schemas import RepositoryAnalysis, ResumeReadiness
from app.services.mentor_agent import generate_mentor_feedback


def test_mentor_agent_generates_resume_and_interview_guidance() -> None:
    analysis = RepositoryAnalysis(
        total_files=12,
        total_directories=5,
        languages={"Python": 8, "Markdown": 2, "YAML": 2},
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
        has_frontend_backend_structure=False,
    )
    readiness = ResumeReadiness(
        score=92,
        status="Resume-ready",
        checklist=[],
        priority_fixes=["Project looks ready for a resume review pass."],
    )

    feedback = generate_mentor_feedback(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        readiness=readiness,
    )

    assert "Resume-ready" in feedback.mentor_summary
    assert len(feedback.resume_bullets) == 3
    assert "Python" in feedback.resume_bullets[0]
    assert len(feedback.interview_questions) >= 4
    assert len(feedback.next_steps) >= 1


def test_mentor_agent_focuses_on_priority_fixes_for_weaker_project() -> None:
    analysis = RepositoryAnalysis(
        total_files=4,
        total_directories=1,
        languages={"Python": 4},
        largest_files=[],
        risks=[],
        has_readme=False,
        has_tests=False,
        has_gitignore=False,
        has_env_example=False,
    )
    readiness = ResumeReadiness(
        score=25,
        status="Needs work",
        checklist=[],
        priority_fixes=[
            "Add automated tests for the core project workflow.",
            "Write a README that explains what the project does.",
        ],
    )

    feedback = generate_mentor_feedback(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        readiness=readiness,
    )

    assert "Needs work" in feedback.mentor_summary
    assert feedback.next_steps[:2] == readiness.priority_fixes
    assert any("testing" in question.lower() for question in feedback.interview_questions)
