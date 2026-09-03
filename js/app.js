/* ============================================================
   薄肌俱乐部 BOJI · 应用逻辑
   零依赖 · hash 路由 · localStorage 持久化
   ============================================================ */

"use strict";

(function () {
  const app = document.getElementById("app");

  /* ================= 存储 ================= */
  const KEY = {
    profile: "boji_profile_v1",
    checkins: "boji_checkins_v1",
    week: "boji_week_v1",
  };
  const THEME_KEY = "boji_theme_v1";

  function load(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 隐私模式等场景静默失败 */ }
  }

  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  };

  function normalizeProfile(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const activities = [1.2, 1.375, 1.55, 1.725];
    const activity = Number(source.activity);
    return {
      gender: source.gender === "female" ? "female" : "male",
      age: clamp(source.age, 14, 80, PROFILE_DEFAULT.age),
      height: clamp(source.height, 120, 230, PROFILE_DEFAULT.height),
      weight: clamp(source.weight, 35, 200, PROFILE_DEFAULT.weight),
      activity: activities.includes(activity) ? activity : PROFILE_DEFAULT.activity,
      target: clamp(source.target, 40, 200, PROFILE_DEFAULT.target),
    };
  }

  function normalizeCheckins(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    for (let week = 1; week <= 16; week++) {
      if (Array.isArray(value[week])) result[week] = value[week].slice(0, 7).map(Boolean);
    }
    return result;
  }

  /* ================= 主题（深色 / 浅色） ================= */
  // 首选用户手动选择，其次跟随系统（index.html 头部脚本已做首次应用）
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "light" ? "#f5f5f7" : "#000000");
  }
  applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  // 系统主题变化时，未手动设置过的用户自动跟随
  if (window.matchMedia) {
    const colorScheme = matchMedia("(prefers-color-scheme: light)");
    const onSchemeChange = (e) => {
      if (localStorage.getItem(THEME_KEY) === null) applyTheme(e.matches ? "light" : "dark");
    };
    if (colorScheme.addEventListener) colorScheme.addEventListener("change", onSchemeChange);
    else if (colorScheme.addListener) colorScheme.addListener(onSchemeChange);
  }

  let profile = normalizeProfile(load(KEY.profile, {}));
  let checkins = normalizeCheckins(load(KEY.checkins, {})); // { "3": [true,false,true] }
  let selWeek = Math.round(clamp(load(KEY.week, 1), 1, 16, 1));
  let exFilter = "全部";
  // 置顶三大动作当前显示动图的卡片（key 集合）；默认全部显示 B 站视频
  const featAnimMode = new Set();

  /* ================= 工具 ================= */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const round1 = (n) => Math.round(n * 10) / 10;

  function phaseOfWeek(w) { return w <= 4 ? 1 : w <= 8 ? 2 : w <= 12 ? 3 : 4; }
  function phaseOf(w) { return PHASES[phaseOfWeek(w) - 1]; }
  function weekDays(w) {
    const p = phaseOf(w);
    return w % 2 === 1 ? p.daysOdd : p.daysEven;
  }
  function plannedTotal() {
    let n = 0;
    for (let w = 1; w <= 16; w++) n += weekDays(w).length;
    return n;
  }
  function doneTotal() {
    let n = 0;
    for (let w = 1; w <= 16; w++) n += (checkins[w] || []).slice(0, weekDays(w).length).filter(Boolean).length;
    return n;
  }
  function weekDone(w) {
    const arr = checkins[w] || [];
    return arr.filter(Boolean).length;
  }
  function weekAllDone(w) {
    return weekDone(w) >= weekDays(w).length;
  }
  function firstUnfinishedWeek() {
    for (let w = 1; w <= 16; w++) if (!weekAllDone(w)) return w;
    return 16;
  }
  function bmi() {
    const h = profile.height / 100;
    return profile.weight / (h * h);
  }
  function bmiLabel(v) {
    if (v < 18.5) return "偏瘦";
    if (v < 24) return "正常";
    if (v < 28) return "超重";
    return "肥胖";
  }

  /* ================= 视图：总览 ================= */
  function viewHome() {
    const b = round1(bmi());
    const nextW = firstUnfinishedWeek();
    const done = doneTotal();
    const phases = PHASES.map((p) => `
      <a class="phase-card" href="#plan" data-goto-week="${p.id === 1 ? 1 : p.id === 2 ? 5 : p.id === 3 ? 9 : 13}" style="--pc:${p.color}">
        <span class="ph-no">PHASE ${p.id} · ${p.weeks}</span>
        <h3>${p.name}</h3>
        <span class="ph-sub">${p.sub}</span>
        <ul>${p.keyPoints.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
        <span class="ph-link">查看该阶段 →</span>
      </a>`).join("");

    return `
    <section>
      <div class="hero">
        <div class="badge-row">
          <span class="tag tag-accent">初学者友好 · 每周 3 练</span>
          <span class="tag">零依赖 · 数据本地存储</span>
          <span class="tag tag-blue">为 ${round1(profile.height)}cm / ${round1(profile.weight)}kg 定制</span>
        </div>
        <h1>瘦子的<span class="hl">薄肌</span>养成计划<span class="thin"> · 16 周</span></h1>
        <p class="lead">
          不追求大块头，目标是<b>穿衣显瘦、脱衣有肉</b>：宽肩、细腰、清晰的胸腹线条。
          四个阶段循序渐进——从动作入门到独立训练，配套饮食计算与打卡追踪。
          目前已完成 <b class="accent">${done} / ${plannedTotal()}</b> 次训练。
        </p>
        <div class="cta-row">
          <a class="btn btn-primary" href="#plan" data-goto-week="${nextW}">继续第 ${nextW} 周训练 →</a>
          <a class="btn btn-ghost" href="#nutrition">先看怎么吃</a>
        </div>
        <div class="stat-grid">
          <div class="stat-card"><div class="num">${round1(profile.height)}<small>cm</small></div><div class="lbl">身高（饮食页可修改）</div></div>
          <div class="stat-card"><div class="num">${round1(profile.weight)}<small>kg</small></div><div class="lbl">当前体重（饮食页可修改）</div></div>
          <div class="stat-card"><div class="num">${b}<small> · ${bmiLabel(b)}</small></div><div class="lbl">BMI（中国标准）</div></div>
          <div class="stat-card"><div class="num">${round1(profile.target - profile.weight) >= 0 ? "+" : ""}${round1(profile.target - profile.weight)}<small>kg</small></div><div class="lbl">距离目标体重 ${round1(profile.target)}kg</div></div>
        </div>
      </div>

      <div class="section-title"><h2>四个阶段</h2><span class="sub">16 周 · ${plannedTotal()} 次训练 · 点击卡片直达</span></div>
      <div class="phase-grid">${phases}</div>

      <div class="section-title"><h2>核心原则</h2><span class="sub">比计划本身更重要的事</span></div>
      <div class="principle-grid">
        ${PRINCIPLES.map((x) => `
          <div class="mini-card">
            <div class="ico">${x.ico}</div>
            <h4>${x.t}</h4>
            <p>${x.d}</p>
          </div>`).join("")}
      </div>

      <div class="section-title"><h2>常见问题</h2><span class="sub">瘦子最关心的六件事</span></div>
      <div class="faq">
        ${FAQS.map((f) => `
          <details class="faq-item">
            <summary>${f.q}</summary>
            <div class="faq-body">${f.a}</div>
          </details>`).join("")}
      </div>
    </section>`;
  }

  /* ================= 视图：训练计划 ================= */
  function viewPlan() {
    const curPhaseId = phaseOfWeek(selWeek);
    const phase = phaseOf(selWeek);
    const days = weekDays(selWeek);
    const focus = WEEK_FOCUS[selWeek] || "";
    const badge = WEEK_BADGE[selWeek];

    const monthTabs = PHASES.map((p) => `
      <button class="tab ${p.id === curPhaseId ? "active" : ""}" data-month="${p.id}">${p.id}月 · ${p.name}</button>
    `).join("");

    const weekStrip = Array.from({ length: 16 }, (_, i) => {
      const w = i + 1;
      const all = weekAllDone(w);
      const lbl = WEEK_BADGE[w] || phaseOf(w).sub.split(" ")[0];
      return `<button class="week-btn ${w === selWeek ? "active" : ""} ${all ? "done" : ""}"
        data-week="${w}" aria-pressed="${w === selWeek}">W${w}<span class="wk-lbl">${lbl}</span></button>`;
    }).join("");

    const dayCards = days.map((key, i) => {
      const tpl = DAY_TPL[key];
      const done = !!(checkins[selWeek] || [])[i];
      return `
      <div class="day-card ${done ? "done" : ""}">
        <label class="day-head">
          <input type="checkbox" data-check-day="${i}" aria-label="${esc(tpl.name)}训练打卡" ${done ? "checked" : ""}>
          <span class="day-name">${tpl.name}</span>
          <span class="tag">${tpl.tag}</span>
        </label>
        <div class="ex-list">
          ${tpl.ex.map((e) => `
            <div class="ex-row">
              <div class="ex-main"><b>${e.n}</b>${e.note ? `<span class="ex-note">${e.note}</span>` : ""}</div>
              <div class="ex-sr">${e.s} × ${e.r}</div>
              <div class="ex-rest">${e.rest}</div>
            </div>`).join("")}
        </div>
        <details class="ws">
          <summary>热身 5 分钟 & 拉伸 5 分钟（点击展开）</summary>
          <div class="ws-body">
            <b>热身：</b>${WARMUP.join("；")}<br><br>
            <b>拉伸：</b>${STRETCH.join("；")}
          </div>
        </details>
      </div>`;
    }).join("");

    return `
    <section>
      <div class="page-head">
        <div>
          <h1>训练计划</h1>
          <p class="muted">16 周 · 4 阶段 · 共 ${plannedTotal()} 次训练 · 训练后记得勾选打卡</p>
        </div>
        <div class="progress-pill">总进度 <b>${doneTotal()}/${plannedTotal()}</b></div>
      </div>

      <div class="tabs">${monthTabs}</div>

      <div class="phase-detail" style="--pc:${phase.color}">
        <div class="pd-head">
          <h3>第 ${phase.id} 阶段 · ${phase.name}</h3>
          <span class="tag">${phase.weeks}</span>
        </div>
        <p class="pd-goal">${phase.goal}</p>
        <div class="info-grid">
          <div class="info-item"><div class="k">频率</div><div class="v">${phase.freq}</div></div>
          <div class="info-item"><div class="k">分化</div><div class="v">${phase.split}</div></div>
          <div class="info-item"><div class="k">休息</div><div class="v">${phase.rest}</div></div>
          <div class="info-item"><div class="k">强度</div><div class="v">${phase.intensity}</div></div>
          <div class="info-item"><div class="k">时长</div><div class="v">${phase.duration}</div></div>
        </div>
        <div class="kp-row">${phase.keyPoints.map((k) => `<span class="tag">${esc(k)}</span>`).join("")}</div>
        <div class="progression-note"><b>渐进规则：</b>${phase.progression}</div>
      </div>

      <div class="week-strip">${weekStrip}</div>

      <div class="week-detail">
        <div class="week-head">
          <h3>第 ${selWeek} 周</h3>
          ${badge ? `<span class="tag tag-orange">${badge}</span>` : ""}
          <span class="tag">本周 ${days.length} 练 · 已完成 ${weekDone(selWeek)}/${days.length}</span>
          <span class="focus">📋 ${focus}</span>
        </div>
        <div class="day-grid">${dayCards}</div>
      </div>
    </section>`;
  }

  /* ================= 视图：动作库 · 三大基础动作置顶 ================= */
  // 循环动图用内联 SVG + SMIL 实现（零依赖、无网络请求），两个关键姿势之间平滑插值
  const ANIM_ATTRS = 'dur="3.2s" repeatCount="indefinite" calcMode="spline"'
    + ' keyTimes="0;0.42;0.55;0.97;1"'
    + ' keySplines="0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1"';

  function animPoints(p1, p2) {
    return `<animate attributeName="points" ${ANIM_ATTRS} values="${p1};${p2};${p2};${p1};${p1}"/>`;
  }
  function animCircle(axis, v1, v2) {
    return `<animate attributeName="${axis}" ${ANIM_ATTRS} values="${v1};${v2};${v2};${v1};${v1}"/>`;
  }

  function featuredAnimSvg(item) {
    const figures = {
      // 俯卧撑：以脚尖为轴，身体直线上下；手撑点固定，肘部屈伸
      pushup: () => `
        <line class="anim-ground" x1="36" y1="110" x2="188" y2="110"/>
        <polyline class="anim-limb" points="162,110 154,108 141,105 117,98 76,86">
          ${animPoints("162,110 154,108 141,105 117,98 76,86", "162,110 154,109 140,108 115,106 73,102")}
        </polyline>
        <circle class="anim-head" cx="61" cy="81" r="7">
          ${animCircle("cx", 61, 57)}${animCircle("cy", 81, 101)}
        </circle>
        <polyline class="anim-limb" points="76,86 69,98 63,110">
          ${animPoints("76,86 69,98 63,110", "73,102 80,107 63,110")}
        </polyline>`,
      // 深蹲：屈髋向后坐，膝盖前移，手臂前平举配重
      squat: () => `
        <line class="anim-ground" x1="40" y1="110" x2="170" y2="110"/>
        <polyline class="anim-limb" points="74,110 98,110"/>
        <polyline class="anim-limb" points="88,108 90,80 88,54 90,30">
          ${animPoints("88,108 90,80 88,54 90,30", "88,108 114,98 88,100 103,82")}
        </polyline>
        <circle class="anim-head" cx="91" cy="17" r="8">
          ${animCircle("cx", 91, 113)}${animCircle("cy", 17, 71)}
        </circle>
        <polyline class="anim-limb" points="90,30 110,33 130,36">
          ${animPoints("90,30 110,33 130,36", "103,82 124,85 144,88")}
        </polyline>`,
      // 仰卧起坐：以髋为轴卷起上身，双腿屈膝固定，双手扶头
      situp: () => `
        <line class="anim-ground" x1="24" y1="110" x2="196" y2="110"/>
        <polyline class="anim-limb" points="95,103 127,90 114,106 128,109"/>
        <polyline class="anim-limb" points="60,104 95,103">
          ${animPoints("60,104 95,103", "73,76 95,103")}
        </polyline>
        <circle class="anim-head" cx="44" cy="103" r="7">
          ${animCircle("cx", 44, 64)}${animCircle("cy", 103, 66)}
        </circle>
        <polyline class="anim-limb" points="60,104 44,110 49,96">
          ${animPoints("60,104 44,110 49,96", "73,76 59,84 61,70")}
        </polyline>`,
    };
    const body = figures[item.key] ? figures[item.key]() : "";
    return `<svg class="anim-fig" viewBox="0 0 220 130" role="img" aria-label="${esc(item.name)}标准动作循环演示">${body}</svg>`;
  }

  function biliEmbed(f) {
    return `
      <div class="bili-embed">
        <iframe src="https://player.bilibili.com/player.html?bvid=${encodeURIComponent(f.bvid)}&page=1&high_quality=1&danmaku=0&autoplay=0"
          title="${esc(f.videoTitle)}" loading="lazy" scrolling="no" allowfullscreen></iframe>
      </div>`;
  }

  function viewFeatured() {
    const cards = FEATURED_EXERCISES.map((f) => {
      const showAnim = featAnimMode.has(f.key);
      const visual = showAnim
        ? `${featuredAnimSvg(f)}<span class="feat-badge">动图演示</span>`
        : biliEmbed(f);
      const toggle = showAnim
        ? `<button class="btn btn-primary btn-sm" type="button" data-feat-toggle="${esc(f.key)}">▶ 播放视频演示</button>`
        : `<button class="btn btn-ghost btn-sm" type="button" data-feat-toggle="${esc(f.key)}">▶ 查看动图</button>`;
      return `
      <div class="feat-card">
        <div class="feat-visual">${visual}</div>
        <div class="feat-info">
          <div class="feat-title"><h3>${esc(f.name)}</h3><span class="feat-sub">${esc(f.sub)}</span></div>
          <p class="feat-desc">${esc(f.desc)}</p>
          <p class="feat-err"><b>常见错误：</b>${esc(f.common)}</p>
          <div class="feat-actions">
            ${toggle}
            <a class="btn btn-ghost btn-sm" href="https://www.bilibili.com/video/${esc(f.bvid)}/" target="_blank" rel="noopener noreferrer">在 B 站打开 ↗</a>
          </div>
          <p class="feat-credit muted2">视频：《${esc(f.videoTitle)}》· @${esc(f.videoAuthor)}</p>
        </div>
      </div>`;
    }).join("");

    return `
      <div class="section-title tight"><h2>三大基础动作</h2><span class="sub">俯卧撑 · 深蹲 · 仰卧起坐 · 默认 B 站视频讲解，可切换动图</span></div>
      <div class="feat-grid">${cards}</div>`;
  }

  /* ================= 视图：动作库 ================= */
  function viewExercises() {
    const muscles = ["全部", "胸", "背", "肩", "腿", "核心"];
    const chips = muscles.map((m) =>
      `<button class="chip ${exFilter === m ? "active" : ""}" data-exfilter="${m}" aria-pressed="${exFilter === m}">${m}</button>`
    ).join("");
    const list = EXERCISES.filter((e) => exFilter === "全部" || e.muscle === exFilter);

    return `
    <section>
      <div class="page-head">
        <div>
          <h1>动作库</h1>
          <p class="muted">置顶三大基础动作动图演示 · 下方是计划会用到的 ${EXERCISES.length} 个入门动作，按部位筛选</p>
        </div>
      </div>
      ${viewFeatured()}
      <div class="section-title tight"><h2>全部入门动作</h2><span class="sub">每个动作都有要点、常见错误和替代方案</span></div>
      <div class="chip-row">${chips}</div>
      <div class="ex-grid">
        ${list.map((e) => `
          <div class="ex-card">
            ${EXERCISE_IMAGES[e.name] ? `
              <figure class="ex-visual">
                <img src="${esc(EXERCISE_IMAGES[e.name].src)}?v=${EXERCISE_ASSET_VERSION}" alt="${esc(EXERCISE_IMAGES[e.name].alt)}"
                  width="960" height="640" loading="lazy" decoding="async">
              </figure>` : ""}
            <div class="ex-title"><h4>${e.name}</h4></div>
            <div class="ex-part">${e.muscle} · ${e.part}</div>
            <div class="ex-tags">
              <span class="tag ${e.type === "复合" ? "tag-accent" : ""}">${e.type}</span>
              <span class="tag ${e.level === "入门" ? "tag-blue" : e.level === "高阶" ? "tag-red" : ""}">${e.level}</span>
            </div>
            <dl>
              <div><dt>要点</dt><dd>${e.cues}</dd></div>
              <div><dt>常见错误</dt><dd>${e.mistakes}</dd></div>
              <div><dt>替代</dt><dd>${e.alt}</dd></div>
            </dl>
          </div>`).join("")}
      </div>
      ${list.length === 0 ? '<p class="chart-empty">该分类下暂无动作</p>' : ""}
    </section>`;
  }

  /* ================= 视图：饮食 ================= */
  function calcNutrition() {
    const bmr = Math.round(
      10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.gender === "male" ? 5 : -161)
    );
    const tdee = Math.round(bmr * profile.activity);
    const target = tdee + 350;
    const protein = Math.round(profile.weight * 2);      // 2g/kg
    const fat = Math.round(profile.weight * 1);          // 1g/kg
    const carb = Math.round((target - protein * 4 - fat * 9) / 4);
    return { bmr, tdee, target, protein, fat, carb,
      pKcal: protein * 4, fKcal: fat * 9, cKcal: carb * 4 };
  }

  function donutSvg(n) {
    const colors = { p: "var(--chart-p)", c: "var(--chart-c)", f: "var(--chart-f)" };
    const total = n.pKcal + n.fKcal + n.cKcal;
    const r = 54, C = 2 * Math.PI * r;
    let off = 0;
    const seg = (kcal, color) => {
      const frac = Math.max(0, kcal / total);
      const dash = frac * C;
      const s = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${color}" stroke-width="17"
        stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"
        transform="rotate(-90 70 70)" stroke-linecap="butt"/>`;
      off += dash;
      return s;
    };
    return `
    <div class="donut-box">
      <svg viewBox="0 0 140 140" width="200" height="200" role="img" aria-label="营养素占比">
        <circle r="${r}" cx="70" cy="70" fill="none" stroke="var(--card2)" stroke-width="17"/>
        ${seg(n.cKcal, colors.c)}${seg(n.pKcal, colors.p)}${seg(n.fKcal, colors.f)}
      </svg>
      <div class="donut-center">
        <div class="num">${n.target}</div>
        <div class="k">目标 kcal / 天</div>
      </div>
    </div>`;
  }

  function viewNutrition() {
    const n = calcNutrition();
    const total = n.pKcal + n.fKcal + n.cKcal;
    // 示例食谱总量 vs 用户目标：给出等比缩放提示
    const mealTotal = MEALS.reduce((sum, m) => sum + (parseInt(String(m.kcal).replace(/\D/g, ""), 10) || 0), 0);
    const ratio = mealTotal ? Math.round((n.target / mealTotal) * 100) : 100;
    const ratioHint = Math.abs(ratio - 100) <= 3
      ? "与你的目标基本一致，照着吃就行"
      : `约为示例的 ${ratio}%，主食和加餐按比例增减`;
    const bar = (kcal, color) =>
      `<i style="width:${Math.round((kcal / total) * 100)}%;background:var(--chart-${color})"></i>`;

    const actOpts = [
      [1.2, "久坐（几乎不动）"], [1.375, "轻度（每周1-3练）"], [1.55, "中度（每周3-5练）"], [1.725, "高度（每周6-7练）"],
    ];

    return `
    <section>
      <div class="page-head">
        <div>
          <h1>饮食方案</h1>
          <p class="muted">瘦子增肌的铁律：练是刺激，吃才是原料。以下数值根据你的资料实时计算。</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="nutri-form">
          <div class="field">
            <label for="nf-gender">性别</label>
            <select id="nf-gender">
              <option value="male" ${profile.gender === "male" ? "selected" : ""}>男</option>
              <option value="female" ${profile.gender === "female" ? "selected" : ""}>女</option>
            </select>
          </div>
          <div class="field"><label for="nf-age">年龄</label><input id="nf-age" type="number" min="14" max="80" value="${profile.age}"></div>
          <div class="field"><label for="nf-height">身高 cm</label><input id="nf-height" type="number" min="120" max="230" value="${profile.height}"></div>
          <div class="field"><label for="nf-weight">当前体重 kg</label><input id="nf-weight" type="number" min="35" max="200" step="0.1" value="${profile.weight}"></div>
          <div class="field">
            <label for="nf-activity">活动量</label>
            <select id="nf-activity">
              ${actOpts.map(([v, t]) => `<option value="${v}" ${profile.activity === v ? "selected" : ""}>${t}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label for="nf-target">目标体重 kg</label><input id="nf-target" type="number" min="40" max="200" step="0.5" value="${profile.target}"></div>
        </div>
        <p class="muted2" style="font-size:12px;margin:10px 0 0">Mifflin-St Jeor 公式估算 BMR，仅供参考；实际以每周体重变化为准进行微调。</p>
      </div>

      <div class="kcal-grid" style="margin-bottom:14px">
        <div class="kcal-card"><div class="k">基础代谢 BMR</div><div class="num">${n.bmr}</div><div class="d">完全静息一天的消耗</div></div>
        <div class="kcal-card"><div class="k">总消耗 TDEE</div><div class="num">${n.tdee}</div><div class="d">基础代谢 × 活动系数</div></div>
        <div class="kcal-card"><div class="k">目标摄入（+350 盈余）</div><div class="num">${n.target}</div><div class="d">温和增肌，减少脂肪堆积</div></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="macro-wrap">
          ${donutSvg(n)}
          <div class="macro-rows">
            <div class="macro-row">
              <span class="m-name"><i style="background:var(--chart-p)"></i>蛋白质</span>
              <div class="m-bar">${bar(n.pKcal, "p")}</div>
              <span class="m-val">${n.protein}g · ${Math.round(n.pKcal / total * 100)}%</span>
            </div>
            <div class="macro-row">
              <span class="m-name"><i style="background:var(--chart-c)"></i>碳水化合物</span>
              <div class="m-bar">${bar(n.cKcal, "c")}</div>
              <span class="m-val">${n.carb}g · ${Math.round(n.cKcal / total * 100)}%</span>
            </div>
            <div class="macro-row">
              <span class="m-name"><i style="background:var(--chart-f)"></i>脂肪</span>
              <div class="m-bar">${bar(n.fKcal, "f")}</div>
              <span class="m-val">${n.fat}g · ${Math.round(n.fKcal / total * 100)}%</span>
            </div>
            <p class="muted" style="font-size:12.5px">蛋白质 2g/kg 体重 · 脂肪 1g/kg 体重 · 其余热量全部给碳水（训练的燃料）。</p>
          </div>
        </div>
      </div>

      <div class="section-title"><h2>初学者先做好这 3 步</h2><span class="sub">不要频繁改食谱，用体重趋势做决定</span></div>
      <div class="diet-step-grid">
        ${DIET_STEPS.map((step) => `
          <div class="diet-step">
            <span class="diet-step-no">${step.n}</span>
            <h3>${step.t}</h3>
            <p>${step.d}</p>
          </div>`).join("")}
      </div>

      <div class="section-title"><h2>最简单的吃法</h2><span class="sub">先做到，再逐步优化</span></div>
      <div class="grid grid-2 easy-meal-grid">
        ${EASY_MEAL_RULES.map((rule) => `
          <div class="card easy-meal-card"><h3>${rule.t}</h3><p>${rule.d}</p></div>
        `).join("")}
      </div>

      <div class="section-title"><h2>不用厨房秤：手掌分量法</h2><span class="sub">出门在外也能估个八九不离十 · 增重期在基数上「加」，不要减</span></div>
      <div class="principle-grid" style="margin-bottom:14px">
        ${PORTION_GUIDE.map((p) => `
          <div class="mini-card">
            <div class="ico">${p.ico}</div>
            <h4>${p.t}</h4>
            <p>${p.d}</p>
          </div>`).join("")}
      </div>

      <div class="section-title"><h2>一日食谱示例</h2><span class="sub">约 ${mealTotal} kcal · 你的目标 ${ratioHint}</span></div>
      <div class="card" style="margin-bottom:14px">
        <div class="meal-timeline">
          ${MEALS.map((m) => `
            <div class="meal-item">
              <div class="m-head"><h4>${m.time} · ${m.name}</h4><span class="tag tag-accent">${m.kcal}</span></div>
              <div class="m-items">${m.items}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="section-title"><h2>一周怎么轮着吃</h2><span class="sub">可直接整周照抄 · 周日晨起称重复盘</span></div>
      <div class="week-meal-grid" style="margin-bottom:14px">
        <div class="wm-head"><span></span><span>早餐</span><span>午餐</span><span>加餐</span><span>晚餐</span></div>
        ${WEEK_MEALS.map((d) => `
          <div class="week-meal-row">
            <div class="wm-day">${d.day}</div>
            <div><span class="wm-lbl">早餐</span>${d.breakfast}</div>
            <div><span class="wm-lbl">午餐</span>${d.lunch}</div>
            <div><span class="wm-lbl">加餐</span>${d.snack}</div>
            <div><span class="wm-lbl">晚餐</span>${d.dinner}</div>
          </div>`).join("")}
      </div>

      <div class="section-title"><h2>食材互换表</h2><span class="sub">同组可以互换 · 食谱里的每样食材都能换</span></div>
      <div class="swap-grid" style="margin-bottom:14px">
        ${FOOD_SWAPS.map((g) => `
          <div class="swap-card">
            <h3>${g.t}<span class="sw-note">${g.note}</span></h3>
            <div class="swap-tags">${g.items.map((i) => `<span class="tag">${i}</span>`).join("")}</div>
          </div>`).join("")}
      </div>

      <div class="section-title"><h2>外食生存指南</h2><span class="sub">食堂 / 外卖 / 聚餐 / 便利店 · 总热量优先</span></div>
      <div class="grid grid-2 easy-meal-grid" style="margin-bottom:14px">
        ${EATING_OUT.map((o) => `
          <div class="card easy-meal-card"><h3>${o.t}</h3><p>${o.d}</p></div>`).join("")}
      </div>

      <div class="section-title"><h2>瘦人增重技巧</h2><span class="sub">比「吃什么」更重要的事</span></div>
      <ul class="tip-list" style="margin-bottom:14px">
        ${TIPS.map((t) => `<li><span><b>${t.t}</b>：${t.d}</span></li>`).join("")}
      </ul>

      <div class="section-title"><h2>新手饮食误区</h2><span class="sub">先把这几个最常见的坑绕开</span></div>
      <div class="faq" style="margin-bottom:14px">
        ${DIET_FAQS.map((f) => `
          <details class="faq-item">
            <summary>${f.q}</summary>
            <div class="faq-body">${f.a}</div>
          </details>`).join("")}
      </div>

      <div class="section-title"><h2>补剂：理性看待</h2><span class="sub">没有一种补剂能替代训练和吃饭</span></div>
      <div class="sup-grid">
        ${SUPPLEMENTS.map((s) => `
          <div class="sup-card">
            <h4>${s.name}<span class="tag ${s.level === "推荐" ? "tag-accent" : s.level === "避坑" ? "tag-red" : ""}">${s.level}</span></h4>
            <p>${s.desc}</p>
          </div>`).join("")}
      </div>
    </section>`;
  }

  /* ================= 视图：追踪 ================= */
  function viewTracker() {
    const checkinRows = Array.from({ length: 16 }, (_, i) => {
      const w = i + 1;
      const p = phaseOf(w);
      const days = weekDays(w);
      const arr = checkins[w] || [];
      const dots = days.map((_, di) =>
        `<button class="ck-dot ${arr[di] ? "done" : ""}" data-check-week="${w}" data-check-idx="${di}" aria-label="第 ${w} 周第 ${di + 1} 练${arr[di] ? "，已完成" : "，未完成"}" aria-pressed="${!!arr[di]}" title="第${w}周 · 第${di + 1}练">${di + 1}</button>`
      ).join("");
      return `
      <div class="checkin-row" style="--pc:${p.color}">
        <div class="ck-week"><i></i>第 ${w} 周<small>${p.freq} · ${WEEK_BADGE[w] || p.sub.split(" ")[0]}</small></div>
        <div class="ck-dots">${dots}</div>
        <div class="ck-count"><b>${weekDone(w)}</b>/${days.length}</div>
      </div>`;
    }).join("");

    const gap = round1(profile.target - profile.weight);
    const done = doneTotal(), planned = plannedTotal();

    return `
    <section>
      <div class="page-head">
        <div>
          <h1>进度追踪</h1>
          <p class="muted">所有数据只存在你的浏览器里（localStorage），换设备请用导出备份。体重变化可在「饮食」页的资料里随时更新。</p>
        </div>
      </div>

      <div class="stat-mini-grid" style="margin-bottom:14px">
        <div class="stat-mini"><div class="num">${done}<small> / ${planned}</small></div><div class="lbl">已完成训练次数</div></div>
        <div class="stat-mini"><div class="num">${planned ? Math.round(done / planned * 100) : 0}<small>%</small></div><div class="lbl">16 周总完成率</div></div>
        <div class="stat-mini"><div class="num">${gap >= 0 ? "还需 +" : "已超 "}${Math.abs(gap)}<small>kg</small></div><div class="lbl">距离目标体重 ${profile.target}kg</div></div>
      </div>

      <div class="section-title"><h2>训练打卡</h2><span class="sub">点击圆点标记完成的训练日</span></div>
      <div class="checkin-list" style="margin-bottom:14px">${checkinRows}</div>

      <div class="section-title"><h2>数据管理</h2><span class="sub">数据仅在本地浏览器，清空不可恢复</span></div>
      <div class="card">
        <div class="data-btns">
          <button class="btn btn-ghost btn-sm" data-export>导出备份 (JSON)</button>
          <button class="btn btn-ghost btn-sm" data-import>导入备份</button>
          <button class="btn btn-danger btn-sm" data-clear>清空全部数据</button>
          <input type="file" id="import-file" accept="application/json,.json" hidden>
        </div>
      </div>
    </section>`;
  }

  /* ================= 路由与渲染 ================= */
  const routes = {
    home: viewHome,
    plan: viewPlan,
    exercises: viewExercises,
    nutrition: viewNutrition,
    tracker: viewTracker,
  };

  function currentRoute() {
    const h = location.hash.replace(/^#\/?/, "");
    return routes[h] ? h : "home";
  }

  function syncNav(route) {
    document.querySelectorAll("[data-route]").forEach((a) => {
      const active = a.dataset.route === route;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // 尊重系统「减少动态效果」设置：暂停动作演示循环动画
  function pauseFigAnimations() {
    if (!window.matchMedia || !matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll("svg.anim-fig").forEach((s) => {
      try { s.pauseAnimations(); } catch (e) { /* 忽略不支持 SMIL 控制的浏览器 */ }
    });
  }

  function render(keepScroll) {
    const y = window.scrollY;
    const route = currentRoute();
    app.innerHTML = routes[route]();
    syncNav(route);
    pauseFigAnimations();
    if (keepScroll) window.scrollTo(0, y);
    else window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", () => render(false));

  /* ================= 事件（全局委托） ================= */
  function toggleCheckin(week, idx) {
    if (!Number.isInteger(week) || week < 1 || week > 16 || !Number.isInteger(idx) || idx < 0 || idx >= weekDays(week).length) return;
    const arr = checkins[week] || [];
    arr[idx] = !arr[idx];
    checkins[week] = arr;
    save(KEY.checkins, checkins);
  }

  function setWeek(w) {
    selWeek = Math.min(Math.max(w, 1), 16);
    save(KEY.week, selWeek);
  }

  function updateProfileFromForm() {
    const get = (id) => document.getElementById(id);
    if (!get("nf-gender")) return;
    profile = normalizeProfile({
      gender: get("nf-gender").value,
      age: get("nf-age").value,
      height: get("nf-height").value,
      weight: get("nf-weight").value,
      activity: get("nf-activity").value,
      target: get("nf-target").value,
    });
    save(KEY.profile, profile);
  }

  document.addEventListener("click", (e) => {
    const t = e.target;

    // 首页阶段卡 → 跳到对应周
    const goto = t.closest("[data-goto-week]");
    if (goto) {
      setWeek(parseInt(goto.dataset.gotoWeek, 10));
      if (currentRoute() === "plan") { render(false); }
      return; // href="#plan" 负责跳转
    }

    // 月份标签
    const month = t.closest("[data-month]");
    if (month) {
      setWeek((parseInt(month.dataset.month, 10) - 1) * 4 + 1);
      render(false);
      return;
    }

    // 周选择
    const week = t.closest("[data-week]");
    if (week) {
      setWeek(parseInt(week.dataset.week, 10));
      render(true);
      return;
    }

    // 打卡（计划页 checkbox）
    const day = t.closest("[data-check-day]");
    if (day && day.type === "checkbox") {
      const idx = parseInt(day.dataset.checkDay, 10);
      toggleCheckin(selWeek, idx);
      render(true);
      return;
    }

    // 打卡（追踪页圆点）
    const dot = t.closest("[data-check-week]");
    if (dot) {
      toggleCheckin(parseInt(dot.dataset.checkWeek, 10), parseInt(dot.dataset.checkIdx, 10));
      render(true);
      return;
    }

    // 动作筛选
    const chip = t.closest("[data-exfilter]");
    if (chip) {
      exFilter = chip.dataset.exfilter;
      render(true);
      return;
    }

    // 置顶动作：视频 / 动图 切换（默认视频）
    const featToggle = t.closest("[data-feat-toggle]");
    if (featToggle) {
      const key = featToggle.dataset.featToggle;
      if (featAnimMode.has(key)) featAnimMode.delete(key);
      else featAnimMode.add(key);
      render(true);
      return;
    }

    // 主题切换
    if (t.closest("#theme-toggle")) {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
      return;
    }

    // 导出
    if (t.closest("[data-export]")) {
      const blob = new Blob([JSON.stringify({
        app: "boji", version: 1,
        profile, checkins, exportedAt: new Date().toISOString(),
      }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "boji-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
      return;
    }

    // 导入
    if (t.closest("[data-import]")) {
      document.getElementById("import-file").click();
      return;
    }

    // 清空
    if (t.closest("[data-clear]")) {
      if (confirm("确定清空全部数据（档案、打卡记录）？此操作不可恢复。")) {
        Object.values(KEY).forEach((k) => localStorage.removeItem(k));
        profile = Object.assign({}, PROFILE_DEFAULT);
        checkins = {};
        selWeek = 1;
        render(false);
      }
      return;
    }
  });

  // 输入时先持久化，避免切换页面前尚未触发 change 导致最后一次修改丢失。
  document.addEventListener("input", (e) => {
    if (e.target.id && e.target.id.startsWith("nf-")) updateProfileFromForm();
  });

  // 导入文件选择
  document.addEventListener("change", (e) => {
    // 饮食表单：任一输入变化 → 保存档案并重算
    if (e.target.id && e.target.id.startsWith("nf-")) {
      updateProfileFromForm();
      render(true);
      return;
    }

    // 导入备份文件
    if (e.target.id === "import-file") {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        alert("导入失败：备份文件不能超过 1 MB。");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || data.app !== "boji" || data.version !== 1) throw new Error("not a boji backup");
          profile = normalizeProfile(data.profile);
          checkins = normalizeCheckins(data.checkins);
          save(KEY.profile, profile);
          save(KEY.checkins, checkins);
          alert("导入成功 ✓");
          render(false);
        } catch (err) {
          alert("导入失败：不是有效的 BOJI 备份文件。");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  });

  /* ================= 启动 ================= */
  render(false);
})();
