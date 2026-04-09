/**
 * Teacher Twin — autonomous runtime
 * ====================================
 * Second flagship aiPLUG & Play demo. Clones the SMB Marketing
 * pattern: single full cycle per launch, free-LLM cascade, real
 * outputs + event stream. No mocks.
 *
 * Phase 1 feedback #4–#6 target capabilities:
 *   - English labels alongside every non-English string (owner
 *     can localize for ESL households)
 *   - Parent Portal invitation + approval + live look-in flow
 *   - Always-on runtime, real model calls, no canned replies
 *
 * I-3 scope (this file): one meaningful cycle a teacher can
 * actually ship — builds a 2-week learning plan, generates 3
 * sample assessments with answer keys, drafts a parent briefing.
 *
 * Full Parent Portal invitation / approval / email flow lives in
 * its own workstream (Teacher Twin I-3b). This runtime produces
 * the artifacts a teacher would send in the invitation email.
 */

import { chatWithCascade } from '@/lib/aiplug/llm';
import type { RuntimeContext, RuntimeResult } from './registry';

interface TeacherTwinInputs {
  student_name?: string;
  grade_level?: string;
  subjects?: string | string[];
  focus_area?: string;
  parent_locale?: string;
}

function parseInputs(raw: Record<string, unknown>): TeacherTwinInputs {
  const rawSubjects = raw.subjects;
  let subjects: string | string[] | undefined;
  if (typeof rawSubjects === 'string') {
    subjects = rawSubjects;
  } else if (Array.isArray(rawSubjects)) {
    subjects = rawSubjects.filter((s): s is string => typeof s === 'string');
  }
  return {
    student_name: typeof raw.student_name === 'string' ? raw.student_name : undefined,
    grade_level: typeof raw.grade_level === 'string' ? raw.grade_level : undefined,
    subjects,
    focus_area: typeof raw.focus_area === 'string' ? raw.focus_area : undefined,
    parent_locale: typeof raw.parent_locale === 'string' ? raw.parent_locale : undefined,
  };
}

function describeSubjects(subjects: TeacherTwinInputs['subjects']): string {
  if (!subjects) return 'core subjects';
  if (typeof subjects === 'string') return subjects;
  if (subjects.length === 0) return 'core subjects';
  if (subjects.length === 1) return subjects[0];
  return `${subjects.slice(0, -1).join(', ')}, and ${subjects[subjects.length - 1]}`;
}

const SYSTEM_PROMPT = `You are the Teacher Twin — an autonomous agentic teaching assistant for classroom and tutoring contexts. You write in a warm but direct educator voice. You do not reference that you are an AI. You do not reference underlying models, tools, or infrastructure.

Your outputs are concrete, classroom-ready, and immediately usable by a teacher or a parent. Language is age-appropriate to the grade level supplied. When a non-English parent locale is provided, you include the English label alongside every translated phrase so ESL households can learn the English vocabulary at the same time.

You work in stages. At each stage you return structured JSON when asked, or concrete text when asked. You do not editorialize about the task — you do the work.`;

export async function runTeacherTwin(ctx: RuntimeContext): Promise<RuntimeResult> {
  const inputs = parseInputs(ctx.run.inputs);
  const student = inputs.student_name || 'the student';
  const grade = inputs.grade_level || 'mixed grade';
  const subjects = describeSubjects(inputs.subjects);
  const focus = inputs.focus_area || 'balanced growth across all subjects';
  const parentLocale = inputs.parent_locale || 'en';

  let totalTokens = 0;
  const outputs: Record<string, unknown> = {};

  try {
    /* ── STAGE 1 — INTAKE ─────────────────────────────────── */
    await ctx.emit('stage', 'intake', `Starting Teacher Twin cycle for ${student}`, {
      inputs,
    });
    await ctx.emit('heartbeat', 'intake', 'Agent online');

    /* ── STAGE 2 — CURRICULUM MAP ──────────────────────────── */
    await ctx.emit('stage', 'curriculum_map', 'Building 2-week learning plan');
    const curriculumPrompt = `Build a concrete 2-week learning plan for ${student} (${grade}) covering ${subjects}. Focus area: ${focus}.

Return the plan as JSON with this shape:
{
  "overview": "one sentence summary of the plan",
  "learning_objectives": ["objective 1", "objective 2", "objective 3"],
  "weeks": [
    {
      "week": 1,
      "theme": "theme for the week",
      "days": [
        { "day": "Monday", "focus": "...", "activity": "...", "homework": "..." }
      ]
    }
  ],
  "materials_needed": ["material 1", "material 2"]
}

Include all 5 school days per week. Be grade-appropriate — no college-level vocab for elementary students. Return ONLY the JSON object, no preamble.`;

    const curriculum = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: curriculumPrompt }],
      maxTokens: 1600,
      temperature: 0.3,
    });
    totalTokens += curriculum.promptTokens + curriculum.completionTokens;
    outputs.curriculum_raw = curriculum.text;
    outputs.curriculum_model = curriculum.modelUsed;
    await ctx.emit('output', 'curriculum_map', '2-week plan ready', {
      model: curriculum.modelUsed,
      tierIndex: curriculum.tierIndex,
      preview: curriculum.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'curriculum_map', 'stage complete');

    /* ── STAGE 3 — ASSESSMENT SAMPLER ─────────────────────── */
    await ctx.emit('stage', 'assessments', 'Generating 3 sample assessments');
    const assessmentPrompt = `Based on the 2-week plan below, generate 3 ready-to-ship assessments for ${student} (${grade}). Focus: ${focus}.

Plan context:
${curriculum.text.slice(0, 1500)}

Generate:
1. A 10-question quiz (mix of multiple choice + short answer) with ANSWER KEY
2. A 1-page worksheet with 5 skill-building exercises and ANSWER KEY
3. A small project rubric (3 criteria, 4 proficiency levels each) with scoring guidance

Separate each assessment with a line of ten equals signs. Label each clearly. Include the answer key or rubric immediately after each assessment so the teacher can grade without re-reading. Ready to print and hand out.`;

    const assessments = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: assessmentPrompt }],
      maxTokens: 2000,
      temperature: 0.4,
    });
    totalTokens += assessments.promptTokens + assessments.completionTokens;
    outputs.assessments = assessments.text;
    outputs.assessments_model = assessments.modelUsed;
    await ctx.emit('output', 'assessments', '3 assessments + answer keys ready', {
      model: assessments.modelUsed,
      tierIndex: assessments.tierIndex,
      preview: assessments.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'assessments', 'stage complete');

    /* ── STAGE 4 — PARENT BRIEF ──────────────────────────── */
    await ctx.emit('stage', 'parent_brief', 'Drafting parent briefing');
    const localeInstruction =
      parentLocale && parentLocale !== 'en'
        ? ` The parent's primary language is ${parentLocale}. Write the briefing in ${parentLocale} with the English phrase in parentheses after every key term so ESL households can learn the English vocabulary.`
        : '';
    const parentBriefPrompt = `Write a warm, direct parent briefing for ${student}'s upcoming 2 weeks. The parent's role is to review, approve, and provide daily encouragement — not to teach.${localeInstruction}

The briefing should cover:
1. What their student will learn (2-3 sentences in plain language)
2. What the parent should watch for at home (specific signs of progress or struggle)
3. How to help without doing the work (3 concrete coaching phrases)
4. When and how the teacher will share updates
5. A simple weekly check-in question the parent can ask

Keep it to about 250 words. No education jargon. No condescension. Ready to send via the Parent Portal invitation email.`;

    const parentBrief = await chatWithCascade({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: parentBriefPrompt }],
      maxTokens: 800,
      temperature: 0.5,
    });
    totalTokens += parentBrief.promptTokens + parentBrief.completionTokens;
    outputs.parent_brief = parentBrief.text;
    outputs.parent_brief_model = parentBrief.modelUsed;
    outputs.parent_locale = parentLocale;
    await ctx.emit('output', 'parent_brief', 'Parent briefing ready', {
      model: parentBrief.modelUsed,
      tierIndex: parentBrief.tierIndex,
      locale: parentLocale,
      preview: parentBrief.text.slice(0, 200),
    });
    await ctx.persistOutputs(outputs);
    await ctx.emit('heartbeat', 'parent_brief', 'stage complete');

    /* ── Wrap-up ───────────────────────────────────────────── */
    await ctx.emit('stage', 'complete', 'Teacher Twin cycle complete', {
      total_tokens: totalTokens,
      stages: 4,
      student,
      grade,
    });

    return {
      outputs,
      status: 'succeeded',
      costTokens: totalTokens,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.emit('error', 'runtime', `Runtime failed: ${msg.slice(0, 200)}`);
    return {
      outputs,
      status: 'failed',
      errorMessage: msg,
      costTokens: totalTokens,
    };
  }
}
