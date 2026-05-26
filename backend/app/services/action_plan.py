from app.models.schemas import ActionPlan, ActionPlanItem, RepositoryAnalysis, ResumeReadiness

ACTION_PLAN_GUIDANCE = {
    "Automated tests exist": ActionPlanItem(
        title="Add automated tests",
        category="Testing",
        why_it_matters="Interviewers trust projects more when the core behavior is protected by repeatable tests.",
        how_to_improve="Add tests for the core workflow, then document how to run them locally.",
        resume_impact="Shows engineering discipline and reduces the project looking like a one-off demo.",
    ),
    "README exists": ActionPlanItem(
        title="Write the project README",
        category="Documentation",
        why_it_matters="A recruiter or interviewer may only spend a minute deciding whether the project is understandable.",
        how_to_improve="Create a README with a short overview, feature list, setup steps, and demo instructions.",
        resume_impact="Makes the project easier to evaluate without needing to read the source code first.",
    ),
    "README includes setup instructions": ActionPlanItem(
        title="Document local setup",
        category="Documentation",
        why_it_matters="A serious project should be runnable by someone who did not build it.",
        how_to_improve="Add exact install, environment variable, and run commands for backend and frontend.",
        resume_impact="Signals that the project is maintained like a real engineering artifact.",
    ),
    "README explains project purpose": ActionPlanItem(
        title="Clarify the product purpose",
        category="Product",
        why_it_matters="A resume project is stronger when it solves a clear user problem instead of feeling like a class exercise.",
        how_to_improve="Add a short paragraph describing the target user, pain point, and main workflow.",
        resume_impact="Helps you explain the product motivation in behavioral and technical interviews.",
    ),
    "README includes usage or demo details": ActionPlanItem(
        title="Add usage and demo notes",
        category="Product",
        why_it_matters="Demo details help reviewers quickly understand what the app does after it launches.",
        how_to_improve="Add a sample repo URL, expected output, and a short walkthrough of the main flow.",
        resume_impact="Turns the project from code-on-GitHub into a demonstrable product.",
    ),
    "README lists tech stack": ActionPlanItem(
        title="List the tech stack",
        category="Documentation",
        why_it_matters="Interviewers want to quickly see what technologies you used and where they fit.",
        how_to_improve="Add a tech stack section covering frontend, backend, database, AI integration, and tests.",
        resume_impact="Makes it easier to connect the project to SDE intern job requirements.",
    ),
    "README includes screenshots or demo assets": ActionPlanItem(
        title="Add screenshots",
        category="Presentation",
        why_it_matters="Screenshots let recruiters evaluate the product before cloning or running it.",
        how_to_improve="Capture the dashboard, action plan, and mentor pages, then reference them in the README.",
        resume_impact="Makes the repo feel portfolio-ready and easier to discuss visually.",
    ),
    "Dependency file exists": ActionPlanItem(
        title="Add dependency manifests",
        category="Setup",
        why_it_matters="Dependency files make the app reproducible on another machine.",
        how_to_improve="Add requirements.txt or pyproject.toml for Python and package.json for JavaScript if needed.",
        resume_impact="Shows that the project can be installed and maintained beyond your laptop.",
    ),
    "License file exists": ActionPlanItem(
        title="Add a license",
        category="Project hygiene",
        why_it_matters="A public repository should clearly state how others may use or inspect the code.",
        how_to_improve="Add a LICENSE file, commonly MIT for portfolio projects unless another license is required.",
        resume_impact="Makes the repository look more complete and open-source ready.",
    ),
    "CI workflow exists": ActionPlanItem(
        title="Add a CI workflow",
        category="Automation",
        why_it_matters="Continuous integration proves the project can be checked automatically after each change.",
        how_to_improve="Add a GitHub Actions workflow that runs backend tests, frontend tests, and the production build.",
        resume_impact="Shows professional engineering habits beyond local manual testing.",
    ),
    "API documentation exists": ActionPlanItem(
        title="Document API endpoints",
        category="Documentation",
        why_it_matters="Full-stack projects are easier to review when the API contract is visible.",
        how_to_improve="Add endpoint documentation with request/response examples in README or docs/api.md.",
        resume_impact="Helps you explain backend design and frontend/backend communication in interviews.",
    ),
    "Frontend calls backend API": ActionPlanItem(
        title="Connect frontend and backend",
        category="Full-stack",
        why_it_matters="A full-stack project should show real data flow between client and server.",
        how_to_improve="Use a typed API client or fetch wrapper in the frontend to call backend endpoints.",
        resume_impact="Demonstrates end-to-end application behavior rather than isolated layers.",
    ),
    "Deployment configuration exists": ActionPlanItem(
        title="Add deployment configuration",
        category="Deployment",
        why_it_matters="Deployment configuration makes it easier to share a working demo.",
        how_to_improve="Add a Dockerfile, docker-compose.yml, Render config, Vercel config, or deployment notes.",
        resume_impact="Shows product thinking beyond code that only runs locally.",
    ),
    ".env.example exists": ActionPlanItem(
        title="Document environment variables",
        category="Setup",
        why_it_matters="Apps with APIs or secrets need safe setup instructions without exposing real keys.",
        how_to_improve="Add a .env.example with placeholder keys and explain each variable in the README.",
        resume_impact="Signals awareness of configuration and secret-management basics.",
    ),
    ".gitignore exists": ActionPlanItem(
        title="Protect generated and secret files",
        category="Setup",
        why_it_matters="A missing .gitignore can leak local files, databases, environments, or credentials.",
        how_to_improve="Add ignores for virtual environments, node_modules, build output, databases, and .env files.",
        resume_impact="Shows professional project hygiene.",
    ),
    "Architecture docs exist": ActionPlanItem(
        title="Add architecture notes",
        category="Architecture",
        why_it_matters="Architecture notes help you explain system boundaries and tradeoffs in interviews.",
        how_to_improve="Add docs/architecture.md covering data flow, API boundaries, storage, and AI integration.",
        resume_impact="Gives you a prepared technical story beyond the UI demo.",
    ),
    "No long files detected": ActionPlanItem(
        title="Split long files",
        category="Maintainability",
        why_it_matters="Very long files are harder to review, test, and explain.",
        how_to_improve="Move route handlers, services, models, and UI sections into smaller focused modules.",
        resume_impact="Shows you can organize code like a production codebase.",
    ),
    "Risk density is low": ActionPlanItem(
        title="Reduce repeated risk signals",
        category="Maintainability",
        why_it_matters="Many repeated warnings suggest the project needs a cleanup pass before it represents your work.",
        how_to_improve="Fix the most common risk type first, then rerun the analysis to check improvement.",
        resume_impact="Demonstrates iterative improvement and engineering judgment.",
    ),
    "Project has multiple organized directories": ActionPlanItem(
        title="Organize the project structure",
        category="Architecture",
        why_it_matters="Clear folders make responsibilities easier to understand at a glance.",
        how_to_improve="Group code into directories such as app, services, tests, docs, frontend, and backend.",
        resume_impact="Makes the repository look closer to a real team project than a single-file assignment.",
    ),
    "Frontend/backend boundaries are clear": ActionPlanItem(
        title="Clarify frontend and backend boundaries",
        category="Architecture",
        why_it_matters="Full-stack projects are easier to reason about when client and server responsibilities are separated.",
        how_to_improve="Use clear top-level folders and document how the frontend communicates with the backend API.",
        resume_impact="Helps you discuss system design at an intern interview level.",
    ),
}


def generate_action_plan(analysis: RepositoryAnalysis, readiness: ResumeReadiness) -> ActionPlan:
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
    failed_by_name = {item.name: item for item in readiness.checklist if not item.passed}
    failed_items = [failed_by_name[name] for name in priority_order if name in failed_by_name]
    items = [ACTION_PLAN_GUIDANCE[item.name] for item in failed_items if item.name in ACTION_PLAN_GUIDANCE]

    if not items:
        items = [
            ActionPlanItem(
                title="Prepare the interview story",
                category="Interview",
                why_it_matters="Once the repo is polished, the next step is turning it into a clear engineering narrative.",
                how_to_improve=(
                    f"Practice explaining the architecture, tradeoffs, and one improvement you would make next "
                    f"for a {analysis.total_files}-file project."
                ),
                resume_impact="Helps you confidently connect the project to SDE intern interview questions.",
            )
        ]

    return ActionPlan(items=items[:5])
