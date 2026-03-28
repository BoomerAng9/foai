---
name: "Voice-first chat rules"
description: "Use when working on voice, audio, microphone, speech, transcription, playback, or chat interaction flow tied to voice-first behavior."
applyTo: "frontend/**/*voice*.*,frontend/**/*audio*.*,frontend/**/*mic*.*,frontend/**/*speech*.*,frontend/**/chat/**/*.{ts,tsx},src/**/*voice*.*,src/**/*audio*.*"
---

# Voice-first rules

- Voice input is a default feature, not an optional afterthought.
- Assistant speech output is on by default.
- Provide a Speech Output Toggle so the user can disable read-aloud.
- Support live transcript updates.
- Support barge-in interruption.
- Handle microphone permission states explicitly.
- Expose input device selection and recovery from permission and device errors.
- Do not block the rest of the chat UI while audio is initializing.
