# East-Coast NY voice samples — speaker index

## Source episodes

| Source | YouTube ID | Length | Date |
|---|---|---|---|
| Nas — Power 105.1 Stillmatic / Ether response | CcSSd46zUnU | ~6:30 | Dec 2001 |
| Nas + DJ Premier — Joe Budden Podcast: Fatherhood, Hip-Hop's Future, Revisiting Classics | A_u28TzdPdQ | ~83 min | 2024 |

## Captured speakers (provisional — owner ear-validates final attribution)

### 1. Nas — Power 105.1 (ATTACK MODE)
- File: `_acheevy_clone_source_nas_30s.mp3` + `nas_power-105_stillmatic-ether_t0-30s_F0-122hz_ATTACK-MODE.mp3`
- Window: 0:00-0:30 of source clip
- Acoustic: F0 mean 122 Hz, median 93 Hz, rate 1.87 sps, HNR 4.7 dB, **57.7% match acheevy_baritone**
- Register: agitated / energetic — Nas mid-Ether-response
- **STATUS**: cloned to Inworld as `default-4zhua1rhxjfl50z1dnkcba__acheevy-nas-queensbridge-baritone-v1`. ACHEEVY voice in production with prosody dial-down (`temperature: 0.5, speakingRate: 0.85`) for coffee-environment calm.

### 2. Joe Budden (provisional) — Joe Budden Podcast minute 5:30
- File: `joe-budden_provisional_questioning-host_t300+30s_F0-94hz.mp3`
- Source: minute 5:30-6:00 of the Joe Budden + Nas + Premier episode
- Acoustic: F0 mean 94 Hz, slow rate 3.83 sps, **81.6% match acheevy_baritone**
- Transcript: "...you two brothers, where do you find the time to wrap this much, like y'all two brothers, the love that you all have for it, where do you find the time, how do you still love it..."
- Speaker reads as the host interviewing two guests → Joe Budden (deeper baritone than expected for him; could also be Premier briefly)

### 3. Nas or Premier (provisional) — Joe Budden Podcast minute 5:00
- File: `nas-or-premier_provisional_substantive-answer_t300+0s_F0-133hz.mp3`
- Source: minute 5:00-5:30 of the same episode
- Acoustic: F0 mean 133 Hz, rate 4.00 sps, 72.6% match acheevy_baritone
- Transcript: "I guess we're both in the world... social media... we're actually engaging... they were all parents now and having kids of my own... I got a 14 year old..."
- First-person answer from one of the two guests; reflective/parental register
- Owner ear-validates: Nas or Premier?

### 4. Nas (provisional) — Joe Budden Podcast minute 40
- File: `nas_provisional_inspiration-storytelling_t2400+0s_F0-154hz.mp3`
- Source: minute 40:00-40:30 of the same episode
- Acoustic: F0 mean 154 Hz, rate 5.10 sps, 31.7% match acheevy_baritone
- Transcript: "...people inspired by me to start this multi-million dollar fund... not your music your moves..."
- Reads as Nas talking about his Mass Appeal / venture-capital influence (his known lane); higher pitch suggests animated storytelling mode

## File copies

All four samples copied to `iCloudDrive/.../Inworld Voice Models/cast-source-audio/`
for owner audit + future cloning.

## Future use

Once owner validates speaker attribution:
- **Nas (calm, measured)** — re-clone the Joe Budden minute-5:00 window (if confirmed Nas) or hunt deeper into the episode for a calmer Nas window than the Power 105.1 source. Replace ACHEEVY's voiceId.
- **DJ Premier** — clone for a future Premier-character voice (no cast slot yet, but Premier's hip-hop-producer register is distinct enough to warrant capture).
- **Joe Budden** — clone for a future podcast-host-archetype character voice.

All three are auditable on disk + iCloud with provenance + acoustic features documented.
