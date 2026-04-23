// Per|Form landing — render pipeline. Picks league from localStorage or tab click.
(function () {
  const $ = (id) => document.getElementById(id);
  const h = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  };

  const LS_KEY = 'performLeague';

  function tierClass(t) {
    if (!t) return 'tier-c';
    if (t === 'PRIME' || t === 'S') return 'tier-prime';
    if (t === 'A+') return 'tier-a';
    if (t === 'A')  return 'tier-b';
    return 'tier-c';
  }

  function renderNav(d) {
    const nav = $('main-nav'); nav.innerHTML = '';
    d.nav.forEach(label => {
      const a = h('a', { href:'#', class: label === d.navActive ? 'active' : '' }, label);
      nav.appendChild(a);
    });
    $('cta-primary').textContent = d.cta;
  }

  function renderHero(d, league) {
    $('hero-eyebrow').textContent = d.hero.eyebrow;
    const hero = $('hero-h1');
    hero.innerHTML = `${d.hero.h1[0]}<span class="line2">${d.hero.h1[1]}</span>`;
    $('hero-sub').textContent = d.hero.sub;
    $('hero-cta-1').textContent = d.hero.cta1;
    $('countdown-h').textContent = d.hero.countdownH;
    const cnums = $('countdown-nums'); cnums.innerHTML = '';
    Object.entries(d.hero.countdown).forEach(([l, n]) => {
      cnums.appendChild(h('div', {class:'countdown-num'}, [
        h('div', {class:'n'}, String(n)),
        h('div', {class:'l'}, l),
      ]));
    });
    const tk = $('ticker-items'); tk.innerHTML = '';
    d.hero.ticker.forEach((t,i) => tk.appendChild(h('span', {class:'ticker-item' + (i===d.hero.ticker.length-1?' more':'')}, t)));
    $('event-shield').textContent = d.hero.event.shield;
    $('event-title').textContent  = d.hero.event.title;
    $('event-year').textContent   = d.hero.event.year;
    $('event-dates').textContent  = d.hero.event.dates;
    $('event-where').textContent  = d.hero.event.where;
  }

  function renderRail(d) {
    const rail = $('rail-5'); rail.innerHTML = '';
    d.rail.forEach(col => {
      const p = h('div', {class:'panel'}, [
        h('div', {class:'panel-head'}, [
          h('h3', {}, col.h.toUpperCase()),
          h('a', {}, 'View All')
        ]),
        h('div', {class:'panel-body'}, col.rows.map(r => {
          const [n, name, pos, meta] = r;
          const metaTxt = typeof meta === 'number'
            ? (meta === 1 ? h('span',{class:'up arrow-up'},pos||'') : meta === -1 ? h('span',{class:'down arrow-down'},pos||'') : h('span',{class:'meta'},pos||''))
            : h('span',{class:'meta'}, typeof pos === 'string' ? pos : '');
          return h('div', {class:'list-row'}, [
            h('span',{class:'n'}, n),
            h('span',{class:'name'}, name),
            typeof meta === 'string' ? h('span',{class:'meta'}, meta) : metaTxt
          ]);
        })),
      ]);
      rail.appendChild(p);
    });
  }

  function renderMain(d) {
    const m = $('main-grid'); m.innerHTML = '';

    // Headlines
    const headlines = h('div', {class:'panel'}, [
      h('div', {class:'panel-head'}, [h('h3',{},'LATEST HEADLINES'), h('a',{},'View All →')]),
      h('div', {class:'panel-body'}, d.headlines.map(hd => h('div',{class:'headline'},[
        h('div',{class:'thumb'},'IMG'),
        h('div',{},[
          h('div',{class:'kicker'}, hd.kicker),
          h('div',{class:'t'}, hd.t),
          h('div',{class:'d'}, hd.d),
        ])
      ])))
    ]);
    m.appendChild(headlines);

    // Board
    const board = h('div', {class:'panel'}, [
      h('div',{class:'panel-head'},[h('h3',{},d.boardH), h('a',{},'View Full Board →')]),
      h('div',{class:'panel-body'},[
        (() => {
          const head = h('div',{class:'board-head'},[
            h('span',{},'RANK'), h('span',{},'PLAYER'), h('span',{},'POS'), h('span',{},'SCHOOL'), h('span',{style:'text-align:right'},'TIE GRADE'), h('span',{style:'text-align:center'},'TIER')
          ]); return head;
        })(),
        ...d.board.map(r => h('div',{class:'board-row'}, [
          h('span',{class:'rk'}, String(r.rk)),
          h('div',{class:'player'},[h('div',{class:'headshot'}), h('span',{}, r.name)]),
          h('span',{class:'pos'}, r.pos),
          h('div',{class:'school'},[h('div',{class:'school-chip'}, r.chip.slice(0,3)), h('span',{}, r.school)]),
          h('span',{class:'grade-n'}, r.grade.toFixed(1)),
          h('span',{style:'text-align:center'}, h('span',{class:'tier-chip ' + tierClass(r.tier)}, r.tier)),
        ])),
        h('div',{class:'board-foot'},[
          h('div',{},[
            h('span',{style:'margin-right:10px'},'Filter: '),
            (() => { const s = h('select',{},['All Positions']); return s; })(),
            h('span',{style:'margin:0 6px'},' '),
            (() => { const s = h('select',{},['All Schools']); return s; })(),
          ]),
          h('div',{class:'toggle'},[h('span',{},'Compare Players'), h('span',{class:'sw'})]),
        ])
      ])
    ]);
    m.appendChild(board);

    // TIE card
    const t = d.tie;
    const tie = h('div',{class:'panel'},[
      h('div',{class:'panel-head'},[h('h3',{},t.name), h('a',{},'')]),
      h('div',{class:'panel-body tie-card'},[
        h('div',{class:'tie-top'},[
          h('div',{class:'tie-photo'}),
          h('div',{},[
            h('div',{class:'tie-grade-row'},[
              h('div',{class:'tie-grade'},[
                h('div',{class:'label'},'TIE GRADE'),
                h('div',{class:'num'}, String(t.grade)),
              ]),
              h('div',{class:'tie-grade','style':'text-align:right'},[
                h('div',{class:'label'},'TIER'),
                h('div',{class:'tier-big'}, t.tier),
              ]),
            ]),
            h('div',{class:'tie-meta'}, t.pos),
          ])
        ]),
        h('div',{class:'tie-stats'},[
          h('div',{class:'tie-stat'},[h('div',{class:'label'},'DRAFT PROJECTION'), h('div',{class:'val'}, t.proj)]),
          h('div',{class:'tie-stat'},[h('div',{class:'label'},'NIL / VALUE (MEDIAN)'), h('div',{class:'val accent'}, t.nil)]),
        ]),
        h('div',{class:'tie-rank'},[h('span',{class:'k'},'RANK'), h('span',{class:'v'}, t.rank)]),
        h('a',{class:'tie-cta', href:'#'}, 'View Player Profile →'),
      ])
    ]);
    m.appendChild(tie);

    // Tools
    const tools = h('div',{class:'panel'},[
      h('div',{class:'panel-head'},[h('h3',{},'TOOLS & INTEL'), h('a',{},'')]),
      h('div',{class:'panel-body'}, d.tools.map(tl => h('div',{class:'tool'},[
        h('div',{class:'tool-ic'}, tl.ic),
        h('div',{},[h('h4',{}, tl.t), h('p',{}, tl.s)]),
      ]))),
      h('div',{class:'panel-foot'}, h('a',{href:'#'}, 'Explore All Tools →')),
    ]);
    m.appendChild(tools);
  }

  function renderEngineRail(d) {
    const rail = $('engine-rail'); rail.innerHTML = '';

    // TIE Engine donut
    const eng = h('div',{class:'panel'},[
      h('div',{class:'panel-head'},[h('h3',{},d.engine.title),h('a',{},'How TIE Works →')]),
      h('div',{class:'panel-body engine-box'},[
        (() => {
          const donut = h('div',{class:'donut'});
          donut.appendChild(h('div',{class:'donut-inner'},[
            h('div',{class:'k'},'TIE'),
            h('div',{class:'v'},'GRADE'),
          ]));
          return donut;
        })(),
        h('div',{class:'engine-key'}, [
          h('div',{style:'font-size:11px;color:var(--ink-dim);margin-bottom:4px'}, d.engine.sub),
          ...d.engine.pillars.map(p => h('div',{class:'row'},[
            h('span',{class:'dot','style':'background:' + p.c}),
            h('span',{class:'pct'}, p.pct + '%'),
            h('div',{class:'txt'},[h('div',{class:'t'}, p.t), h('div',{class:'s'}, p.s)]),
          ])),
        ])
      ])
    ]);
    rail.appendChild(eng);

    // Tier Ladder
    const tiersBody = [];
    d.tiers.forEach(([tier, color, rng, desc]) => {
      tiersBody.push(h('div',{class:'tier-ladder'},[
        h('div',{class:'tc','style':`background:${color};color:${['var(--amber)'].includes(color)?'#000':'#000'}; color: #000`}, tier),
        h('div',{class:'rng'}, rng),
        h('div',{class:'desc'}, desc),
      ]));
    });
    const tierR = h('div',{style:'margin-top:8px;padding-top:8px;border-top:1px solid var(--line);display:grid;gap:4px'},
      d.tierRight.map(([rng,desc]) => h('div',{style:'display:grid;grid-template-columns:55px 1fr;gap:10px;font-size:11px;color:var(--ink-dim);font-family:JetBrains Mono,monospace'},[
        h('span',{}, rng),
        h('span',{style:'color:var(--ink)'}, desc),
      ]))
    );
    const tierPanel = h('div',{class:'panel'},[
      h('div',{class:'panel-head'},[h('h3',{},'TIER LADDER'), h('a',{},'See Full Methodology →')]),
      h('div',{class:'panel-body'},[
        h('div',{style:'font-size:11px;color:var(--ink-dim);margin-bottom:8px'},'Grade today. Project tomorrow.'),
        ...tiersBody, tierR,
      ]),
    ]);
    rail.appendChild(tierPanel);

    // NIL
    const n = d.nil;
    const nilPanel = h('div',{class:'panel'},[
      h('div',{class:'panel-head'},[h('h3',{},n.h), h('a',{},'How It Works →')]),
      h('div',{class:'panel-body'},[
        h('div',{style:'font-size:11px;color:var(--ink-dim);margin-bottom:14px'}, n.sub),
        h('div',{class:'nil-num'}, n.big),
        h('div',{class:'nil-label'}, n.label),
        (() => {
          const bars = h('div',{class:'nil-bars'});
          n.bars.forEach((_,i) => bars.appendChild(h('div',{class:'nil-bar' + (i===1?' mid':''), style:`height:${[40,75,100][i]}%`})));
          return bars;
        })(),
        (() => {
          const labels = h('div',{class:'nil-bar-labels'});
          n.bars.forEach(([k,v]) => labels.appendChild(h('div',{},[h('div',{},k),h('div',{class:'v'},v)])));
          return labels;
        })(),
      ])
    ]);
    rail.appendChild(nilPanel);

    // Portal
    const p = d.portal;
    const portalPanel = h('div',{class:'panel'},[
      h('div',{class:'panel-head'},[h('h3',{},p.h),h('a',{},'View Tracker →')]),
      h('div',{class:'panel-body'},[
        h('div',{style:'font-size:11px;color:var(--ink-dim);margin-bottom:8px'}, p.sub),
        ...p.rows.map(([name,pos,move]) => h('div',{class:'list-row'},[
          h('span',{class:'n'}, ''),
          h('span',{class:'name'}, name),
          h('span',{class:'meta'}, pos + ' · ' + move),
        ]))
      ])
    ]);
    rail.appendChild(portalPanel);
  }

  function renderBuiltFor(d) {
    const p = $('personas'); if (!p) return;
    p.innerHTML = '';
    d.personas.forEach(([t,s]) => p.appendChild(h('div',{class:'persona'},[
      h('div',{class:'persona-ic'},'◆'),
      h('div',{},[h('div',{class:'p-t'},t), h('div',{class:'p-s'},s)]),
    ])));
    const wt = $('war-title'); if (wt) wt.textContent = d.war.t;
    const ws = $('war-sub'); if (ws) ws.textContent = d.war.s;
    const wb = $('war-btn'); if (wb) wb.textContent = d.war.btn;
  }

  function renderPipelineStrip(league) {
    const strip = $('pipeline-strip');
    if (!strip) return;
    const enabled = tweaks.pipeline !== false;
    if (!enabled || (league !== 'ncaa' && league !== 'nfl')) {
      strip.style.display = 'none';
      return;
    }
    strip.style.display = 'block';
    const isNCAA = league === 'ncaa';
    const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    // NCAA view: show NCAA stages lit up, NFL dimmed; NFL view: reverse
    if (isNCAA) {
      setText('pp-commit',  '247 Class of \'26');
      setText('pp-roster',  '$22.4M Top Rost.');
      setText('pp-portal',  '412 Spring Entries');
      setText('pp-combine', 'Feb \'27 · 332');
      setText('pp-draft',   'Apr \'27 · 258');
      const btn = $('pipeline-switch'); if (btn) { btn.textContent = 'Switch to NFL →'; btn.dataset.target = 'nfl'; }
    } else {
      setText('pp-commit',  '247 Tracked');
      setText('pp-roster',  '$22.4M Top Rost.');
      setText('pp-portal',  '412 Portal');
      setText('pp-combine', 'Feb \'26 · 332');
      setText('pp-draft',   'TONIGHT · 257');
      const btn = $('pipeline-switch'); if (btn) { btn.textContent = '← Switch to NCAA'; btn.dataset.target = 'ncaa'; }
    }
  }

  function renderCMO() { /* removed per user request */ }

  /* ===== TWEAKS ===== */
  const TWEAKS_KEY = 'performTweaks';
  const tweaks = Object.assign({ pipeline: true, density: 'comfortable', pulse: true },
    (() => { try { return JSON.parse(localStorage.getItem(TWEAKS_KEY) || '{}'); } catch (_) { return {}; } })());

  function saveTweaks() { try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks)); } catch (_) {} }

  function applyTweaks() {
    document.body.dataset.density = tweaks.density;
    const strip = $('season-strip'); if (strip) strip.style.display = tweaks.pulse ? '' : 'none';
  }

  function wireTweaks() {
    const panel = $('tweaks');
    if (!panel) return;
    const pipeCb = $('tw-pipeline'); if (pipeCb) pipeCb.checked = !!tweaks.pipeline;
    const pulseCb = $('tw-pulse'); if (pulseCb) pulseCb.checked = !!tweaks.pulse;
    document.querySelectorAll('#tw-density button').forEach(b => b.classList.toggle('active', b.dataset.val === tweaks.density));

    pipeCb && pipeCb.addEventListener('change', () => {
      tweaks.pipeline = pipeCb.checked; saveTweaks();
      renderPipelineStrip(document.body.dataset.league);
    });
    pulseCb && pulseCb.addEventListener('change', () => {
      tweaks.pulse = pulseCb.checked; saveTweaks(); applyTweaks();
    });
    document.querySelectorAll('#tw-density button').forEach(b => {
      b.addEventListener('click', () => {
        tweaks.density = b.dataset.val; saveTweaks();
        document.querySelectorAll('#tw-density button').forEach(x => x.classList.toggle('active', x === b));
        applyTweaks();
      });
    });
    document.querySelectorAll('#tweaks-leagues .tw-lg').forEach(b => {
      b.addEventListener('click', () => renderLeague(b.dataset.league));
    });
    $('tweaks-close') && $('tweaks-close').addEventListener('click', () => {
      window.parent.postMessage({type:'__deactivate_edit_mode'}, '*');
      panel.hidden = true;
    });
  }

  // Highlight active league in tweaks panel
  function syncTweaksLeagueUI(league) {
    document.querySelectorAll('#tweaks-leagues .tw-lg').forEach(b => b.classList.toggle('active', b.dataset.league === league));
  }

  // Pipeline switch button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#pipeline-switch');
    if (btn) renderLeague(btn.dataset.target || 'nfl');
  });

  // Edit-mode protocol — register listener BEFORE announcing availability
  window.addEventListener('message', (e) => {
    const t = e.data && e.data.type;
    if (t === '__activate_edit_mode') { const p = $('tweaks'); if (p) p.hidden = false; }
    if (t === '__deactivate_edit_mode') { const p = $('tweaks'); if (p) p.hidden = true; }
  });
  window.parent.postMessage({type:'__edit_mode_available'}, '*');

  function renderSeasonPulse(currentLeague) {
    const wrap = $('season-cards'); if (!wrap) return;
    wrap.innerHTML = '';
    // order: platform (NCAA) pinned left, then rank 1..4
    const sorted = [...window.SEASON_PULSE].sort((a,b) => {
      if (a.primary) return -1; if (b.primary) return 1;
      return a.rank - b.rank;
    });
    sorted.forEach(s => {
      const isActive = s.league === currentLeague;
      const card = h('div', { class: 'season-card' + (s.primary || isActive ? ' is-primary' : ''), 'data-league': s.league }, [
        h('div', {class:'rk'}, s.primary ? '◆' : String(s.rank)),
        h('div', {class:'sc-body'}, [
          h('div', {style:'display:flex;align-items:center;gap:8px;margin-bottom:2px'},[
            h('span', {class:'lg-badge'}, s.league.toUpperCase()),
            s.live ? h('span', {class:'sc-live'}, [h('span',{class:'dot'}),'LIVE']) : null,
          ]),
          h('div', {class:'sc-ev'}, s.ev),
          h('div', {class:'sc-st'}, s.status),
        ]),
        h('div', {class:'sc-phase'}, s.phase),
      ]);
      card.addEventListener('click', () => renderLeague(s.league));
      wrap.appendChild(card);
    });
  }

  function renderLeague(league) {
    const d = window.LEAGUE_DATA[league];
    if (!d) return;
    document.body.dataset.league = league;
    document.querySelectorAll('.league-tab').forEach(t => t.classList.toggle('active', t.dataset.league === league));

    // Toggle home-hero vs league-hero based on isHome flag
    const homeHero = $('home-hero');
    const leagueHero = $('hero');
    if (d.isHome) {
      homeHero.style.display = 'block';
      leagueHero.style.display = 'none';
    } else {
      homeHero.style.display = 'none';
      leagueHero.style.display = 'block';
      renderHero(d, league);
    }

    renderNav(d);
    renderSeasonPulse(league);
    renderRail(d);
    renderMain(d);
    renderEngineRail(d);
    renderBuiltFor(d);
    renderPipelineStrip(league);
    syncTweaksLeagueUI(league);
    try { localStorage.setItem(LS_KEY, league); } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  document.getElementById('league-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.league-tab');
    if (btn) renderLeague(btn.dataset.league);
  });

  // ── Real-data wiring ──────────────────────────────────────────────
  // Swap the example board rows in LEAGUE_DATA with live /api/players
  // data before first render. Each league maps to a `sport` param; when
  // the API returns rows we overwrite LEAGUE_DATA[league].board +
  // LEAGUE_DATA[league].tie so the visible big board + TIE output card
  // reflect actual prospects, not the static examples shipped in
  // league-data.js.
  const LEAGUE_SPORT_PARAM = {
    ncaa: 'football',     // college football prospects (same table, NCAA-framed)
    nfl:  'football',     // 2026 NFL Draft prospects
    nba:  'basketball',
    mlb:  'baseball',
    nhl:  'hockey',
  };
  const SCHOOL_ABBREV = {
    'Texas':'TX','Alabama':'ALA','Georgia':'UGA','Ohio State':'OSU','Michigan':'MICH',
    'LSU':'LSU','Clemson':'CU','Oregon':'ORE','Notre Dame':'ND','Penn State':'PSU',
    'Miami':'MIA','Miami (FL)':'MIA','USC':'USC','Oklahoma':'OU','Tennessee':'TN',
    'Auburn':'AUB','Florida':'UF','Florida State':'FSU','Texas A&M':'TAM',
    'South Carolina':'SC','Washington':'UW','Utah':'UTA','TCU':'TCU',
    'Kansas State':'KSU','Iowa':'IA','Wisconsin':'WIS','North Carolina':'UNC',
    'UCLA':'UCLA','California':'CAL','Stanford':'STAN','Duke':'DUKE',
    'Kentucky':'UK','Arkansas':'ARK','Ole Miss':'OM','Mississippi State':'MSU',
  };
  function schoolChip(school) {
    if (!school) return '—';
    if (SCHOOL_ABBREV[school]) return SCHOOL_ABBREV[school];
    // fallback: take first letter of each word, cap at 3 chars
    return school.split(/\s+/).map(w => w[0] || '').join('').slice(0,3).toUpperCase() || school.slice(0,3).toUpperCase();
  }
  function mapPlayerToBoardRow(p, idx) {
    const raw = (p.grade ?? p.tie_grade ?? 0);
    const grade = typeof raw === 'number' ? raw : parseFloat(raw) || 0;
    const tierRaw = (p.tie_tier || '').toUpperCase();
    // Display tier: keep PRIME / S / A+ / A / B+ as-is; collapse others to B
    let tier = 'B';
    if (tierRaw === 'PRIME') tier = 'PRIME';
    else if (tierRaw === 'S' || grade >= 95) tier = 'S';
    else if (tierRaw === 'A_PLUS' || tierRaw === 'A+' || grade >= 90) tier = 'A+';
    else if (tierRaw === 'A' || grade >= 85) tier = 'A';
    else if (tierRaw === 'B_PLUS' || tierRaw === 'B+' || grade >= 80) tier = 'B+';
    return {
      rk: p.overall_rank ?? (idx + 1),
      name: p.name || '—',
      pos: p.position || '—',
      school: p.school || '—',
      chip: schoolChip(p.school),
      grade,
      tier,
    };
  }
  async function fetchRealBoards() {
    const targets = Object.entries(LEAGUE_SPORT_PARAM).filter(([lg]) => window.LEAGUE_DATA[lg]);
    await Promise.all(targets.map(async ([lg, sport]) => {
      try {
        const res = await fetch(`/api/players?limit=5&sort=overall_rank:asc&sport=${encodeURIComponent(sport)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const rows = Array.isArray(data.players) ? data.players : [];
        if (rows.length === 0) return;
        const mapped = rows.map(mapPlayerToBoardRow);
        window.LEAGUE_DATA[lg].board = mapped;
        // Also refresh the TIE output card with the #1 prospect for the league
        const top = mapped[0];
        if (top) {
          const proj = top.tier === 'PRIME' ? 'Generational · Top 5' :
                       top.tier === 'S' ? 'Top 10 Pick' :
                       top.tier === 'A+' ? 'Round 1 Early' :
                       top.tier === 'A' ? 'Round 1' : 'Round 2+';
          window.LEAGUE_DATA[lg].tie = Object.assign({}, window.LEAGUE_DATA[lg].tie || {}, {
            name: 'TIE OUTPUT · #1 ' + lg.toUpperCase(),
            grade: top.grade,
            tier: top.tier,
            pos: `${top.pos} · ${top.school}`,
            proj,
            rank: `#${top.rk} Overall`,
          });
        }
      } catch (_) {
        // Fetch failure — leave static data as fallback
      }
    }));
  }

  const saved = (() => { try { return localStorage.getItem(LS_KEY); } catch (_) { return null; } })();
  applyTweaks();
  wireTweaks();
  // Render once immediately so the page isn't blank during the fetch,
  // then re-render after live data arrives. Keeps first paint fast +
  // swaps to real rosters ~300-800ms later.
  renderLeague(saved || 'ncaa');
  fetchRealBoards().then(() => {
    renderLeague(document.body.dataset.league || saved || 'ncaa');
  });
})();
