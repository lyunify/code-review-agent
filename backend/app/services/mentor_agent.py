import logging
import os
from typing import Any

from dotenv import load_dotenv

from app.models.schemas import GitHubMetadata, MentorFeedback, RepositoryAnalysis, ResumeReadiness

logger = logging.getLogger(__name__)

DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"


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
        interview_questions=_build_interview_questions(primary_language, readiness),
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

    # Sentence 2: interviewer reaction based on key signals
    strengths = []
    if analysis.has_tests:
        strengths.append("automated tests")
    if analysis.has_ci_config:
        strengths.append("CI configuration")
    if analysis.has_frontend_backend_structure:
        strengths.append("full-stack structure")

    if strengths:
        reaction = f"An interviewer will notice the {', '.join(strengths)} and take the project seriously."
    else:
        reaction = "An interviewer will immediately ask about testing and production readiness."

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


def _build_interview_questions(primary_language: str, readiness: ResumeReadiness) -> list[str]:
    questions = [
        f"Why did you choose {primary_language} for this project?",
        "What is the main user problem this project solves?",
        "How is the code organized, and what would you refactor next?",
        "How would you test the most important workflow?",
    ]

    if readiness.score < 85:
        questions.append("What changes would make this project more resume-ready?")
    else:
        questions.append("What tradeoff are you most proud of in this implementation?")

    if any("test" in fix.lower() for fix in readiness.priority_fixes):
        questions.append("What testing strategy would you add first, and why?")

    return questions


def _build_next_steps(readiness: ResumeReadiness) -> list[str]:
    if readiness.priority_fixes == ["Project looks ready for a resume review pass."]:
        return [
            "Add a short project story to the README: problem, users, architecture, and outcome.",
            "Prepare a 60-second explanation of the most technical part of the project.",
        ]

    return readiness.priority_fixes[:4]
