/**
 * CHART.JS — The Angel of History
 * D3.js v7 rendering logic for both visualizations.
 *
 * Chart I:  Bubble scatter — Cumulative Patents (log) vs. Conflict Deaths (log)
 *           Each bubble = one armed conflict; size = duration; color = era
 *
 * Chart II: Connected scatter — Cumulative Patents (log) vs. Active Conflicts/Year
 *           Dashed segment = pre-UCDP estimates; solid = UCDP v25.1 data
 */

(function () {
  "use strict";

  // ============================================================
  // PALETTE & CONFIG
  // ============================================================
  const C = {
    bg:           "#0A0C10",
    bgChart:      "#0D1018",
    grid:         "#181C26",
    axis:         "#252A38",
    textPrimary:  "#E8E4D9",
    textSec:      "#8A8680",
    textMuted:    "#484540",
    gold:         "#C9A84C",
    crimson:      "#C24B50",
    steelBlue:    "#4A8EC9",
    // Era palette — conflicts
    eraTotal:     "#D9534F",   // 1900–1945: Age of Total War
    eraCold:      "#D97B2E",   // 1946–1991: Cold War
    eraPost:      "#4A8EC9",   // 1992–2024: Post-Cold War
    // Annotation lines
    treaty:       "#5B8DB8",
    invention:    "#C9A84C",
  };

  const MARGIN = { top: 54, right: 248, bottom: 86, left: 78 };
  const CHART_H1 = 580;
  const CHART_H2 = 490;

  // ============================================================
  // UTILITY — Cumulative patent lookup (binary search + lerp)
  // ============================================================
  function getPatentsForYear(year) {
    const d = PATENT_DATA;
    if (year <= d[0].year) return d[0].cumulative;
    if (year >= d[d.length - 1].year) return d[d.length - 1].cumulative;
    let lo = 0, hi = d.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (d[mid].year <= year) lo = mid; else hi = mid;
    }
    const t = (year - d[lo].year) / (d[hi].year - d[lo].year);
    return d[lo].cumulative + t * (d[hi].cumulative - d[lo].cumulative);
  }

  // Reverse: year from cumulative patents
  function getYearForPatents(cum) {
    const d = PATENT_DATA;
    if (cum <= d[0].cumulative) return d[0].year;
    if (cum >= d[d.length - 1].cumulative) return d[d.length - 1].year;
    for (let i = 0; i < d.length - 1; i++) {
      if (d[i].cumulative <= cum && d[i + 1].cumulative >= cum) {
        const t = (cum - d[i].cumulative) / (d[i + 1].cumulative - d[i].cumulative);
        return Math.round(d[i].year + t * (d[i + 1].year - d[i].year));
      }
    }
    return null;
  }

  function eraColor(year) {
    if (year <= 1945) return C.eraTotal;
    if (year <= 1991) return C.eraCold;
    return C.eraPost;
  }

  function fmtDeaths(n) {
    if (n >= 1e7) return (n / 1e6).toFixed(0) + "M";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e5) return (n / 1e3).toFixed(0) + "K";
    return (n / 1e3).toFixed(0) + "K";
  }

  function fmtPatents(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 10e6 ? 0 : 1) + "M";
    return (n / 1e3).toFixed(0) + "K";
  }

  // ============================================================
  // TOOLTIP
  // ============================================================
  const tip = document.getElementById("tooltip");

  function showTip(html, evt) {
    tip.innerHTML = html;
    tip.classList.add("visible");
    moveTip(evt);
  }
  function hideTip() { tip.classList.remove("visible"); }
  function moveTip(evt) {
    const W = 264, H = 160;
    let x = evt.clientX + 18, y = evt.clientY - H / 2;
    if (x + W > window.innerWidth)  x = evt.clientX - W - 18;
    if (y < 8) y = 8;
    if (y + H > window.innerHeight) y = window.innerHeight - H - 8;
    tip.style.left = x + "px";
    tip.style.top  = y + "px";
  }

  // ============================================================
  // SHARED: create SVG + clip path
  // ============================================================
  function mkSVG(id, totalH) {
    const el     = document.getElementById(id);
    const totalW = Math.max(el.clientWidth || 960, 820);
    const W      = totalW - MARGIN.left - MARGIN.right;
    const H      = totalH  - MARGIN.top  - MARGIN.bottom;

    const svg = d3.select(`#${id}`)
      .append("svg")
      .attr("width", totalW).attr("height", totalH)
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("role", "img");

    svg.append("defs").append("clipPath").attr("id", `clip-${id}`)
      .append("rect").attr("width", W).attr("height", H);

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    return { svg, g, W, H, totalW, totalH };
  }

  // ============================================================
  // SHARED: gridlines
  // ============================================================
  function drawGrid(g, xScale, yScale, W, H, xTicks, yTicks) {
    yTicks.forEach(v => {
      const y = yScale(v);
      if (isNaN(y)) return;
      g.append("line")
        .attr("x1", 0).attr("x2", W)
        .attr("y1", y).attr("y2", y)
        .attr("stroke", C.grid).attr("stroke-width", 1);
    });
    xTicks.forEach(v => {
      const x = xScale(v);
      if (isNaN(x)) return;
      g.append("line")
        .attr("x1", x).attr("x2", x)
        .attr("y1", 0).attr("y2", H)
        .attr("stroke", C.grid).attr("stroke-width", 1);
    });
  }

  // ============================================================
  // SHARED: annotation lines (treaties & inventions)
  // ============================================================
  const SHOW_TREATIES    = new Set([1919, 1945, 1949, 1968, 1987, 1998]);
  const SHOW_INVENTIONS  = new Set([1903, 1945, 1947, 1969, 1991, 2007, 2022]);

  function drawAnnotations(g, xScale, H) {
    const items = [
      ...TREATIES.filter(t => SHOW_TREATIES.has(t.year)).map(t => ({ ...t, kind: "treaty" })),
      ...INVENTIONS.filter(i => SHOW_INVENTIONS.has(i.year)).map(i => ({ ...i, kind: "invention" })),
    ];

    // De-duplicate year=1945 (both atomic bomb AND UN Charter) — merge labels
    const seen = new Map();
    items.forEach(item => {
      const x = xScale(getPatentsForYear(item.year));
      if (isNaN(x) || x < 0 || x > xScale.range()[1]) return;
      const key = item.year;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(item);
    });

    seen.forEach((group, year) => {
      const patents = getPatentsForYear(year);
      const x = xScale(patents);
      // Choose color based on whether any in group are treaty
      const hasTreaty    = group.some(i => i.kind === "treaty");
      const hasInvention = group.some(i => i.kind === "invention");
      const color = (hasTreaty && hasInvention) ? C.gold :
                    hasTreaty ? C.treaty : C.invention;

      g.append("line")
        .attr("x1", x).attr("x2", x)
        .attr("y1", 0).attr("y2", H)
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", hasTreaty ? "4,4" : "2,4")
        .attr("opacity", 0.55);

      const label = group.map(i => i.short || i.name).join(" / ");
      g.append("text")
        .attr("x", x + 3).attr("y", 6)
        .attr("writing-mode", "vertical-rl")
        .attr("text-anchor", "start")
        .attr("fill", color)
        .attr("font-size", "8.5px")
        .attr("font-family", "Inter, sans-serif")
        .attr("opacity", 0.8)
        .text(`${year}: ${label}`);
    });
  }

  // ============================================================
  // SHARED: X-axis (patents + year secondary labels)
  // ============================================================
  const X_TICKS = [5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7];

  function drawXAxis(g, xScale, H) {
    const xAxis = d3.axisBottom(xScale)
      .tickValues(X_TICKS)
      .tickFormat(v => fmtPatents(v));

    const ax = g.append("g").attr("transform", `translate(0,${H})`).call(xAxis);
    ax.select(".domain").attr("stroke", C.axis);
    ax.selectAll(".tick line").attr("stroke", C.axis);
    ax.selectAll(".tick text")
      .attr("fill", C.textSec).attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif");

    // Year labels below
    X_TICKS.forEach(v => {
      const x = xScale(v);
      const yr = getYearForPatents(v);
      if (!yr || isNaN(x)) return;
      g.append("text")
        .attr("x", x).attr("y", H + 44)
        .attr("text-anchor", "middle")
        .attr("fill", C.textMuted)
        .attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif")
        .text(`≈ ${yr}`);
    });

    g.append("text")
      .attr("x", xScale.range()[1] / 2).attr("y", H + 68)
      .attr("text-anchor", "middle")
      .attr("fill", C.textSec)
      .attr("font-size", "11px").attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text("Cumulative Global Patent Registrations (USPTO, log scale) →");
  }

  // ============================================================
  // CHART I — Bubble Scatter: Patents vs. Conflict Deaths
  // ============================================================
  function buildChart1() {
    const { svg, g, W, H } = mkSVG("chart1", CHART_H1);

    // Augment conflict data
    const data = CONFLICTS.map(c => {
      const mid = (c.startYear + c.endYear) / 2;
      return { ...c, mid, cum: getPatentsForYear(mid), dur: c.endYear - c.startYear + 1 };
    }).filter(d => d.deaths > 0 && d.cum > 0);

    // Scales
    const xScale = d3.scaleLog().domain([4e5, 8e7]).range([0, W]).clamp(true);
    const yScale = d3.scaleLog().domain([8000, 2.5e8]).range([H, 0]).clamp(true);
    const rScale = d3.scaleSqrt().domain([1, 60]).range([5, 32]);

    // Grid
    drawGrid(g, xScale, yScale, W, H,
      [5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7],
      [1e4, 1e5, 1e6, 1e7, 1e8]);

    // Annotation lines
    drawAnnotations(g, xScale, H);

    // Y-axis
    const yAxis = d3.axisLeft(yScale)
      .tickValues([1e4, 1e5, 1e6, 1e7, 1e8])
      .tickFormat(v => fmtDeaths(v));
    const ya = g.append("g").call(yAxis);
    ya.select(".domain").attr("stroke", C.axis);
    ya.selectAll(".tick line").attr("stroke", C.axis);
    ya.selectAll(".tick text")
      .attr("fill", C.textSec).attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2).attr("y", -60)
      .attr("text-anchor", "middle")
      .attr("fill", C.textSec)
      .attr("font-size", "11px").attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text("← Estimated Total Deaths (log scale)");

    // X-axis
    drawXAxis(g, xScale, H);

    // Bubbles — draw in order (big → small) so small ones are on top
    const sorted = [...data].sort((a, b) => b.deaths - a.deaths);

    sorted.forEach(d => {
      const cx = xScale(d.cum);
      const cy = yScale(d.deaths);
      const r  = rScale(d.dur);
      const col = eraColor(d.mid);
      if (isNaN(cx) || isNaN(cy)) return;

      const circle = g.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", r)
        .attr("fill", col).attr("fill-opacity", 0.55)
        .attr("stroke", col).attr("stroke-width", 1.2).attr("stroke-opacity", 0.85)
        .attr("cursor", "pointer");

      circle
        .on("mouseover", function (evt) {
          d3.select(this).attr("fill-opacity", 0.88).attr("stroke-width", 2.2);
          showTip(
            `<div class="tt-name">${d.name}</div>` +
            `<div class="tt-years">${d.startYear}–${d.endYear} · ${d.dur} yr${d.dur > 1 ? "s" : ""}</div>` +
            `<div class="tt-row"><span>Deaths (est.)</span><span class="tt-val">${fmtDeaths(d.deaths)}</span></div>` +
            `<div class="tt-row"><span>Type</span><span class="tt-val">${d.type}</span></div>` +
            `<div class="tt-row"><span>Patents at midpoint</span><span class="tt-val">${fmtPatents(d.cum)}</span></div>` +
            (d.range ? `<div class="tt-row"><span>Death range</span><span class="tt-val">${fmtDeaths(d.range[0])}–${fmtDeaths(d.range[1])}</span></div>` : ""),
            evt
          );
        })
        .on("mousemove", moveTip)
        .on("mouseout", function () {
          d3.select(this).attr("fill-opacity", 0.55).attr("stroke-width", 1.2);
          hideTip();
        });
    });

    // Labels for key conflicts
    const LABELED = new Set([
      "World War I", "World War II", "Korean War", "Vietnam War",
      "Rwandan Genocide", "Syrian Civil War", "Soviet-Afghan War",
      "Iran-Iraq War", "Nigerian Civil War (Biafra)", "Second Congo War",
      "Russo-Ukrainian War"
    ]);

    data.filter(d => LABELED.has(d.name)).forEach(d => {
      const cx = xScale(d.cum), cy = yScale(d.deaths), r = rScale(d.dur);
      if (isNaN(cx) || isNaN(cy)) return;
      // Offset label to avoid bubble overlap
      const lx = cx + r + 5;
      const ly = cy + 3.5;
      g.append("text")
        .attr("x", lx).attr("y", ly)
        .attr("fill", C.textSec)
        .attr("font-size", "9.5px").attr("font-family", "Inter, sans-serif")
        .attr("pointer-events", "none")
        .text(d.name);
    });

    // ---- Right-hand legend panel ----
    const LX = MARGIN.left + W + 20;
    const LY = MARGIN.top;

    function addLegendSection(svg, x, y, title, items) {
      svg.append("text").attr("x", x).attr("y", y)
        .attr("fill", C.textSec)
        .attr("font-size", "9.5px").attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "600").attr("letter-spacing", "0.1em")
        .text(title);
      items.forEach((item, i) => {
        const iy = y + 18 + i * 22;
        if (item.circle) {
          svg.append("circle").attr("cx", x + 7).attr("cy", iy + 4)
            .attr("r", 7).attr("fill", item.color).attr("fill-opacity", 0.6)
            .attr("stroke", item.color).attr("stroke-width", 1);
        } else if (item.line) {
          svg.append("line")
            .attr("x1", x).attr("x2", x + 20).attr("y1", iy + 6).attr("y2", iy + 6)
            .attr("stroke", item.color).attr("stroke-width", 1.5)
            .attr("stroke-dasharray", item.dash || "none").attr("opacity", 0.8);
        }
        svg.append("text").attr("x", x + (item.circle ? 18 : 26)).attr("y", iy + 9)
          .attr("fill", C.textSec).attr("font-size", "9px")
          .attr("font-family", "Inter, sans-serif").text(item.label);
      });
      return y + 20 + items.length * 22 + 16;
    }

    let ly = LY;
    ly = addLegendSection(svg, LX, ly, "ERA", [
      { circle: true, color: C.eraTotal, label: "Age of Total War (1900–1945)" },
      { circle: true, color: C.eraCold,  label: "Cold War (1946–1991)" },
      { circle: true, color: C.eraPost,  label: "Post-Cold War (1992–2024)" },
    ]);
    ly = addLegendSection(svg, LX, ly, "MARKERS", [
      { line: true, color: C.treaty,    dash: "4,4", label: "Peace treaty / accord" },
      { line: true, color: C.invention, dash: "2,4", label: "Major invention" },
    ]);
    ly = addLegendSection(svg, LX, ly, "CIRCLE SIZE", [
      { label: "= Conflict duration" },
    ]);
    [1, 10, 30].forEach((yrs, i) => {
      const r = rScale(yrs);
      const ry = ly + i * 28;
      svg.append("circle")
        .attr("cx", LX + 20).attr("cy", ry).attr("r", r)
        .attr("fill", "none").attr("stroke", C.textMuted).attr("stroke-width", 1);
      svg.append("text").attr("x", LX + 36).attr("y", ry + 4)
        .attr("fill", C.textMuted).attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif")
        .text(`${yrs} yr${yrs > 1 ? "s" : ""}`);
    });

    // Trend annotation arrow
    g.append("text")
      .attr("x", W * 0.62).attr("y", H * 0.24)
      .attr("fill", C.textMuted).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif").attr("font-style", "italic")
      .text("Individual conflicts");
    g.append("text")
      .attr("x", W * 0.62).attr("y", H * 0.24 + 14)
      .attr("fill", C.textMuted).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif").attr("font-style", "italic")
      .text("trend less deadly →");
  }


  // ============================================================
  // CHART II — Active Conflicts vs. Cumulative Patents
  // ============================================================
  function buildChart2() {
    const { svg, g, W, H } = mkSVG("chart2", CHART_H2);

    // Map each year's conflict count to cumulative patents
    const allData = ACTIVE_CONFLICTS.map(d => ({
      ...d,
      cum: getPatentsForYear(d.year),
    })).filter(d => d.cum > 0).sort((a, b) => a.year - b.year);

    const estimated = allData.filter(d => d.estimated);
    const verified  = allData.filter(d => !d.estimated);

    // Scales
    const xScale = d3.scaleLog().domain([4e5, 8e7]).range([0, W]).clamp(true);
    const yMax   = d3.max(allData, d => d.count);
    const yScale = d3.scaleLinear().domain([0, yMax * 1.12]).range([H, 0]);

    // Grid
    drawGrid(g, xScale, yScale, W, H,
      [5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7],
      [0, 10, 20, 30, 40, 50, 60, 70]);

    // Annotation lines
    drawAnnotations(g, xScale, H);

    // Shaded area — estimated portion
    const areaEst = d3.area()
      .x(d => xScale(d.cum)).y0(H).y1(d => yScale(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5));
    g.append("path").datum(estimated).attr("d", areaEst)
      .attr("fill", C.crimson).attr("fill-opacity", 0.04);

    // Shaded area — UCDP verified portion
    const areaVer = d3.area()
      .x(d => xScale(d.cum)).y0(H).y1(d => yScale(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5));
    g.append("path").datum(verified).attr("d", areaVer)
      .attr("fill", C.crimson).attr("fill-opacity", 0.09);

    // Line — estimated (dashed)
    const lineEst = d3.line()
      .x(d => xScale(d.cum)).y(d => yScale(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5));
    g.append("path").datum(estimated).attr("d", lineEst)
      .attr("fill", "none")
      .attr("stroke", C.crimson).attr("stroke-width", 1.6)
      .attr("stroke-dasharray", "4,4").attr("stroke-opacity", 0.55);

    // Line — UCDP verified (solid)
    const lineVer = d3.line()
      .x(d => xScale(d.cum)).y(d => yScale(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5));
    g.append("path").datum(verified).attr("d", lineVer)
      .attr("fill", "none")
      .attr("stroke", C.crimson).attr("stroke-width", 2)
      .attr("stroke-opacity", 0.85);

    // Connector between estimated and verified at 1946
    const lastEst  = estimated[estimated.length - 1];
    const firstVer = verified[0];
    if (lastEst && firstVer) {
      g.append("line")
        .attr("x1", xScale(lastEst.cum)).attr("x2", xScale(firstVer.cum))
        .attr("y1", yScale(lastEst.count)).attr("y2", yScale(firstVer.count))
        .attr("stroke", C.crimson).attr("stroke-width", 1.6)
        .attr("stroke-dasharray", "2,4").attr("stroke-opacity", 0.5);
    }

    // Invisible hit-area dots for interaction
    g.selectAll(".hit-dot").data(allData).enter()
      .append("circle").attr("class", "hit-dot")
      .attr("cx", d => xScale(d.cum)).attr("cy", d => yScale(d.count))
      .attr("r", 6).attr("fill", "transparent")
      .on("mouseover", (evt, d) => {
        showTip(
          `<div class="tt-name">${d.year}</div>` +
          `<div class="tt-years">${d.estimated ? "Pre-UCDP estimate (CoW)" : "UCDP/PRIO ACD v25.1"}</div>` +
          `<div class="tt-row"><span>Active conflicts</span><span class="tt-val">${d.count}</span></div>` +
          `<div class="tt-row"><span>Cumul. patents</span><span class="tt-val">${fmtPatents(d.cum)}</span></div>`,
          evt
        );
      })
      .on("mousemove", moveTip)
      .on("mouseout", hideTip);

    // Key year callout dots
    const KEY_YEARS = new Set([1918, 1945, 1992, 2010, 2024]);
    allData.filter(d => KEY_YEARS.has(d.year)).forEach(d => {
      const cx = xScale(d.cum), cy = yScale(d.count);
      if (isNaN(cx) || isNaN(cy)) return;
      g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 4)
        .attr("fill", C.crimson).attr("stroke", C.bg).attr("stroke-width", 1.5);
      const offset = d.year === 1992 ? [-4, -14] : [6, -10];
      g.append("text")
        .attr("x", cx + offset[0]).attr("y", cy + offset[1])
        .attr("text-anchor", d.year === 1992 ? "middle" : "start")
        .attr("fill", C.textSec).attr("font-size", "9.5px")
        .attr("font-family", "Inter, sans-serif")
        .text(`${d.year} (${d.count})`);
    });

    // Y-axis
    const yAxis = d3.axisLeft(yScale).tickValues([0, 10, 20, 30, 40, 50, 60, 70]);
    const ya = g.append("g").call(yAxis);
    ya.select(".domain").attr("stroke", C.axis);
    ya.selectAll(".tick line").attr("stroke", C.axis);
    ya.selectAll(".tick text")
      .attr("fill", C.textSec).attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2).attr("y", -58)
      .attr("text-anchor", "middle")
      .attr("fill", C.textSec)
      .attr("font-size", "11px").attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text("← Active Armed Conflicts (per year)");

    // X-axis
    drawXAxis(g, xScale, H);

    // ---- Right-hand legend ----
    const LX = MARGIN.left + W + 20;
    const LY = MARGIN.top;
    svg.append("text").attr("x", LX).attr("y", LY)
      .attr("fill", C.textSec).attr("font-size", "9.5px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600").attr("letter-spacing", "0.1em").text("DATA");

    [{
      label: "UCDP/PRIO ACD v25.1 (1946–2024)",
      dash: "none", opacity: 0.85,
    }, {
      label: "Pre-1946 CoW estimates",
      dash: "4,4", opacity: 0.55,
    }].forEach((item, i) => {
      const iy = LY + 20 + i * 24;
      svg.append("line")
        .attr("x1", LX).attr("x2", LX + 22).attr("y1", iy + 6).attr("y2", iy + 6)
        .attr("stroke", C.crimson).attr("stroke-width", 2)
        .attr("stroke-dasharray", item.dash).attr("stroke-opacity", item.opacity);
      svg.append("text").attr("x", LX + 28).attr("y", iy + 10)
        .attr("fill", C.textSec).attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif").text(item.label);
    });

    svg.append("text").attr("x", LX).attr("y", LY + 82)
      .attr("fill", C.textSec).attr("font-size", "9.5px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600").attr("letter-spacing", "0.1em").text("MARKERS");

    [{
      label: "Peace treaty / accord", color: C.treaty, dash: "4,4",
    }, {
      label: "Major invention", color: C.invention, dash: "2,4",
    }].forEach((item, i) => {
      const iy = LY + 100 + i * 22;
      svg.append("line")
        .attr("x1", LX).attr("x2", LX + 20).attr("y1", iy + 6).attr("y2", iy + 6)
        .attr("stroke", item.color).attr("stroke-width", 1.5)
        .attr("stroke-dasharray", item.dash).attr("opacity", 0.8);
      svg.append("text").attr("x", LX + 26).attr("y", iy + 10)
        .attr("fill", C.textSec).attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif").text(item.label);
    });

    // 2024 record annotation
    const last = allData[allData.length - 1];
    if (last) {
      const cx = xScale(last.cum), cy = yScale(last.count);
      g.append("line")
        .attr("x1", cx - 40).attr("x2", cx - 8)
        .attr("y1", cy - 18).attr("y2", cy - 5)
        .attr("stroke", C.textMuted).attr("stroke-width", 0.8);
      g.append("text")
        .attr("x", cx - 44).attr("y", cy - 22)
        .attr("text-anchor", "end")
        .attr("fill", C.textSec).attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif").attr("font-style", "italic")
        .text("Record high: 61 conflicts (2024)");
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      buildChart1();
      buildChart2();
    });
  } else {
    buildChart1();
    buildChart2();
  }

})();
