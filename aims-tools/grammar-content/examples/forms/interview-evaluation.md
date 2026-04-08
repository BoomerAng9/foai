# A.I.M.S. — Interview Evaluation Form

Source: Notion `HIDT-Interview Evaluation Form` doc, ingested 2026-04-08, HIDT → A.I.M.S. rename applied.
Use: Betty-Anne_Ang's HR PMO Office uses this when interviewing new agents or human contractors. Paired with the A.I.M.S. Org Fit Index for full evaluation.

---

**A.I.M.S. — Interviewee Evaluation Form**

Interviewee Name: ___________________________

Position Applied for: _________________________

Date of Interview: ____________________________

Interviewer Name: ___________________________

## Evaluation Criteria

Please rate the interviewee's performance in the following areas:

1. **Professionalism** — The extent to which the interviewee demonstrated a professional demeanor throughout the interview, including dress, language, and behavior.
   - Excellent | Good | Fair | Poor | N/A

2. **Communication Skills** — The extent to which the interviewee effectively communicated their ideas, experiences, and qualifications relevant to the position.
   - Excellent | Good | Fair | Poor | N/A

3. **Technical Knowledge** — The extent to which the interviewee demonstrated a thorough understanding of the technical skills and knowledge required for the position.
   - Excellent | Good | Fair | Poor | N/A

4. **Problem-Solving Skills** — The extent to which the interviewee demonstrated an ability to analyze and solve problems relevant to the position.
   - Excellent | Good | Fair | Poor | N/A

5. **Teamwork and Collaboration** — The extent to which the interviewee demonstrated an ability to work well with others and collaborate effectively.
   - Excellent | Good | Fair | Poor | N/A

6. **Leadership Skills** — The extent to which the interviewee demonstrated relevant leadership skills.
   - Excellent | Good | Fair | Poor | N/A

7. **Industry Knowledge** — The extent to which the interviewee demonstrated knowledge of the industry and its trends.
   - Excellent | Good | Fair | Poor | N/A

8. **Overall Impression** — The extent to which the interviewee impressed you as a potential candidate.
   - Excellent | Good | Fair | Poor | N/A

**Additional Comments:**

---

## How A.I.M.S. uses this

This becomes a **Paperform form** in the PMO Office (`pmo_forms` table, form_type='interview_eval'). Submitted via webhook to SmelterOS, validated with Zod, written to Neon, and surfaced to Betty-Anne_Ang for review.

For agent onboarding, this is paired with the A.I.M.S. Org Fit Index (`pmo_forms.form_type='org_fit_index'`) — the interview gives the qualitative read; the Org Fit Index gives the structured score.

## Mapping to A.I.M.S. KPI/OKR Metric

The 8 criteria above approximately map to the 6 A.I.M.S. KPI/OKR criteria used by Betty-Anne_Ang in `agent_evaluations`:

| Interview Criterion | A.I.M.S. KPI/OKR Metric |
|---|---|
| Professionalism | kpi_professionalism |
| Communication Skills | kpi_communication |
| Technical Knowledge | kpi_quality_of_work |
| Problem-Solving Skills | kpi_creativity |
| Teamwork and Collaboration | kpi_teamwork |
| Leadership Skills | (factored into Performance Level) |
| Industry Knowledge | (factored into Quality of Work) |
| Overall Impression | (factored into Keeper Test) |

The Excellent/Good/Fair/Poor scale converts to 5/4/3/2 on the 1-5 KPI scale.
