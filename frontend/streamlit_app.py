import requests
import streamlit as st

API_URL = "http://127.0.0.1:8000/api/analyze"
HISTORY_URL = "http://127.0.0.1:8000/api/history"

st.set_page_config(page_title="Code Review Agent", layout="wide")

st.title("Code Review Agent")
st.caption("Analyze a public GitHub repository and generate a first-pass engineering review.")

repo_url = st.text_input(
    "GitHub repository URL",
    placeholder="https://github.com/tiangolo/fastapi",
)

analyze_clicked = st.button("Analyze repository", type="primary", disabled=not repo_url)

if analyze_clicked:
    with st.spinner("Cloning and analyzing repository..."):
        try:
            response = requests.post(API_URL, json={"repo_url": repo_url}, timeout=60)
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            st.error(f"Analysis failed: {exc}")
        else:
            analysis = payload["analysis"]
            report = payload["report"]

            st.subheader("Summary")
            st.write(report["summary"])

            metric_cols = st.columns(4)
            metric_cols[0].metric("Files", analysis["total_files"])
            metric_cols[1].metric("Directories", analysis["total_directories"])
            metric_cols[2].metric("Languages", len(analysis["languages"]))
            metric_cols[3].metric("Risk signals", len(analysis["risks"]))

            left, right = st.columns(2)

            with left:
                st.subheader("Language Distribution")
                if analysis["languages"]:
                    st.bar_chart(analysis["languages"])
                else:
                    st.info("No source files detected.")

                st.subheader("Recommendations")
                for recommendation in report["recommendations"]:
                    st.write(f"- {recommendation}")

            with right:
                st.subheader("Largest Files")
                if analysis["largest_files"]:
                    st.dataframe(
                        analysis["largest_files"],
                        use_container_width=True,
                        hide_index=True,
                    )
                else:
                    st.info("No files found.")

                st.subheader("Risk Signals")
                if analysis["risks"]:
                    st.dataframe(
                        analysis["risks"],
                        use_container_width=True,
                        hide_index=True,
                    )
                else:
                    st.success("No risk signals found in the first-pass scan.")

st.divider()
st.subheader("Recent Analyses")

try:
    history_response = requests.get(HISTORY_URL, timeout=10)
    history_response.raise_for_status()
    history = history_response.json()["records"]
except requests.RequestException:
    st.info("Start the backend server to view saved analysis history.")
else:
    if history:
        st.dataframe(history, use_container_width=True, hide_index=True)
    else:
        st.caption("No analyses saved yet.")
