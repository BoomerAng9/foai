import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { sql } from '@/lib/insforge';

/**
 * POST /api/perform/seed-board — Seed the complete 2026 NFL Draft Big Board
 * Real prospect data from Per|Form research.
 */

const BOARD_2026 = [
  { name: 'Jeremiyah Love', school: 'Notre Dame', position: 'RB', overall_rank: 1, grade: 93, height: '6-0', weight: '212', key_stats: '~7.0 YPC, 10.4 YPC as receiver, 0 fumbles in 3 seasons, 4.36 40', nfl_comparison: 'Jahmyr Gibbs', projected_round: 1, strengths: 'Speed 10/10; Ball security 10/10; Vision 9.5; Receiving 9.5; Contact balance 9.5', weaknesses: 'Durability 8.5; shared backfield usage', scouting_summary: 'Consensus #1 overall. Rare combination of speed, hands, and ball security. Three-down back from Day 1. Zero fumbles in 3 years is a superpower.', film_grade: 'A+' },
  { name: 'Fernando Mendoza', school: 'Indiana', position: 'QB', overall_rank: 2, grade: 91, height: '6-5', weight: '236', key_stats: '73% completion (3rd FBS), 27 TD / 0 INT red zone, Heisman Winner', nfl_comparison: 'Matt Ryan', projected_round: 1, strengths: 'Size/frame 9.5; Accuracy 9.5; Decision-making 9.5; Leadership 9.5; Clutch 9.5', weaknesses: 'Pocket presence 8.5; RPO-heavy system', scouting_summary: 'Cleanest QB prospect in the class. Elite size, accuracy, and decision-making. Proven winner with no red flags. Plug-and-play franchise QB.', film_grade: 'A+' },
  { name: 'Sonny Styles', school: 'Ohio State', position: 'LB', overall_rank: 3, grade: 90, height: '6-5', weight: '244', key_stats: '2 missed tackles (down from 17), 43.5" vertical, 6 sacks in 2024', nfl_comparison: 'Fred Warner', projected_round: 1, strengths: 'Size/length 9.5; Athleticism 9.5; Coverage 9.5; Work ethic 9.5; Football IQ 9.0', weaknesses: 'Pass rush 8.5', scouting_summary: 'Cleanest LB prospect in years. Former safety with LB size and elite athleticism. Day 1 starter and defensive leader.', film_grade: 'A+' },
  { name: 'Caleb Downs', school: 'Ohio State', position: 'S', overall_rank: 4, grade: 89, height: '6-0', weight: '206', key_stats: '2+ INT in 3 straight seasons, Thorpe + Lott IMPACT winner', nfl_comparison: 'Jessie Bates III', projected_round: 1, strengths: 'Coverage 9.0; Versatility 9.0; Football IQ 9.5; Leadership 9.5; Character 9.5', weaknesses: 'Athleticism 7.5', scouting_summary: 'Instinctive, versatile safety who elevates everyone. Makes up for average measurables with elite IQ. Plug-and-play starter.', film_grade: 'A' },
  { name: 'Rueben Bain Jr.', school: 'Miami', position: 'EDGE', overall_rank: 5, grade: 89, height: '6-2', weight: '263', key_stats: '9.5 sacks, ACC Defensive POY, 9 run stops, sub-31" arms', nfl_comparison: 'Trent Cole', projected_round: 1, strengths: 'Production 9.0; Pass rush plan 9.5; Motor 9.5; Toughness 9.5; Work ethic 9.5', weaknesses: 'Length 7.0; Run defense 8.5', scouting_summary: 'Dominant despite lacking ideal measurables. Elite technician with a non-stop motor. Teams may break the arm-length trend for his production.', film_grade: 'A' },
  { name: 'Olaivavega Ioane', school: 'Penn State', position: 'OG', overall_rank: 6, grade: 89, height: '6-4', weight: '320', key_stats: '0 sacks allowed in 2 seasons, 27 starts, 5 positions played', nfl_comparison: 'Quenton Nelson (lite)', projected_round: 1, strengths: 'Pass protection 9.5; Power 9.0; Awareness 9.0; Reliability 9.5; Football IQ 9.0', weaknesses: 'Athleticism 7.5', scouting_summary: 'Plug-and-play starter from Day 1. Highest-floor offensive lineman in the class. Instant upgrade to any OL room. Pro Bowl potential.', film_grade: 'A' },
  { name: 'David Bailey', school: 'Texas Tech', position: 'EDGE', overall_rank: 7, grade: 88, height: '6-4', weight: '251', key_stats: '14.5 sacks (tied FBS lead), 71 pressures, 3 forced fumbles', nfl_comparison: 'Brian Burns', projected_round: 1, strengths: 'Get-off 9.5; Bend 9.5; Production 9.5; Hand usage 9.0; Motor 8.5', weaknesses: 'Run defense 8.0; Power element developing', scouting_summary: 'Elite pass-rush production with rare burst and bend. First-round lock. Needs to develop power element and run defense.', film_grade: 'A' },
  { name: 'Makai Lemon', school: 'USC', position: 'WR', overall_rank: 8, grade: 86, height: '5-11', weight: '192', key_stats: '79 receptions, 1,156 yards, 11 TD, 1 drop, 20 contested catches (2 seasons)', nfl_comparison: 'Amon-Ra St. Brown', projected_round: 1, strengths: 'Hands 9.5; Route running 9.0; Contested catches 8.5; Competitiveness 9.5; Consistency 9.0', weaknesses: 'Size 7.0; Speed 7.5', scouting_summary: 'Elite slot receiver with vice-grip hands. Creates separation with technique, not speed. Contested catch ability despite size. Immediate NFL starter.', film_grade: 'A' },
  { name: 'Carnell Tate', school: 'Ohio State', position: 'WR', overall_rank: 9, grade: 86, height: '6-2', weight: '192', key_stats: '79.5 YPG, 9 TD, 17.2 YPR, 1 drop, 10 contested catches, 10.25" hands', nfl_comparison: 'Tee Higgins', projected_round: 1, strengths: 'Hands 9.5; Contested catches 9.0; Consistency 9.0; Route running 8.5; Size 8.5', weaknesses: 'YAC 7.5; Speed 8.0 (4.53 40)', scouting_summary: 'Reliable possession receiver with elite hands. Not a burner but creates separation with size and technique. Immediate red-zone threat.', film_grade: 'A' },
  { name: 'Mansoor Delane', school: 'LSU', position: 'CB', overall_rank: 10, grade: 85, height: '6-0', weight: '187', key_stats: '27.7% completion rate when targeted (3rd lowest FBS)', nfl_comparison: 'Derek Stingley Jr.', projected_round: 1, strengths: 'Coverage 9.0; Fluidity 9.0; Consistency 9.5; Press/zone 8.5; Toughness 8.5', weaknesses: 'Ball skills 8.0; Speed 7.5', scouting_summary: 'Technician who locks down his side. Doesn\'t gamble for stats. Matches all receiver types. Speed concerns need verification at pro day.', film_grade: 'A' },
  { name: 'Dillon Thieneman', school: 'Oregon', position: 'S', overall_rank: 11, grade: 85, height: '6-0', weight: '201', key_stats: '4.35 40, 6 INT (2023), reduced missed tackles from 22 to 8', nfl_comparison: 'Justin Simmons', projected_round: 1, strengths: 'Ball skills 9.5; Speed 9.5; Versatility 8.5; Improvement 9.0; Football IQ 9.0', weaknesses: 'Tackling 8.0; Size 7.5', scouting_summary: 'Ball-hawking safety with elite speed. Tackling concerns addressed in 2025. Versatile coverage weapon. Highly coveted skill set.', film_grade: 'A' },
  { name: 'Monroe Freeling', school: 'Georgia', position: 'OT', overall_rank: 12, grade: 83, height: '6-7', weight: '315', key_stats: '18 career starts, 34.75" arms, 4.93 40, 33.5" vertical', nfl_comparison: 'Tristan Wirfs (early career)', projected_round: 1, strengths: 'Size/length 9.5; Athleticism 9.0; Upside 9.5; Improvement trajectory 9.0', weaknesses: 'Technique 7.0; Experience 7.0', scouting_summary: 'Highest-upside tackle in the class. Elite athletic profile but raw. Needs development time. Franchise LT potential if he puts it together.', film_grade: 'A-' },
  { name: 'Akheem Mesidor', school: 'Auburn', position: 'EDGE', overall_rank: 13, grade: 83, height: '6-3', weight: '259', key_stats: '12.5 sacks, 5.5 sacks in 4 CFP games, 23.9% pressure rate as DT', nfl_comparison: 'Cameron Heyward', projected_round: 1, strengths: 'Production 9.0; Inside rush 9.5; First step 8.5; Versatility 8.5; Reliability 8.5', weaknesses: 'Age 7.0; Length 7.5', scouting_summary: 'Production machine who destroys interior OL when reduced inside. Age pushes him down boards but he\'s NFL-ready. Better version of Nic Scourton.', film_grade: 'A-' },
  { name: 'Spencer Fano', school: 'Utah', position: 'OT/OG', overall_rank: 14, grade: 84, height: '6-6', weight: '311', key_stats: '13 pressures, 1 sack allowed (2 seasons), 32.125" arms, center reps at combine', nfl_comparison: 'Joel Bitonio', projected_round: 1, strengths: 'Versatility 9.5; Foot quickness 9.0; Pass protection 8.5; Football IQ 9.0; Toughness 9.0', weaknesses: 'Length 7.0; Power 8.0', scouting_summary: 'Versatile lineman who can play anywhere. Likely best inside due to length. Zone scheme fit with excellent lateral movement. High-floor prospect.', film_grade: 'A-' },
  { name: 'Arvell Reese', school: 'Ohio State', position: 'EDGE/LB', overall_rank: 15, grade: 87, height: '6-4', weight: '241', key_stats: '6.5 sacks in first 8 games, 97 pass-rush snaps (up from 17 in 2024)', nfl_comparison: 'Jalon Walker', projected_round: 1, strengths: 'Athleticism 9.5; Versatility 9.0; Bend 9.0; Upside 9.5; Work ethic 9.0', weaknesses: 'Power 8.0; Production 8.5; Learning curve 7.5', scouting_summary: 'Athletic freak with massive upside. Chess piece who can play multiple positions. Boom-or-bust prospect with top-10 potential if he develops technique.', film_grade: 'A' },
  { name: 'Omar Cooper Jr.', school: 'Indiana', position: 'WR', overall_rank: 16, grade: 82, height: '6-0', weight: '199', key_stats: '13 receiving TD, 7.28 YAC average', nfl_comparison: 'Chris Olave', projected_round: 2, strengths: 'YAC 9.0; Route running 8.5; Clutch 9.0; Competitiveness 9.0; Character 8.5', weaknesses: 'Size 7.5; Speed 7.5', scouting_summary: 'Complete receiver who does everything well. Elite YAC ability for his size. Fits exact model of WRs finding immediate NFL success.', film_grade: 'B+' },
  { name: 'Emmanuel McNeil-Warren', school: 'Toledo', position: 'S', overall_rank: 17, grade: 82, key_stats: 'MAC dominance — big hits, ball plays, high energy', nfl_comparison: 'Tariq Carpenter', projected_round: 2, strengths: 'Range 9.0; Athleticism 8.5; Energy 9.0; Upside 9.0; Work ethic 8.5', weaknesses: 'Competition level 6.5; Level jump 7.5', scouting_summary: 'Most exciting small-school prospect in years. Every tape shows production and energy. Level of competition is only concern. Late bloomer with starter upside.', film_grade: 'B+' },
  { name: 'Keldric Faulk', school: 'Auburn', position: 'EDGE', overall_rank: 18, grade: 81, height: '6-6', weight: '276', key_stats: '2.0 sacks (2025), 7.0 sacks (2024), 82" wingspan', nfl_comparison: 'Travon Walker', projected_round: 2, strengths: 'Size/length 9.5; Run defense 8.5; Youth 9.0; Upside 9.5; Age 9.5', weaknesses: 'Production 5.5; Get-off 6.5; Rush plan 6.5', scouting_summary: 'Traits-based prospect with elite size and length. Production doesn\'t match tools. Youngest edge in class with massive upside if developed properly.', film_grade: 'B+' },
  { name: 'Jordyn Tyson', school: 'Arizona State', position: 'WR', overall_rank: 19, grade: 81, height: '6-2', weight: '203', key_stats: 'Final 6 games 2024: 50 rec, 732 yds, 6 TD. Hamstring injury 2025', nfl_comparison: 'Keenan Allen', projected_round: 2, strengths: 'Playmaking 9.5; Route running 9.0; Ball tracking 9.0; YAC 9.0', weaknesses: 'Durability 6.0; Risk factor 6.5', scouting_summary: 'Top-5 talent when healthy. Elite route runner with after-catch ability. Major durability concerns drop him slightly. High-risk, high-reward.', film_grade: 'B+' },
  { name: 'CJ Allen', school: 'Georgia', position: 'LB', overall_rank: 20, grade: 81, key_stats: 'Georgia\'s defensive QB. Highly productive, instinctive.', nfl_comparison: 'Nakobe Dean', projected_round: 2, strengths: 'Instincts 9.0; Production 8.5; Football IQ 9.0; Leadership 9.0; Work ethic 8.5', weaknesses: 'Athleticism 7.0; Size 7.5', scouting_summary: 'Productive, instinctive linebacker from Georgia pipeline. Won\'t wow with measurables but makes every play. NFL-ready mentally.', film_grade: 'B+' },
  { name: 'Francis Mauigoa', school: 'Miami', position: 'OT', overall_rank: 21, grade: 83, height: '6-6', weight: '329', key_stats: '2 sacks allowed in 2 seasons, 1.2% pressure rate (lowest FBS tackles 2025)', nfl_comparison: 'Dion Dawkins', projected_round: 1, strengths: 'Size 9.0; Pass protection 9.5; Run blocking 9.0; Durability 9.0; Consistency 8.5', weaknesses: 'Athleticism 7.5; Length 8.0; Leadership 7.0', scouting_summary: 'Massive RT with elite pass-protection numbers. May fit better at guard long-term due to limited athleticism. Safe pick with high floor.', film_grade: 'A-' },
  { name: 'Kadyn Proctor', school: 'Alabama', position: 'OT', overall_rank: 22, grade: 80, height: '6-7', weight: '352', key_stats: '40 consecutive career starts, 32" vertical, 5.22 40', nfl_comparison: 'Orlando Brown Jr.', projected_round: 2, strengths: 'Size 9.0; Run blocking 9.5; Power 8.5; Durability 9.5; Experience 8.5', weaknesses: 'Athleticism 6.5; Pass protection 7.0; Leverage 7.0', scouting_summary: 'Massive RT with elite run-blocking ability. Developmental upside due to youth. Concerns about handling NFL speed rushers.', film_grade: 'B+' },
  { name: 'Jermod McCoy', school: 'Tennessee', position: 'CB', overall_rank: 23, grade: 80, height: '6-1', weight: '188', key_stats: 'Missed entire 2025 with ACL tear. 2024: 4 INT, 7 PBU, 77" wingspan', nfl_comparison: 'Jalen Ramsey (pre-injury)', projected_round: 2, strengths: 'Man coverage 9.0; Ball skills 8.5; Length 8.5; Press coverage 8.5', weaknesses: 'Medical 5.0; Run support 6.5', scouting_summary: 'Elite man-coverage corner when healthy. Major medical red flag drops his stock. Day 1 starter if medicals check out.', film_grade: 'B+' },
  { name: 'Kenyon Sadiq', school: 'Oregon', position: 'TE', overall_rank: 24, grade: 80, height: '6-3', weight: '241', key_stats: '8 receiving TD (led FBS TEs), 4.39 40, 6 drops', nfl_comparison: 'Dallas Goedert', projected_round: 2, strengths: 'Speed 10.0; Separation 9.0; YAC 8.5; Upside 9.0; Competitiveness 8.5', weaknesses: 'Size 6.5; Hands 6.5; Blocking 7.5', scouting_summary: 'Rare speed for the position. Mismatch nightmare if he cleans up drops. Limited by height but makes up for it with athleticism.', film_grade: 'B+' },
  { name: 'R Mason Thomas', school: 'Oklahoma', position: 'EDGE', overall_rank: 25, grade: 80, height: '6-2', weight: '241', key_stats: '6.5 sacks, 23 pressures in 173 snaps (10 games, injury-limited), 21 run stops (2 seasons)', nfl_comparison: 'Yaya Diaby', projected_round: 2, strengths: 'Power 9.0; Run defense 8.5; Production 8.0; Burst 8.0; Toughness 8.5', weaknesses: 'Length 6.5; Size 7.0', scouting_summary: 'Production and power undeniable despite length concerns. Similar profile to Bain but less heralded. Can set edge and rush inside.', film_grade: 'B+' },
  { name: 'Peter Woods', school: 'Clemson', position: 'DT', overall_rank: 26, grade: 79, height: '6-3', weight: '298', key_stats: '5 sacks (3 seasons), 31.25" arms, 20 pressures (2024), 11 pressures (2025)', nfl_comparison: 'Christian Wilkins', projected_round: 2, strengths: 'Quickness 9.0; Hand usage 8.5; Diagnostic ability 8.5; Upside 9.0', weaknesses: 'Production 6.5; Length 7.0; Power 7.0', scouting_summary: 'High-upside interior disruptor who hasn\'t put it together yet. Quickness and hands are there. Needs to maximize potential at next level.', film_grade: 'B' },
  { name: 'Zion Young', school: 'Missouri', position: 'EDGE', overall_rank: 27, grade: 79, height: '6-6', weight: '262', key_stats: 'Excellent edge-setting. Transferred from Michigan State.', nfl_comparison: 'Carl Lawson', projected_round: 2, strengths: 'Size 8.5; Run defense 8.5; Hands 8.0; Versatility 8.0; Toughness 8.5', weaknesses: 'Pass rush 6.5; Quickness 7.5; Production 7.0', scouting_summary: 'Heavy-handed edge setter with limited pass-rush production. Better as a run defender who can kick inside. Intriguing versatility.', film_grade: 'B' },
  { name: 'A.J. Haulcy', school: 'LSU', position: 'S', overall_rank: 28, grade: 79, key_stats: 'Changes games with takeaways. Physical playmaker.', nfl_comparison: 'Marcus Williams', projected_round: 2, strengths: 'Ball skills 9.0; Physicality 8.0; Instincts 8.5; Playmaking 9.0; Toughness 8.5', weaknesses: 'Tackling 7.0; Coverage 7.5; Consistency 7.0', scouting_summary: 'Ball-hawking safety with playmaking instincts. Physical but needs to improve consistency. LSU pipeline safety.', film_grade: 'B' },
  { name: 'Skyler Bell', school: 'UConn', position: 'WR', overall_rank: 29, grade: 79, key_stats: 'Combine standout. Small-school production elite.', nfl_comparison: 'Darius Slayton', projected_round: 2, strengths: 'Production 8.0; Testing 8.5; Athleticism 8.0; Preparation 9.0; Work ethic 8.5; Character 8.0', weaknesses: 'Competition 6.0; Route running 6.5; Size 7.0', scouting_summary: 'Small-school standout with elite testing. Production and preparation are there. Shouldn\'t make it out of Day 2. High-upside developmental WR.', film_grade: 'B' },
  { name: 'Germie Bernard', school: 'Alabama', position: 'WR', overall_rank: 30, grade: 78, key_stats: 'Reliable, willing target. Does everything asked.', nfl_comparison: 'Jarvis Landry', projected_round: 2, strengths: 'Reliability 8.0; Hands 7.5; Route running 7.5; Preparation 9.0; Work ethic 9.0; Character 8.5', weaknesses: 'Size 7.0; Speed 7.0; YAC 6.5', scouting_summary: 'Reliable, willing target who does everything asked. Not flashy but dependable. High-floor, low-ceiling prospect.', film_grade: 'B' },
  { name: 'Cashius Howell', school: 'Texas A&M', position: 'EDGE', overall_rank: 31, grade: 78, key_stats: 'Plays with intensity and speed despite lacking length.', nfl_comparison: 'Darrell Taylor', projected_round: 2, strengths: 'Intensity 9.0; Speed 8.0; Heart 9.0; Work ethic 9.0; Toughness 9.0', weaknesses: 'Length 6.0; Run defense 6.5; Production 7.0; Technique 7.0', scouting_summary: 'Fascinating outlier who wins with effort and speed despite lacking length. Bet-on character and athleticism. Developmental edge.', film_grade: 'B' },
  { name: 'D\'Angelo Ponds', school: 'Indiana', position: 'CB', overall_rank: 32, grade: 78, key_stats: 'Speed and physicality standout despite lacking size.', nfl_comparison: 'Emmanuel Forbes', projected_round: 2, strengths: 'Speed 8.5; Physicality 8.0; Competitiveness 8.0; Heart 9.5; Toughness 9.0', weaknesses: 'Size 5.5; Length 6.0; Upside 7.0', scouting_summary: 'Fascinating outlier. Elite play speed and competitiveness despite lacking size. High-risk, high-reward prospect.', film_grade: 'B' },
  { name: 'Colton Hood', school: 'Tennessee', position: 'CB', overall_rank: 33, grade: 77, key_stats: 'Part of talented Tennessee CB duo with McCoy.', nfl_comparison: 'Roger McCreary', projected_round: 3, strengths: 'Coverage 8.0; Physicality 8.0; Toughness 8.5; Competitiveness 8.0', weaknesses: 'Speed 7.5; Ball skills 7.0; Experience 7.0', scouting_summary: 'Physical corner with man coverage skills. Less heralded than McCoy but similar upside. Tennessee secondary produces NFL talent.', film_grade: 'B' },
  { name: 'Malachi Lawrence', school: 'UCF', position: 'EDGE', overall_rank: 34, grade: 77, key_stats: 'High-level edge production at UCF.', nfl_comparison: 'Trevis Gipson', projected_round: 3, strengths: 'Production 8.0; Athleticism 8.0; Upside 8.5; Work ethic 8.0', weaknesses: 'Technique 7.0; Competition 6.5; Run defense 7.0', scouting_summary: 'Athletic edge rusher with production at UCF. Needs technical refinement. Upside play with development time.', film_grade: 'B' },
  { name: 'Jonah Coleman', school: 'Washington', position: 'RB', overall_rank: 35, grade: 77, key_stats: 'Complete back — runs hard, natural hands, wears down defenses.', nfl_comparison: 'Elijah Mitchell', projected_round: 3, strengths: 'Running style 8.0; Receiving 7.5; Durability 8.0; Toughness 8.5; Work ethic 8.0', weaknesses: 'Size 6.5; Speed 7.0', scouting_summary: 'Underappreciated complete back. Runs hard, catches naturally, and wears down defenses. Could lead NFL backfield for years.', film_grade: 'B' },
  { name: 'Blake Miller', school: 'Clemson', position: 'OT', overall_rank: 36, grade: 79, key_stats: '54 consecutive starts. Wrestling background.', nfl_comparison: 'Braden Smith', projected_round: 2, strengths: 'Durability 10.0; Size 8.5; Strength 8.0; Reliability 9.5; Toughness 9.0', weaknesses: 'Pass protection 7.5; Athleticism 6.5', scouting_summary: 'Remarkable durability with 54 consecutive starts. Wrestling background shows in strength and leverage. Ideal RT profile who can start immediately.', film_grade: 'B' },
  { name: 'Caleb Lomu', school: 'Utah', position: 'OT', overall_rank: 37, grade: 75, key_stats: 'Developing as run blocker. Movement skills show upside.', nfl_comparison: 'Abraham Lucas', projected_round: 3, strengths: 'Pass protection 8.0; Athleticism 8.0; Upside 8.5; Work ethic 8.0', weaknesses: 'Run blocking 7.0; Length 7.0; Experience 7.0', scouting_summary: 'Developing tackle with pass-protection upside. Utah OL pipeline prospect. Needs time to develop run blocking.', film_grade: 'B-' },
  { name: 'Christen Miller', school: 'Georgia', position: 'DT', overall_rank: 38, grade: 75, key_stats: 'Interior disruptor from Georgia\'s DL room.', nfl_comparison: 'Devonte Wyatt', projected_round: 3, strengths: 'Toughness 8.0; Run defense 7.5; Mentality 8.5; Work ethic 7.5', weaknesses: 'Pass rush 7.0; Athleticism 7.0; Upside 7.0', scouting_summary: 'Tough interior lineman from Georgia pipeline. Brings power and attitude. Rotational player with limited pass-rush upside.', film_grade: 'B-' },
  { name: 'TJ Parker', school: 'Clemson', position: 'EDGE', overall_rank: 39, grade: 75, key_stats: 'Consistent edge presence for Clemson.', nfl_comparison: 'Austin Bryant', projected_round: 3, strengths: 'Consistency 8.0; Hand usage 7.5; Technique 7.5; Work ethic 8.0', weaknesses: 'Run defense 7.0; Production 7.0; Upside 7.5', scouting_summary: 'Technical edge rusher with good hand usage. Consistent but not dynamic. Clemson developmental prospect.', film_grade: 'B-' },
  { name: 'Lee Hunter', school: 'Texas Tech', position: 'DT', overall_rank: 40, grade: 75, key_stats: 'Run-stuffing nose tackle. Takes on double teams.', nfl_comparison: 'Derrick Nnadi', projected_round: 3, strengths: 'Run defense 8.5; Size 8.0; Strength 8.0; Toughness 8.0; Role acceptance 8.0', weaknesses: 'Pass rush 6.5; Athleticism 6.5; Upside 6.5', scouting_summary: 'Run-stuffing nose tackle who can anchor the middle. Takes on double teams and frees up linebackers. Two-down player.', film_grade: 'B-' },
];

export async function POST(req: NextRequest) {
  try {
    // Allow internal seeding via dedicated pipeline key (for VPS-to-VPS calls)
    const internalKey = req.headers.get('x-pipeline-key');
    const pipelineKey = process.env.PIPELINE_AUTH_KEY;
    if (!internalKey || !pipelineKey || internalKey !== pipelineKey) {
      const auth = await requireAuth(req);
      if (!auth.ok) return auth.response;
      if (auth.role !== 'owner') {
        return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
      }
    }
    if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS perform_players (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        position TEXT NOT NULL,
        height TEXT,
        weight TEXT,
        class TEXT DEFAULT '2026',
        forty_time NUMERIC(4,2),
        vertical_jump NUMERIC(4,1),
        bench_reps INTEGER,
        broad_jump NUMERIC(5,1),
        three_cone NUMERIC(5,2),
        shuttle NUMERIC(5,2),
        overall_rank INTEGER,
        position_rank INTEGER,
        projected_round INTEGER,
        grade NUMERIC(4,1),
        trend TEXT DEFAULT 'steady',
        key_stats TEXT,
        strengths TEXT,
        weaknesses TEXT,
        nfl_comparison TEXT,
        scouting_summary TEXT,
        analyst_notes TEXT,
        film_grade TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, school, class)
      )
    `;

    let inserted = 0;
    for (const p of BOARD_2026) {
      await sql`
        INSERT INTO perform_players (name, school, position, height, weight, overall_rank, grade, key_stats, nfl_comparison, projected_round, strengths, weaknesses, scouting_summary, film_grade, class, trend)
        VALUES (${p.name}, ${p.school}, ${p.position}, ${(p as any).height || null}, ${(p as any).weight || null}, ${p.overall_rank}, ${p.grade}, ${p.key_stats}, ${p.nfl_comparison}, ${p.projected_round}, ${(p as any).strengths || null}, ${(p as any).weaknesses || null}, ${(p as any).scouting_summary || null}, ${(p as any).film_grade || null}, '2026', 'steady')
        ON CONFLICT (name, school, class) DO UPDATE SET
          overall_rank = EXCLUDED.overall_rank,
          grade = EXCLUDED.grade,
          height = COALESCE(EXCLUDED.height, perform_players.height),
          weight = COALESCE(EXCLUDED.weight, perform_players.weight),
          key_stats = EXCLUDED.key_stats,
          nfl_comparison = EXCLUDED.nfl_comparison,
          projected_round = EXCLUDED.projected_round,
          strengths = EXCLUDED.strengths,
          weaknesses = EXCLUDED.weaknesses,
          scouting_summary = EXCLUDED.scouting_summary,
          film_grade = EXCLUDED.film_grade,
          updated_at = NOW()
      `;
      inserted++;
    }

    return NextResponse.json({ inserted, total: BOARD_2026.length, message: '2026 NFL Draft Big Board seeded.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
