from __future__ import annotations

import json
import re
import tomllib
from dataclasses import dataclass
from pathlib import Path

from app.core.config import MAX_FILE_BYTES_TO_READ, is_ignored_path
from app.models.schemas import (
    ArchitectureEdge,
    ArchitectureFlow,
    ArchitectureNode,
    FileMetric,
    ProjectIntelligence,
    StackEvidence,
    StackItem,
    ToyProjectRisk,
    ToyRiskReason,
)


@dataclass(frozen=True)
class TechDefinition:
    name: str
    category: str
    description: str
    packages: tuple[str, ...] = ()
    files: tuple[str, ...] = ()
    text_markers: tuple[str, ...] = ()


TECH_DEFINITIONS: tuple[TechDefinition, ...] = (
    TechDefinition("React", "Frontend", "Component-based UI framework.", packages=("react",)),
    TechDefinition("Vue", "Frontend", "Progressive frontend framework.", packages=("vue",)),
    TechDefinition("Next.js", "Frontend", "React framework for routing and rendering.", packages=("next",)),
    TechDefinition("Vite", "Frontend", "Frontend build and development server.", packages=("vite",), files=("vite.config.ts", "vite.config.js")),
    TechDefinition("TypeScript", "Frontend", "Typed JavaScript used for safer frontend code.", packages=("typescript",), files=("tsconfig.json",)),
    TechDefinition("Axios", "Frontend", "HTTP client used by the frontend.", packages=("axios",), text_markers=("axios.", "from 'axios'", 'from "axios"')),
    TechDefinition("FastAPI", "Backend", "Python API framework.", packages=("fastapi",), text_markers=("from fastapi", "FastAPI(")),
    TechDefinition("Flask", "Backend", "Python web framework.", packages=("flask",), text_markers=("from flask", "Flask(")),
    TechDefinition("Django", "Backend", "Python web framework with batteries included.", packages=("django",), text_markers=("django",)),
    TechDefinition("Spring Boot", "Backend", "Java application framework for backend services.", packages=("spring-boot", "spring-boot-starter-web"), files=("pom.xml", "build.gradle")),
    TechDefinition("SQLAlchemy", "Backend", "Python ORM and database toolkit.", packages=("sqlalchemy",), text_markers=("sqlalchemy",)),
    TechDefinition("Alembic", "Backend", "Database migration tool.", packages=("alembic",), files=("alembic.ini",)),
    TechDefinition("Pydantic", "Backend", "Python data validation and schema modeling.", packages=("pydantic",), text_markers=("BaseModel",)),
    TechDefinition("Redis", "Data/Queue", "In-memory store used for cache, rate limits, or queues.", packages=("redis",), text_markers=("redis://", "Redis(")),
    TechDefinition("RQ", "Data/Queue", "Redis-backed background job queue.", packages=("rq",), text_markers=("rq.Queue", "Queue(")),
    TechDefinition("Celery", "Data/Queue", "Distributed task queue for background work.", packages=("celery",), text_markers=("Celery(",)),
    TechDefinition("PostgreSQL", "Database", "Relational database.", packages=("psycopg", "psycopg2", "asyncpg"), text_markers=("postgres:", "postgresql://")),
    TechDefinition("SQLite", "Database", "File-backed relational database.", text_markers=("sqlite://", ".sqlite", ".db")),
    TechDefinition("MongoDB", "Database", "Document database.", packages=("pymongo", "motor", "mongoose"), text_markers=("mongodb://",)),
    TechDefinition("Docker", "Infrastructure", "Containerization for local or production runtime.", files=("Dockerfile",)),
    TechDefinition("Docker Compose", "Infrastructure", "Multi-service local orchestration.", files=("docker-compose.yml", "docker-compose.yaml")),
    TechDefinition("Nginx", "Infrastructure", "Reverse proxy or static asset server.", files=("nginx.conf",), text_markers=("nginx",)),
    TechDefinition("GitHub Actions", "Quality/CI", "CI workflow automation.", files=(".github/workflows",)),
    TechDefinition("Pytest", "Quality/CI", "Python test framework.", packages=("pytest",), files=("pytest.ini",)),
    TechDefinition("Vitest", "Quality/CI", "Frontend test runner.", packages=("vitest",)),
    TechDefinition("ESLint", "Quality/CI", "JavaScript and TypeScript linting.", packages=("eslint",), files=("eslint.config.js", "eslint.config.mjs")),
    TechDefinition("Ruff", "Quality/CI", "Python linting and formatting.", packages=("ruff",)),
    TechDefinition("Mypy", "Quality/CI", "Static typing checks for Python.", packages=("mypy",), files=("mypy.ini",)),
    TechDefinition("OpenAI API", "AI/External API", "LLM API integration.", packages=("openai",), text_markers=("openai", "OPENAI_API_KEY")),
    TechDefinition("GitHub API", "AI/External API", "GitHub metadata or repository API integration.", text_markers=("api.github.com", "github.com/repos")),
)


def infer_project_intelligence(repo_path: Path, files: list[FileMetric]) -> ProjectIntelligence:
    evidence_by_tech = _collect_tech_evidence(repo_path)
    stack = _build_stack(evidence_by_tech)
    architecture = _build_architecture(stack=stack, files=files, repo_path=repo_path)
    return ProjectIntelligence(stack=stack, architecture=architecture)


def build_toy_project_risk(
    *,
    stack: list[StackItem],
    architecture: ArchitectureFlow,
    files: list[FileMetric],
    total_directories: int,
    risk_count: int,
    has_readme: bool,
    has_tests: bool,
    has_dependency_file: bool,
    has_env_example: bool,
    has_frontend_backend_structure: bool,
    has_deployment_config: bool,
    has_ci_config: bool,
    has_api_documentation: bool,
    has_frontend_backend_integration: bool,
) -> ToyProjectRisk:
    stack_names = {item.name for item in stack}
    stack_categories = {item.category for item in stack}
    node_kinds = {node.kind for node in architecture.nodes}
    edge_labels = {edge.label for edge in architecture.edges}
    has_persistence = "Database" in stack_categories or "database" in node_kinds
    has_async_processing = bool({"Redis", "RQ", "Celery"} & stack_names) and "worker" in node_kinds
    has_full_stack_shape = (
        has_frontend_backend_structure
        or ({"Frontend", "Backend"} <= stack_categories)
        or bool({"frontend", "backend"} <= node_kinds)
    )
    has_api_flow = has_frontend_backend_integration or "calls API" in edge_labels
    has_runtime_shape = has_deployment_config or bool({"Docker", "Docker Compose"} & stack_names)
    has_quality_shape = has_tests or has_ci_config or bool({"Pytest", "Vitest", "GitHub Actions", "Ruff", "Mypy"} & stack_names)

    score = 0
    reasons: list[ToyRiskReason] = []

    def reward(points: int, title: str, evidence: str) -> None:
        nonlocal score
        score += points
        reasons.append(ToyRiskReason(title=title, evidence=evidence, sentiment="positive"))

    def penalty(points: int, title: str, evidence: str) -> None:
        nonlocal score
        score -= points
        reasons.append(ToyRiskReason(title=title, evidence=evidence, sentiment="negative"))

    if has_full_stack_shape:
        reward(18, "Clear product boundaries", _first_path(files, {"frontend", "backend", "web", "api"}))
    else:
        penalty(18, "Single-surface structure", "No separate frontend/backend boundary inferred")

    if has_api_flow:
        reward(14, "Frontend-to-API integration", _frontend_api_evidence(files))
    elif has_full_stack_shape:
        penalty(12, "Integration proof is thin", "Frontend/backend folders exist, but no API call evidence was found")

    if has_persistence:
        reward(14, "Persistent data layer", _first_stack_evidence(stack, {"PostgreSQL", "SQLite", "MongoDB", "SQLAlchemy"}))
    else:
        penalty(14, "No persistence signal", "No database, ORM, or migration evidence found")

    if has_async_processing:
        reward(10, "Background work path", _first_path(files, {"worker", "jobs", "tasks", "queue"}))
    if has_runtime_shape:
        reward(12, "Runnable deployment shape", _first_stack_evidence(stack, {"Docker Compose", "Docker"}))
    else:
        penalty(10, "Runtime story is missing", "No Docker, compose, or deployment config found")

    if has_quality_shape:
        reward(14, "Automated quality signal", _first_stack_evidence(stack, {"Pytest", "Vitest", "GitHub Actions", "Ruff", "Mypy"}))
    else:
        penalty(16, "No automated quality proof", "No tests, lint, type check, or CI signal found")

    if has_readme and has_dependency_file and has_env_example:
        reward(10, "Clone-and-run evidence", ".env.example and dependency manifests are present")
    elif not has_readme:
        penalty(10, "No README context", "README is missing")
    elif not has_dependency_file:
        penalty(8, "Dependencies are not declared", "No dependency manifest found")
    elif not has_env_example:
        penalty(5, "Configuration is not reviewable", ".env.example is missing")

    if has_api_documentation:
        reward(6, "API is explainable", "API documentation or endpoint examples found")
    if risk_count >= max(3, len(files) // 12):
        penalty(8, "Risk density is noticeable", f"{risk_count} risk signals across {len(files)} files")
    if len(files) <= 3 or total_directories <= 1:
        penalty(14, "Very small repository footprint", f"{len(files)} files across {total_directories} directories")

    normalized = max(0, min(100, 50 + score))
    if normalized >= 76:
        level = "low"
        label = "Low toy-project risk"
        summary = "This reads like a production-shaped project: it has clear boundaries, runtime evidence, and engineering-quality signals an interviewer can inspect."
    elif normalized >= 50:
        level = "medium"
        label = "Medium toy-project risk"
        summary = "The project has useful engineering signals, but an interviewer may still look for stronger proof around integration, runtime, or tests."
    else:
        level = "high"
        label = "High toy-project risk"
        summary = "This may be perceived as a toy project because core production signals are missing or not visible from the repository."

    confidence = "high" if len(reasons) >= 5 else "medium" if len(reasons) >= 3 else "low"
    positive = [reason for reason in reasons if reason.sentiment == "positive"]
    negative = [reason for reason in reasons if reason.sentiment == "negative"]
    ordered_reasons = (positive[:3] + negative[:3])[:5]

    return ToyProjectRisk(
        level=level,
        label=label,
        summary=summary,
        confidence=confidence,
        score=normalized,
        reasons=ordered_reasons,
    )


def _collect_tech_evidence(repo_path: Path) -> dict[str, list[StackEvidence]]:
    evidence: dict[str, list[StackEvidence]] = {}
    package_names = _collect_package_names(repo_path)

    for definition in TECH_DEFINITIONS:
        for package in definition.packages:
            if package.lower() in package_names:
                _add_evidence(evidence, definition.name, "dependency manifest", f"declares package `{package}`")

    for path in repo_path.rglob("*"):
        relative_path = path.relative_to(repo_path)
        if is_ignored_path(relative_path) or not path.is_file():
            continue

        relative_posix = relative_path.as_posix()
        name = path.name
        lower_relative = relative_posix.lower()
        lower_name = name.lower()
        text = _read_text(path)

        for definition in TECH_DEFINITIONS:
            for file_marker in definition.files:
                normalized_marker = file_marker.lower()
                if lower_name == normalized_marker or lower_relative.startswith(normalized_marker.rstrip("/") + "/"):
                    _add_evidence(evidence, definition.name, relative_posix, f"matches `{file_marker}`")
                    break

            for marker in definition.text_markers:
                if marker.lower() in text:
                    _add_evidence(evidence, definition.name, relative_posix, f"contains `{marker}`")
                    break

    return evidence


def _collect_package_names(repo_path: Path) -> set[str]:
    packages: set[str] = set()
    for path in repo_path.rglob("*"):
        relative_path = path.relative_to(repo_path)
        if is_ignored_path(relative_path) or not path.is_file():
            continue

        name = path.name.lower()
        if name == "package.json":
            packages.update(_packages_from_package_json(path))
        elif name in {"requirements.txt", "requirements-dev.txt"}:
            packages.update(_packages_from_requirements(path))
        elif name == "pyproject.toml":
            packages.update(_packages_from_pyproject(path))
        elif name == "pom.xml":
            text = _read_text(path)
            packages.update(re.findall(r"<artifactId>([^<]+)</artifactId>", text))
        elif name == "build.gradle":
            packages.update(re.findall(r"['\"]([^'\"]+)['\"]", _read_text(path)))
    return {package.lower() for package in packages}


def _packages_from_package_json(path: Path) -> set[str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()

    packages: set[str] = set()
    for key in ("dependencies", "devDependencies", "peerDependencies"):
        values = data.get(key, {})
        if isinstance(values, dict):
            packages.update(values.keys())
    return packages


def _packages_from_requirements(path: Path) -> set[str]:
    packages: set[str] = set()
    for line in _read_text(path).splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        packages.add(re.split(r"[<>=~!;\\[]", stripped, maxsplit=1)[0].strip())
    return packages


def _packages_from_pyproject(path: Path) -> set[str]:
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError):
        return set()

    packages: set[str] = set()
    project = data.get("project", {})
    if isinstance(project, dict):
        deps = project.get("dependencies", [])
        if isinstance(deps, list):
            packages.update(_package_name(dep) for dep in deps if isinstance(dep, str))

        optional = project.get("optional-dependencies", {})
        if isinstance(optional, dict):
            for deps in optional.values():
                if isinstance(deps, list):
                    packages.update(_package_name(dep) for dep in deps if isinstance(dep, str))

    tool = data.get("tool", {})
    if isinstance(tool, dict):
        for tool_name in ("ruff", "mypy", "pytest"):
            if tool_name in tool:
                packages.add(tool_name)
    return {package for package in packages if package}


def _package_name(value: str) -> str:
    return re.split(r"[<>=~!;\\[]", value, maxsplit=1)[0].strip()


def _build_stack(evidence_by_tech: dict[str, list[StackEvidence]]) -> list[StackItem]:
    by_name = {definition.name: definition for definition in TECH_DEFINITIONS}
    stack: list[StackItem] = []
    for name, evidence in evidence_by_tech.items():
        definition = by_name[name]
        confidence = "high" if any(item.path in {"dependency manifest", "docker-compose.yml", "Dockerfile"} for item in evidence) else "medium"
        stack.append(
            StackItem(
                name=definition.name,
                category=definition.category,
                description=definition.description,
                confidence=confidence,
                evidence=evidence[:3],
            )
        )
    return sorted(stack, key=lambda item: (item.category, item.name))


def _build_architecture(stack: list[StackItem], files: list[FileMetric], repo_path: Path) -> ArchitectureFlow:
    names = {item.name for item in stack}
    has_frontend = any(item.category == "Frontend" for item in stack) or _has_top_level(repo_path, {"frontend", "web", "client"})
    has_backend = any(item.category == "Backend" for item in stack) or _has_top_level(repo_path, {"backend", "api", "server"})
    has_db = any(item.category == "Database" for item in stack)
    has_queue = any(item.name in {"Redis", "RQ", "Celery"} for item in stack)
    has_worker = has_queue and _contains_any_path(files, {"worker", "jobs", "queue", "tasks"})
    has_external = bool({"GitHub API", "OpenAI API"} & names)

    nodes: list[ArchitectureNode] = []
    edges: list[ArchitectureEdge] = []

    if has_frontend:
        nodes.append(_node("user", "User", "actor", "high", "frontend request source"))
        nodes.append(_node("frontend", "Frontend app", "frontend", "high", _first_path(files, {"frontend", "web", "client"})))
    if has_backend:
        nodes.append(_node("api", "API service", "backend", "high", _first_path(files, {"backend", "api", "server"})))
    if has_db:
        db_label = "PostgreSQL" if "PostgreSQL" in names else "SQLite" if "SQLite" in names else "Database"
        nodes.append(_node("database", db_label, "database", "medium", _first_stack_evidence(stack, {"PostgreSQL", "SQLite", "MongoDB"})))
    if has_queue:
        queue_label = "Redis queue" if "RQ" in names else "Redis"
        nodes.append(_node("queue", queue_label, "queue", "medium", _first_stack_evidence(stack, {"Redis", "RQ", "Celery"})))
    if has_worker:
        nodes.append(_node("worker", "Background worker", "worker", "medium", _first_path(files, {"worker", "jobs", "tasks"})))
    if has_external:
        external_name = "GitHub/OpenAI APIs" if {"GitHub API", "OpenAI API"}.issubset(names) else next(name for name in ("GitHub API", "OpenAI API") if name in names)
        nodes.append(_node("external", external_name, "external", "medium", _first_stack_evidence(stack, {"GitHub API", "OpenAI API"})))

    if has_frontend and has_backend:
        edges.append(_edge("user", "frontend", "uses", "high", "browser interaction"))
        edges.append(_edge("frontend", "api", "calls API", "medium", _frontend_api_evidence(files)))
    if has_backend and has_db:
        edges.append(_edge("api", "database", "persists data", "medium", _first_stack_evidence(stack, {"PostgreSQL", "SQLite", "MongoDB"})))
    if has_backend and has_queue:
        edges.append(_edge("api", "queue", "enqueues work", "medium", _first_stack_evidence(stack, {"Redis", "RQ", "Celery"})))
    if has_queue and has_worker:
        edges.append(_edge("queue", "worker", "runs async jobs", "medium", _first_path(files, {"worker", "jobs", "tasks"})))
    if has_worker and has_external:
        edges.append(_edge("worker", "external", "fetches/enriches data", "medium", _first_stack_evidence(stack, {"GitHub API", "OpenAI API"})))
    elif has_backend and has_external:
        edges.append(_edge("api", "external", "calls external API", "medium", _first_stack_evidence(stack, {"GitHub API", "OpenAI API"})))

    summary = _architecture_summary(has_frontend, has_backend, has_db, has_queue, has_worker, has_external)
    return ArchitectureFlow(summary=summary, nodes=nodes, edges=edges, mermaid=_to_mermaid(nodes, edges))


def _architecture_summary(
    has_frontend: bool,
    has_backend: bool,
    has_db: bool,
    has_queue: bool,
    has_worker: bool,
    has_external: bool,
) -> str:
    if has_frontend and has_backend and has_db and has_queue and has_worker:
        return "Full-stack system with a frontend, API service, persistent storage, and asynchronous background processing."
    if has_frontend and has_backend and has_db:
        return "Full-stack application with frontend-to-API integration and persistent storage."
    if has_frontend and has_backend:
        return "Full-stack application with a separate frontend and backend API."
    if has_backend and (has_db or has_external):
        return "Backend-centered service with data or external API integration."
    return "Single-service project; architecture inference is limited from static repository signals."


def _node(node_id: str, label: str, kind: str, confidence: str, evidence_path: str) -> ArchitectureNode:
    return ArchitectureNode(
        id=node_id,
        label=label,
        kind=kind,
        confidence=confidence,
        evidence=[StackEvidence(path=evidence_path, reason="inferred architecture role")],
    )


def _edge(source: str, target: str, label: str, confidence: str, evidence_path: str) -> ArchitectureEdge:
    return ArchitectureEdge(
        source=source,
        target=target,
        label=label,
        confidence=confidence,
        evidence=[StackEvidence(path=evidence_path, reason="inferred connection")],
    )


def _to_mermaid(nodes: list[ArchitectureNode], edges: list[ArchitectureEdge]) -> str:
    if not nodes:
        return "flowchart LR\n  Repo[\"Repository\"]"
    labels = {node.id: node.label for node in nodes}
    lines = ["flowchart LR"]
    for edge in edges:
        source = _mermaid_node(edge.source, labels.get(edge.source, edge.source))
        target = _mermaid_node(edge.target, labels.get(edge.target, edge.target))
        lines.append(f"  {source} -->|{edge.label}| {target}")
    if not edges:
        for node in nodes:
            lines.append(f"  {_mermaid_node(node.id, node.label)}")
    return "\n".join(lines)


def _mermaid_node(node_id: str, label: str) -> str:
    return f'{node_id}["{label}"]'


def _add_evidence(evidence: dict[str, list[StackEvidence]], tech_name: str, path: str, reason: str) -> None:
    item = StackEvidence(path=path, reason=reason)
    existing = evidence.setdefault(tech_name, [])
    if all(prev.path != item.path or prev.reason != item.reason for prev in existing):
        existing.append(item)


def _read_text(path: Path) -> str:
    try:
        if path.stat().st_size > MAX_FILE_BYTES_TO_READ:
            return ""
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def _has_top_level(repo_path: Path, names: set[str]) -> bool:
    return any((repo_path / name).is_dir() for name in names)


def _contains_any_path(files: list[FileMetric], markers: set[str]) -> bool:
    return any(any(marker in file.path.lower() for marker in markers) for file in files)


def _first_path(files: list[FileMetric], markers: set[str]) -> str:
    for file in files:
        if any(marker in file.path.lower() for marker in markers):
            return file.path
    return "repository structure"


def _first_stack_evidence(stack: list[StackItem], names: set[str]) -> str:
    for item in stack:
        if item.name in names and item.evidence:
            return item.evidence[0].path
    return "static dependency scan"


def _frontend_api_evidence(files: list[FileMetric]) -> str:
    for file in files:
        path = file.path.lower()
        if ("frontend" in path or "web" in path or "client" in path) and ("api" in path or "fetch" in path):
            return file.path
    return "frontend source"
