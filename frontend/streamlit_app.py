import requests
import streamlit as st

API_URL = "http://127.0.0.1:8000/api/analyze"
HISTORY_URL = "http://127.0.0.1:8000/api/history"

st.set_page_config(page_title="Code Review Agent", layout="wide")


def inject_styles() -> None:
    st.markdown(
        """
        <style>
        .block-container {
            padding-top: 2rem;
            padding-bottom: 3rem;
            max-width: 1180px;
        }
        div[data-testid="stMetric"] {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 14px 16px;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        div[data-testid="stMetricLabel"] {
            color: #64748b;
        }
        .hero {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 28px;
            background: #ffffff;
            margin-bottom: 18px;
        }
        .hero h1 {
            font-size: 2.15rem;
            margin-bottom: 0.35rem;
            letter-spacing: 0;
        }
        .hero p {
            color: #475569;
            font-size: 1.03rem;
            margin: 0;
        }
        .section-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 18px 20px;
            background: #ffffff;
            margin: 12px 0;
        }
        .section-card h3 {
            margin-top: 0;
            margin-bottom: 0.5rem;
            font-size: 1.05rem;
        }
        .status-pill {
            display: inline-block;
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 0.85rem;
            font-weight: 600;
            border: 1px solid #d1d5db;
        }
        .status-ready {
            background: #ecfdf5;
            color: #047857;
            border-color: #a7f3d0;
        }
        .status-mid {
            background: #fffbeb;
            color: #b45309;
            border-color: #fde68a;
        }
        .status-low {
            background: #fef2f2;
            color: #b91c1c;
            border-color: #fecaca;
        }
        .muted {
            color: #64748b;
            font-size: 0.92rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def status_class(status: str) -> str:
    if status == "Resume-ready":
        return "status-ready"
    if status in {"Almost ready", "Needs polish"}:
        return "status-mid"
    return "status-low"


def render_hero() -> None:
    st.markdown(
        """
        <div class="hero">
            <h1>Code Review Agent</h1>
            <p>Resume-readiness reviewer for CS student GitHub projects.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_recent_history() -> None:
    st.markdown("### Recent Analyses")
    try:
        history_response = requests.get(HISTORY_URL, timeout=10)
        history_response.raise_for_status()
        history = history_response.json()["records"]
    except requests.RequestException:
        st.info("Start the backend server to view saved analysis history.")
        return

    if history:
        st.dataframe(history, use_container_width=True, hide_index=True)
    else:
        st.caption("No analyses saved yet.")


def normalize_repo_url(repo_url: str) -> str:
    cleaned = repo_url.strip()
    if cleaned and not cleaned.startswith(("http://", "https://")):
        return f"https://{cleaned}"
    return cleaned


def error_message_from_response(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or "Unexpected API error."

    detail = payload.get("detail")
    if isinstance(detail, list) and detail:
        first_error = detail[0]
        message = first_error.get("msg", "Request validation failed.")
        field = " -> ".join(str(part) for part in first_error.get("loc", []))
        return f"{message} ({field})"
    if isinstance(detail, str):
        return detail
    return "Unexpected API error."


def render_results(payload: dict) -> None:
    analysis = payload["analysis"]
    report = payload["report"]
    readiness = payload["readiness"]
    mentor_feedback = payload["mentor_feedback"]

    status = readiness["status"]
    st.markdown("## Review Report")
    st.markdown(
        f"""
        <span class="status-pill {status_class(status)}">{status}</span>
        <span class="muted"> Score is based on documentation, tests, setup, structure, dependencies, and risk signals.</span>
        """,
        unsafe_allow_html=True,
    )

    score_cols = st.columns(4)
    score_cols[0].metric("Readiness Score", f"{readiness['score']} / 100")
    score_cols[1].metric("Files", analysis["total_files"])
    score_cols[2].metric("Risk Signals", len(analysis["risks"]))
    score_cols[3].metric("Languages", len(analysis["languages"]))

    st.progress(readiness["score"] / 100)

    st.markdown('<div class="section-card">', unsafe_allow_html=True)
    st.markdown("### Mentor Feedback")
    st.write(mentor_feedback["mentor_summary"])
    st.markdown("</div>", unsafe_allow_html=True)

    mentor_cols = st.columns(3)
    with mentor_cols[0]:
        st.markdown("### Resume Bullets")
        for bullet in mentor_feedback["resume_bullets"]:
            st.write(f"- {bullet}")

    with mentor_cols[1]:
        st.markdown("### Interview Prep")
        for question in mentor_feedback["interview_questions"]:
            st.write(f"- {question}")

    with mentor_cols[2]:
        st.markdown("### Next Steps")
        for step in mentor_feedback["next_steps"]:
            st.write(f"- {step}")

    st.divider()
    st.markdown("## Readiness Breakdown")
    fixes_col, checklist_col = st.columns([0.9, 1.4])

    with fixes_col:
        st.markdown("### Top Fixes")
        for fix in readiness["priority_fixes"]:
            st.write(f"- {fix}")

        st.markdown("### Summary")
        st.write(report["summary"])

    with checklist_col:
        checklist_rows = [
            {
                "item": item["name"],
                "status": "Passed" if item["passed"] else "Needs work",
                "points": item["points"],
                "recommendation": item["recommendation"],
            }
            for item in readiness["checklist"]
        ]
        st.dataframe(checklist_rows, use_container_width=True, hide_index=True)

    st.divider()
    st.markdown("## Technical Scan")
    scan_left, scan_right = st.columns(2)

    with scan_left:
        st.markdown("### Language Distribution")
        if analysis["languages"]:
            st.bar_chart(analysis["languages"])
        else:
            st.info("No source files detected.")

        st.markdown("### Largest Files")
        if analysis["largest_files"]:
            st.dataframe(analysis["largest_files"], use_container_width=True, hide_index=True)
        else:
            st.info("No files found.")

    with scan_right:
        st.markdown("### Risk Signals")
        if analysis["risks"]:
            st.dataframe(analysis["risks"], use_container_width=True, hide_index=True)
        else:
            st.success("No risk signals found in the first-pass scan.")

        st.markdown("### Recommendations")
        for recommendation in report["recommendations"]:
            st.write(f"- {recommendation}")


inject_styles()
render_hero()

input_col, button_col = st.columns([5, 1.2])
with input_col:
    repo_url = st.text_input(
        "GitHub repository URL",
        placeholder="https://github.com/lyunify/code-review-agent",
        label_visibility="collapsed",
    )
with button_col:
    analyze_clicked = st.button("Analyze", type="primary", disabled=not repo_url, use_container_width=True)

if analyze_clicked:
    normalized_repo_url = normalize_repo_url(repo_url)
    with st.spinner("Cloning repository, scanning project signals, and generating mentor feedback..."):
        try:
            response = requests.post(API_URL, json={"repo_url": normalized_repo_url}, timeout=90)
            if response.status_code >= 400:
                st.error(f"Analysis failed: {error_message_from_response(response)}")
                st.stop()
            render_results(response.json())
        except requests.RequestException as exc:
            st.error(f"Analysis failed: {exc}")

st.divider()
render_recent_history()
