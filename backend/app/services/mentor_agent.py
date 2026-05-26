from app.models.schemas import MentorFeedback, RepositoryAnalysis, ResumeReadiness


def generate_mentor_feedback(
    repo_url: str,
    analysis: RepositoryAnalysis,
    readiness: ResumeReadiness,
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
    if readiness.score >= 85:
        guidance = "It is close to something you can confidently discuss in an internship interview."
    elif readiness.score >= 65:
        guidance = "It has a solid base, but a few project-packaging improvements would make it stronger."
    else:
        guidance = "It needs clearer documentation and engineering hygiene before it should lead your resume."

    return (
        f"{project_name} is currently rated {readiness.status} ({readiness.score}/100). "
        f"The repository is primarily {primary_language} with {analysis.total_files} files and "
        f"{len(analysis.risks)} review signal(s). {guidance}"
    )


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
