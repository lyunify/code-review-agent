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

    assert "Strong project" in feedback.mentor_summary
    assert len(feedback.resume_bullets) == 3
    assert "Python" in feedback.resume_bullets[0]
    assert len(feedback.interview_questions) >= 4
    assert all(hasattr(q, 'question') for q in feedback.interview_questions)
    assert all(hasattr(q, 'situation') for q in feedback.interview_questions)
    assert all(hasattr(q, 'action') for q in feedback.interview_questions)
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

    assert "Toy project" in feedback.mentor_summary
    assert feedback.next_steps[:2] == readiness.priority_fixes
    assert any("testing" in q.question.lower() for q in feedback.interview_questions)


def test_mentor_agent_uses_openai_client_when_enabled() -> None:
    analysis = RepositoryAnalysis(
        total_files=6,
        total_directories=3,
        languages={"Python": 5, "Markdown": 1},
        largest_files=[],
        risks=[],
        has_readme=True,
        has_tests=True,
    )
    readiness = ResumeReadiness(
        score=80,
        status="Almost ready",
        checklist=[],
        priority_fixes=["Add screenshots or a short demo GIF so reviewers can inspect the project quickly."],
    )
    expected_feedback = {
        "mentor_summary": "OpenAI generated mentor summary.",
        "resume_bullets": ["Bullet one", "Bullet two", "Bullet three"],
        "interview_questions": [
            {"question": "Question one?", "situation": "S1", "task": "T1", "action": "A1", "result": "R1"},
            {"question": "Question two?", "situation": "S2", "task": "T2", "action": "A2", "result": "R2"},
        ],
        "next_steps": ["Step one", "Step two"],
    }

    class FakeResponses:
        def parse(self, **kwargs):
            self.kwargs = kwargs
            return type("FakeResponse", (), {"output_parsed": expected_feedback})()

    class FakeClient:
        def __init__(self):
            self.responses = FakeResponses()

    feedback = generate_mentor_feedback(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        readiness=readiness,
        openai_client=FakeClient(),
        use_openai=True,
    )

    assert feedback.mentor_summary == "OpenAI generated mentor summary."
    assert feedback.resume_bullets == ["Bullet one", "Bullet two", "Bullet three"]
    assert feedback.interview_questions[0].question == "Question one?"


def test_mentor_agent_falls_back_when_openai_fails() -> None:
    analysis = RepositoryAnalysis(
        total_files=6,
        total_directories=3,
        languages={"Python": 5, "Markdown": 1},
        largest_files=[],
        risks=[],
        has_readme=True,
        has_tests=True,
    )
    readiness = ResumeReadiness(
        score=80,
        status="Almost ready",
        checklist=[],
        priority_fixes=["Add screenshots or a short demo GIF so reviewers can inspect the project quickly."],
    )

    class FailingResponses:
        def parse(self, **kwargs):
            raise RuntimeError("api unavailable")

    class FailingClient:
        def __init__(self):
            self.responses = FailingResponses()

    feedback = generate_mentor_feedback(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        readiness=readiness,
        openai_client=FailingClient(),
        use_openai=True,
    )

    assert "Borderline project" in feedback.mentor_summary
    assert len(feedback.resume_bullets) == 3


def test_mentor_summary_follows_verdict_format() -> None:
    """mentor_summary must start with a verdict word and contain 3 sentences."""
    analysis = RepositoryAnalysis(
        total_files=20,
        total_directories=6,
        languages={"Python": 15, "TypeScript": 5},
        largest_files=[],
        risks=[],
        has_readme=True,
        has_tests=True,
        has_gitignore=True,
        has_env_example=True,
        has_ci_config=True,
    )
    readiness = ResumeReadiness(
        score=88,
        status="Resume-ready",
        checklist=[],
        priority_fixes=["Project looks ready for a resume review pass."],
    )

    feedback = generate_mentor_feedback(
        repo_url="https://github.com/example/demo",
        analysis=analysis,
        readiness=readiness,
    )

    assert feedback.mentor_summary.startswith("Strong project")
    sentences = [s.strip() for s in feedback.mentor_summary.split(".") if s.strip()]
    assert len(sentences) >= 3
