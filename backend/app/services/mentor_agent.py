import logging
import os
from typing import Any

from dotenv import load_dotenv

from app.models.schemas import (
    GitHubMetadata,
    InterviewQuestion,
    MentorFeedback,
    RepositoryAnalysis,
    ResumeReadiness,
)

logger = logging.getLogger(__name__)

DEFAULT_OPENAI_MODEL = "gpt-4o-mini"


def generate_mentor_feedback(
    repo_url: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
    github_metadata: GitHubMetadata | None = None,
    openai_client: Any | None = None,
    use_openai: bool | None = None,
) -> MentorFeedback:
    logger.info("Generating mentor feedback: repo=%s", repo_url)
    should_use_openai = _should_use_openai(use_openai=use_openai, openai_client=openai_client)
    if should_use_openai:
        try:
            result = _generate_openai_feedback(
                repo_url=repo_url,
                analysis=analysis,
                readiness=readiness,
                github_metadata=github_metadata,
                openai_client=openai_client,
            )
            logger.info("Mentor feedback generated via OpenAI")
            return result
        except Exception as exc:
            logger.warning("OpenAI unavailable, falling back to rule-based: %s", exc)
            return _generate_rule_based_feedback(
                repo_url=repo_url,
                analysis=analysis,
                readiness=readiness,
                github_metadata=github_metadata,
            )

    logger.info("Mentor feedback generated via rule-based fallback")
    return _generate_rule_based_feedback(
        repo_url=repo_url,
        analysis=analysis,
        readiness=readiness,
        github_metadata=github_metadata,
    )


def _generate_rule_based_feedback(
    repo_url: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
    github_metadata: GitHubMetadata | None = None,
) -> MentorFeedback:
    project_name = _project_name_from_url(repo_url)
    primary_language = _primary_language(analysis)
    mentor_summary = _build_summary(project_name, primary_language, analysis, readiness)

    return MentorFeedback(
        mentor_summary=mentor_summary,
        resume_bullets=_build_resume_bullets(project_name, primary_language, analysis, readiness),
        interview_questions=_build_interview_questions(project_name, primary_language, analysis, readiness),
        next_steps=_build_next_steps(readiness),
    )


def _should_use_openai(use_openai: bool | None, openai_client: Any | None) -> bool:
    if use_openai is not None:
        return use_openai

    load_dotenv()
    return bool(openai_client or os.getenv("OPENAI_API_KEY"))


def _generate_openai_feedback(
    repo_url: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
    github_metadata: GitHubMetadata | None = None,
    openai_client: Any | None = None,
) -> MentorFeedback:
    client = openai_client or _create_openai_client()
    response = client.responses.parse(
        model=os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL),
        input=[
            {
                "role": "system",
                "content": (
                    "You are a senior software engineer who has interviewed over 100 SDE intern "
                    "candidates at top tech companies. You review GitHub projects with honest, "
                    "direct judgment. Your job is to tell students the truth about whether their "
                    "project is strong enough to present in interviews — not to encourage them, "
                    "but to prepare them for reality. "
                    "Do not invent features that are not supported by the repository signals."
                ),
            },
            {
                "role": "user",
                "content": _build_openai_prompt(
                    repo_url=repo_url,
                    analysis=analysis,
                    readiness=readiness,
                    github_metadata=github_metadata,
                ),
            },
        ],
        text_format=MentorFeedback,
    )

    parsed = response.output_parsed
    if isinstance(parsed, MentorFeedback):
        return parsed
    return MentorFeedback.model_validate(parsed)  # type: ignore[no-any-return]


def _create_openai_client() -> Any:
    from openai import OpenAI

    return OpenAI()


def _build_openai_prompt(
    repo_url: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
    github_metadata: GitHubMetadata | None = None,
) -> str:
    failed_items = [item for item in readiness.checklist if not item.passed]

    github_lines = ""
    if github_metadata:
        if github_metadata.description:
            github_lines += f"GitHub description: {github_metadata.description}\n"
        if github_metadata.topics:
            github_lines += f"GitHub topics: {', '.join(github_metadata.topics)}\n"
        if github_metadata.is_fork:
            github_lines += "Is fork: yes\n"

    return (
        f"Repository URL: {repo_url}\n"
        f"{github_lines}"
        f"Total files: {analysis.total_files}\n"
        f"Total directories: {analysis.total_directories}\n"
        f"Languages: {analysis.languages}\n"
        f"Has tests: {analysis.has_tests}\n"
        f"Has CI: {analysis.has_ci_config}\n"
        f"Has full-stack structure: {analysis.has_frontend_backend_structure}\n"
        f"Risk count: {len(analysis.risks)}\n"
        f"Readiness score: {readiness.score}/100\n"
        f"Readiness status: {readiness.status}\n"
        f"Priority fixes: {readiness.priority_fixes}\n"
        f"Failed checklist items: {[item.name for item in failed_items]}\n\n"
        "For mentor_summary: write exactly 3 sentences.\n"
        'Sentence 1: Start with "Strong project", "Borderline project", or "Toy project" '
        "followed by the single most important reason why.\n"
        "Sentence 2: What an interviewer's first impression is when they open this repo.\n"
        "Sentence 3: The one thing most likely to go wrong in an interview conversation about this project.\n"
        "Be direct and honest. Do not hedge.\n\n"
        "For each interview_question, generate a question specific to THIS project's actual "
        "architecture and design decisions — not generic questions that apply to any project.\n"
        "- question: a specific technical question about a real design choice in this project\n"
        "- situation: one sentence setting the scene (mention the project name and what it solves)\n"
        "- task: what the student was specifically responsible for on this project\n"
        "- action: the concrete technical decision they made and why (reference actual signals: "
        "languages, has_tests, has_ci_config, has_frontend_backend_structure)\n"
        "- result: what it achieved or what it demonstrates to an interviewer\n\n"
        "For resume_bullets: truthful, action-oriented, do not overclaim impact.\n"
        "Return mentor feedback for a student preparing this project for SDE intern applications."
    )


def _project_name_from_url(repo_url: str) -> str:
    return repo_url.rstrip("/").split("/")[-1].replace("-", " ").replace("_", " ").title()


def _primary_language(analysis: RepositoryAnalysis) -> str:
    if not analysis.languages:
        return "the main stack"
    return max(analysis.languages.items(), key=lambda item: item[1])[0]


def _build_summary(
    project_name: str,
    primary_language: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
) -> str:
    # Sentence 1: verdict
    if readiness.score >= 85:
        verdict = (
            "Strong project — it covers documentation, testing, and engineering hygiene "
            "at a level most intern candidates skip."
        )
    elif readiness.score >= 65:
        top_fix = readiness.priority_fixes[0].rstrip(".").lower() if readiness.priority_fixes else "missing signals"
        verdict = f"Borderline project — the foundations are there but {top_fix} will draw an interviewer's attention."
    else:
        verdict = (
            "Toy project at this stage — it lacks the documentation, tests, and structure "
            "an interviewer expects to see."
        )

    # Sentence 2: interviewer first impression — based on what IS present, not just what's missing
    strengths = []
    if analysis.has_tests:
        strengths.append("automated tests")
    if analysis.has_ci_config:
        strengths.append("CI configuration")
    if analysis.has_frontend_backend_structure:
        strengths.append("full-stack structure")

    if strengths:
        reaction = f"An interviewer will notice the {', '.join(strengths)} and take the project seriously."
    elif analysis.has_readme and analysis.readme_has_project_purpose:
        reaction = "An interviewer will appreciate the README but will immediately probe what happens if they try to run the project — make sure setup instructions are airtight."
    elif len(analysis.languages) >= 3:
        reaction = f"The use of {len(analysis.languages)} languages signals ambition, but without tests an interviewer will question whether the core workflow actually runs end-to-end."
    else:
        reaction = "An interviewer's first question will be: can I clone this and run it in under five minutes?"

    # Sentence 3: main risk
    ready_phrase = "Project looks ready for a resume review pass."
    if readiness.priority_fixes and readiness.priority_fixes[0] != ready_phrase:
        top_fix = readiness.priority_fixes[0].rstrip(".")
        risk = f"The main risk: {top_fix.lower()} — address this before your first technical screen."
    else:
        risk = (
            f"The main risk: be ready to explain every design decision in {project_name} "
            "without hesitation, since interviewers will probe the details."
        )

    return f"{verdict} {reaction} {risk}"


def _build_resume_bullets(
    project_name: str,
    primary_language: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
) -> list[str]:
    quality_phrase = "with automated tests and project documentation" if analysis.has_tests else "with a focus on core functionality"
    readiness_phrase = "resume-readiness feedback" if readiness.score >= 65 else "repository quality feedback"

    return [
        (
            f"Built {project_name}, a {primary_language}-based software project "
            f"{quality_phrase}, organized across {analysis.total_directories} directories."
        ),
        (
            f"Implemented repository analysis workflows that inspect documentation, tests, "
            f"dependencies, structure, and risk signals to generate {readiness_phrase}."
        ),
        (
            f"Designed a review dashboard that summarizes {analysis.total_files} files, "
            f"language distribution, readiness score, and prioritized improvement steps."
        ),
    ]


def _build_interview_questions(
    project_name: str,
    primary_language: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
) -> list[InterviewQuestion]:
    questions: list[InterviewQuestion] = []

    # Always: language choice
    questions.append(InterviewQuestion(
        question=f"Why did you choose {primary_language} for this project?",
        situation=f"I was building {project_name} to solve a real problem I encountered.",
        task="I needed to choose a language and stack that matched the project's requirements.",
        action=f"I chose {primary_language} because it had strong support for the core workflows I needed to implement.",
        result="The choice let me move quickly while keeping the codebase readable and maintainable.",
    ))

    # If full-stack structure present
    if analysis.has_frontend_backend_structure:
        questions.append(InterviewQuestion(
            question="How did you design the API between your frontend and backend?",
            situation=f"I built {project_name} as a full-stack application with a separate frontend and backend.",
            task="I had to define a clean API contract that both sides could rely on.",
            action="I designed REST endpoints with JSON responses, keeping route handlers thin and business logic in service modules.",
            result="This separation made it easy to test the backend independently and swap the frontend without touching business logic.",
        ))

    # Testing: always included (framing differs based on whether tests exist)
    if analysis.has_tests:
        questions.append(InterviewQuestion(
            question="What is your testing strategy and what would you test first?",
            situation=f"I added automated tests to {project_name} to catch regressions and build confidence in the core logic.",
            task="I had to decide which parts of the system were most important to cover first.",
            action="I focused tests on the business logic layer — the parts that are deterministic and have the highest impact if they break.",
            result="The test suite gives me confidence when making changes and demonstrates to interviewers that I ship maintainable code.",
        ))
    else:
        questions.append(InterviewQuestion(
            question="What testing approach would you add to this project first, and why?",
            situation=f"{project_name} currently lacks automated tests, and I've thought about how to address that.",
            task="I need to decide which part of the codebase would deliver the most value from testing first.",
            action="I would start with unit tests on the core business logic — the deterministic functions that have the highest impact if they break — before adding integration or end-to-end tests.",
            result="Adding even a small test suite demonstrates to interviewers that I understand production engineering standards and ship maintainable code.",
        ))

    # If CI present
    if analysis.has_ci_config:
        questions.append(InterviewQuestion(
            question="How does your CI pipeline work and why did you set it up?",
            situation=f"I configured a CI pipeline for {project_name} to automate quality checks.",
            task="I needed a way to catch issues before they reached the main branch.",
            action="I set up GitHub Actions to run tests and build checks on every push and pull request.",
            result="This means any regression is caught immediately, which is a production engineering habit that carries directly into a team environment.",
        ))

    # Always: architecture / refactor
    top_fix = readiness.priority_fixes[0].lower().rstrip(".") if readiness.priority_fixes else "further modularizing the larger files"
    questions.append(InterviewQuestion(
        question="How is the code organized, and what would you refactor next?",
        situation=f"I structured {project_name} with maintainability in mind from the start.",
        task="I had to balance moving fast with keeping the codebase navigable.",
        action=f"I organized the code into focused modules — each with a single clear responsibility — across {analysis.total_directories} directories.",
        result=f"The structure makes it easy to find and change any part of the system. What I'd improve next: {top_fix}.",
    ))

    # If score >= 85: tradeoff awareness question
    if readiness.score >= 85:
        questions.append(InterviewQuestion(
            question="What is the tradeoff you are most proud of in this implementation?",
            situation=f"Building {project_name} required making real engineering tradeoffs under time constraints.",
            task="I had to choose between competing approaches and commit to one.",
            action="I prioritized clarity and correctness over premature optimization, keeping the codebase simple enough that any contributor could understand each module's responsibility at a glance.",
            result="This made the project easier to extend and review — and gives me a concrete answer when interviewers ask about tradeoffs.",
        ))

    # If score < 85: production readiness awareness
    if readiness.score < 85:
        fix = readiness.priority_fixes[0].lower().rstrip(".") if readiness.priority_fixes else "improving test coverage and documentation"
        questions.append(InterviewQuestion(
            question="What changes would make this project more production-ready?",
            situation=f"I know {project_name} is a portfolio project, but I've thought about what it would take to run it in production.",
            task="I had to be honest about what's missing and prioritize the most impactful improvements.",
            action=f"The highest priority would be: {fix}.",
            result="Being able to articulate this shows I understand production engineering standards even when working on a side project.",
        ))

    return questions


def _build_next_steps(readiness: ResumeReadiness) -> list[str]:
    if readiness.priority_fixes == ["Project looks ready for a resume review pass."]:
        return [
            "Add a short project story to the README: problem, users, architecture, and outcome.",
            "Prepare a 60-second explanation of the most technical part of the project.",
        ]

    return readiness.priority_fixes[:4]
