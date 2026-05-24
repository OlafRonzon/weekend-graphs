/**
 * CHART.JS — The Angel of History (v2 — cleaned for publication)
 * D3.js v7 rendering logic for both visualizations.
 *
 * Improvements in v2:
 *  - Fewer annotation lines (4 key markers only, larger labels)
 *  - Conflict labels reduced to 7 iconic conflicts + Gaza + Ukraine
 *  - Larger axis/tick fonts for readability
 *  - Bold trend arrow on Chart I
 *  - Gold "insight" callout box below each chart
 *  - More internal whitespace throughout
 */

(function () {
  "use strict";

  // ============================================================
  // PALETTE & CONFIG
  // ============================================================
  const C = {
    bg:          "#0A0C10",
    grid:        "#16192280",
    axis:        "#252A38",
    textPrimary: "#E8E4D9",
    textSec:     "#8A8680",
    textMuted:   "#484540",
    gold:        "#C9A84C",
    crimson:     "#C24B50",
    // Era palette
    eraTotal:    "#D9534F",   // 1900–1945
    eraCold:     "#D97B2E",   // 1946–1991
    eraPost:     "#4A8EC9",   // 1992–2024
    // Annotation
    treaty:      "#5B8DB8",
    invention:   "#C9A84C",
  };

  const MARGIN  = { top: 60, right: 220, bottom: 96, left: 86 };
  const CHART_H1 = 620;
  const CHART_H2 = 520;

  // ============================================================
  // UTILITY — Patent lookups
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
    const W = 270, H = 180;
    let x = evt.clientX + 18, y = evt.clientY - H / 2;
    if (x + W > window.innerWidth)  x = evt.clientX - W - 18;
    if (y < 8) y = 8;
    if (y + H > window.innerHeight) y = window.innerHeight - H - 8;
    tip.style.left = x + "px";
    tip.style.top  = y + "px";
  }

  // ============================================================
  // SVG factory
  // ============================================================
  function mkSVG(id, totalH) {
    const el     = document.getElementById(id);
    const totalW = Math.max(el.clientWidth || 980, 840);
    const W      = totalW - MARGIN.left - MARGIN.right;
    const H      = totalH - MARGIN.top  - MARGIN.bottom;

    const svg = d3.select(`#${id}`)
      .append("svg")
      .attr("width", totalW).attr("height", totalH)
      .attr("viewBox", `0 0 ${totalW} ${totalH}`)
      .attr("role", "img");

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
        .attr("x1", 0).attr("x2", W).attr("y1", y).attr("y2", y)
        .attr("stroke", C.grid).attr("stroke-width", 1);
    });
    xTicks.forEach(v => {
      const x = xScale(v);
      if (isNaN(x)) return;
      g.append("line")
        .attr("x1", x).attr("x2", x).attr("y1", 0).attr("y2", H)
        .attr("stroke", C.grid).attr("stroke-width", 1);
    });
  }

  // ============================================================
  // SHARED: annotation lines — REDUCED to 4 key markers only
  // Labelled with larger text outside the plot area (top)
  // ============================================================
  const KEY_ANNOTATIONS = [
    { year: 1914, label: "WWI begins",    kind: "event",    color: C.eraTotal },
    { year: 1939, label: "WWII begins",   kind: "event",    color: C.eraTotal },
    { year: 1945, label: "UN Charter",    kind: "treaty",   color: C.treaty   },
    { year: 1991, label: "Cold War ends", kind: "event",    color: C.eraCold  },
  ];

  function drawAnnotations(g, xScale, H) {
    KEY_ANNOTATIONS.forEach(ann => {
      const x = xScale(getPatentsForYear(ann.year));
      if (isNaN(x) || x < 0 || x > xScale.range()[1]) return;

      // Vertical line
      g.append("line")
        .attr("x1", x).attr("x2", x)
        .attr("y1", 0).attr("y2", H)
        .attr("stroke", ann.color)
        .attr("stroke-width", 1.2)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.45);

      // Label at top — horizontal, readable
      const labelG = g.append("g").attr("transform", `translate(${x + 5}, 8)`);
      labelG.append("text")
        .attr("fill", ann.color)
        .attr("font-size", "11px")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "500")
        .attr("opacity", 0.85)
        .text(`${ann.year}`);
      labelG.append("text")
        .attr("y", 14)
        .attr("fill", ann.color)
        .attr("font-size", "9.5px")
        .attr("font-family", "Inter, sans-serif")
        .attr("opacity", 0.65)
        .text(ann.label);
    });
  }

  // ============================================================
  // SHARED: X-axis
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
      .attr("fill", C.textSec).attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif");

    // Year labels below patent ticks
    X_TICKS.forEach(v => {
      const x   = xScale(v);
      const yr  = getYearForPatents(v);
      if (!yr || isNaN(x)) return;
      g.append("text")
        .attr("x", x).attr("y", H + 46)
        .attr("text-anchor", "middle")
        .attr("fill", C.textMuted)
        .attr("font-size", "10px")
        .attr("font-family", "Inter, sans-serif")
        .text(`≈ ${yr}`);
    });

    // Axis label
    g.append("text")
      .attr("x", xScale.range()[1] / 2).attr("y", H + 74)
      .attr("text-anchor", "middle")
      .attr("fill", C.textSec)
      .attr("font-size", "12px").attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text("Cumulative USPTO Patent Registrations (log scale) →");
  }

  // ============================================================
  // INSIGHT BOX — gold callout sentence below a chart
  // ============================================================
  function drawInsightBox(container, text) {
    const box = document.createElement("div");
    box.className = "insight-box";
    box.innerHTML = `<span class="insight-icon">↳</span> ${text}`;
    container.appendChild(box);
  }

  // ============================================================
  // CHART I — Bubble Scatter: Patents vs. Conflict Deaths
  // ============================================================
  function buildChart1() {
    const { svg, g, W, H, totalW } = mkSVG("chart1", CHART_H1);

    // Augment conflict data with midpoint and cumulative patents
    const data = CONFLICTS.map(c => {
      const mid = (c.startYear + c.endYear) / 2;
      return { ...c, mid, cum: getPatentsForYear(mid), dur: c.endYear - c.startYear + 1 };
    }).filter(d => d.deaths > 0 && d.cum > 0);

    // Scales
    const xScale = d3.scaleLog().domain([4e5, 8e7]).range([0, W]).clamp(true);
    const yScale = d3.scaleLog().domain([8000, 2.5e8]).range([H, 0]).clamp(true);
    const rScale = d3.scaleSqrt().domain([1, 60]).range([6, 34]);

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
      .attr("fill", C.textSec).attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2).attr("y", -64)
      .attr("text-anchor", "middle")
      .attr("fill", C.textSec)
      .attr("font-size", "12px").attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text("← Estimated Total Deaths (log scale)");

    // X-axis
    drawXAxis(g, xScale, H);

    // === BUBBLES — large first so small sit on top ===
    const sorted = [...data].sort((a, b) => b.deaths - a.deaths);

    sorted.forEach(d => {
      const cx  = xScale(d.cum);
      const cy  = yScale(d.deaths);
      const r   = rScale(d.dur);
      const col = eraColor(d.mid);
      if (isNaN(cx) || isNaN(cy)) return;

      g.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", r)
        .attr("fill", col).attr("fill-opacity", 0.5)
        .attr("stroke", col).attr("stroke-width", 1.4).attr("stroke-opacity", 0.9)
        .attr("cursor", "pointer")
        .on("mouseover", function (evt) {
          d3.select(this).attr("fill-opacity", 0.88).attr("stroke-width", 2.5);
          showTip(
            `<div class="tt-name">${d.name}</div>` +
            `<div class="tt-years">${d.startYear}–${d.endYear} · ${d.dur} yr${d.dur > 1 ? "s" : ""}</div>` +
            `<div class="tt-row"><span>Deaths (est.)</span><span class="tt-val">${fmtDeaths(d.deaths)}</span></div>` +
            `<div class="tt-row"><span>Type</span><span class="tt-val">${d.type}</span></div>` +
            `<div class="tt-row"><span>Patents at midpoint</span><span class="tt-val">${fmtPatents(d.cum)}</span></div>` +
            (d.range ? `<div class="tt-row"><span>Scholarly range</span><span class="tt-val">${fmtDeaths(d.range[0])}–${fmtDeaths(d.range[1])}</span></div>` : "") +
            (d.notes ? `<div class="tt-note">${d.notes}</div>` : ""),
            evt
          );
        })
        .on("mousemove", moveTip)
        .on("mouseout", function () {
          d3.select(this).attr("fill-opacity", 0.5).attr("stroke-width", 1.4);
          hideTip();
        });
    });

    // === LABELS — vertical, rotated -90°, above each bubble ===
    // Vertical labels breathe without crowding horizontal space.
    const LABELED = new Set([
      "World War I", "World War II", "Vietnam War",
      "Rwandan Genocide", "Syrian Civil War",
      "Gaza War", "Russo-Ukrainian War",
    ]);

    data.filter(d => LABELED.has(d.name)).forEach(d => {
      const cx = xScale(d.cum);
      const cy = yScale(d.deaths);
      const r  = rScale(d.dur);
      if (isNaN(cx) || isNaN(cy)) return;

      // Small tick connector from bubble edge upward
      const tickTop = cy - r - 6;
      g.append("line")
        .attr("x1", cx).attr("x2", cx)
        .attr("y1", cy - r).attr("y2", tickTop)
        .attr("stroke", C.textMuted).attr("stroke-width", 0.8)
        .attr("pointer-events", "none");

      // Label anchored at top of tick, rotated -90deg (reads bottom-to-top)
      g.append("text")
        .attr("x", cx)
        .attr("y", tickTop - 2)
        .attr("text-anchor", "start")
        .attr("fill", C.textSec)
        .attr("font-size", "10.5px").attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "400")
        .attr("pointer-events", "none")
        .attr("transform", `rotate(-90, ${cx}, ${tickTop - 2})`)
        .text(d.name);
    });

    // === TREND ARROW — straight diagonal, upper-left → lower-right ===
    // In this chart: upper-left = high deaths + few patents (early wars)
    //                lower-right = low deaths + many patents (recent wars)
    // So the arrow correctly illustrates the downward lethality trend.
    const ax1 = W * 0.10, ay1 = H * 0.18;  // near WWII cluster
    const ax2 = W * 0.82, ay2 = H * 0.78;  // near recent small conflicts

    // Define arrowhead marker properly in its own defs block
    svg.append("defs")
      .append("marker")
      .attr("id", "arrowhead-trend")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 9).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L10,0L0,4Z")
      .attr("fill", C.textMuted);

    // Straight dashed line with arrowhead at the lower-right end
    g.append("line")
      .attr("x1", ax1).attr("y1", ay1)
      .attr("x2", ax2).attr("y2", ay2)
      .attr("stroke", C.textMuted)
      .attr("stroke-width", 1.4)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.5)
      .attr("marker-end", "url(#arrowhead-trend)");

    // Label parallel to and above the trend line
    // Angle of line in degrees (SVG coords: Y increases downward)
    const angleDeg = Math.atan2(ay2 - ay1, ax2 - ax1) * 180 / Math.PI;
    const midX = (ax1 + ax2) / 2;
    const midY = (ay1 + ay2) / 2;
    g.append("text")
      .attr("x", midX)
      .attr("y", midY - 10)  // offset above the line
      .attr("text-anchor", "middle")
      .attr("fill", C.textMuted)
      .attr("font-size", "11px").attr("font-family", "Inter, sans-serif")
      .attr("font-style", "italic")
      .attr("pointer-events", "none")
      .attr("transform", `rotate(${angleDeg}, ${midX}, ${midY - 10})`)
      .text("conflicts trend less lethal");

    // === LEGEND (right panel) ===
    const LX = MARGIN.left + W + 18;
    let ly = MARGIN.top + 10;

    // Era
    svg.append("text").attr("x", LX).attr("y", ly)
      .attr("fill", C.textSec).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "700").attr("letter-spacing", "0.12em").text("ERA");
    ly += 4;

    [
      { color: C.eraTotal, label: "Age of Total War" },
      { color: C.eraTotal, label: "(1900–1945)" },
      { color: C.eraCold,  label: "Cold War (1946–1991)" },
      { color: C.eraPost,  label: "Post-Cold War (1992–2024)" },
    ].reduce((acc, item) => {
      if (item.label.startsWith("(")) {
        // sub-label, no dot
        svg.append("text").attr("x", LX + 20).attr("y", acc + 10)
          .attr("fill", C.textMuted).attr("font-size", "9px")
          .attr("font-family", "Inter, sans-serif").text(item.label);
        return acc + 12;
      }
      acc += 22;
      svg.append("circle").attr("cx", LX + 8).attr("cy", acc - 5)
        .attr("r", 7).attr("fill", item.color).attr("fill-opacity", 0.55)
        .attr("stroke", item.color).attr("stroke-width", 1);
      svg.append("text").attr("x", LX + 20).attr("y", acc)
        .attr("fill", C.textSec).attr("font-size", "10px")
        .attr("font-family", "Inter, sans-serif").text(item.label);
      return acc;
    }, ly);

    ly += 90;

    svg.append("text").attr("x", LX).attr("y", ly)
      .attr("fill", C.textSec).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "700").attr("letter-spacing", "0.12em").text("CIRCLE SIZE");
    ly += 18;
    svg.append("text").attr("x", LX).attr("y", ly)
      .attr("fill", C.textMuted).attr("font-size", "9.5px")
      .attr("font-family", "Inter, sans-serif").text("= conflict duration");
    ly += 12;

    [1, 10, 30].forEach((yrs, i) => {
      const r  = rScale(yrs);
      const ry = ly + i * 34 + 10;
      svg.append("circle").attr("cx", LX + 18).attr("cy", ry)
        .attr("r", r).attr("fill", "none")
        .attr("stroke", C.textMuted).attr("stroke-width", 1);
      svg.append("text").attr("x", LX + 36).attr("y", ry + 4)
        .attr("fill", C.textMuted).attr("font-size", "9.5px")
        .attr("font-family", "Inter, sans-serif")
        .text(`${yrs} yr${yrs > 1 ? "s" : ""}`);
    });

    // Insight box injected into the DOM after the chart
    const section = document.getElementById("section-chart1");
    drawInsightBox(section,
      "Individual conflicts have become dramatically less lethal since 1945 — " +
      "but this is only half the story. Hover any circle to explore."
    );
  }


  // ============================================================
  // CHART II — Active Conflicts vs. Cumulative Patents
  // ============================================================
  function buildChart2() {
    const { svg, g, W, H } = mkSVG("chart2", CHART_H2);

    const allData = ACTIVE_CONFLICTS.map(d => ({
      ...d, cum: getPatentsForYear(d.year),
    })).filter(d => d.cum > 0).sort((a, b) => a.year - b.year);

    const estimated = allData.filter(d => d.estimated);
    const verified  = allData.filter(d => !d.estimated);

    // Scales
    const xScale = d3.scaleLog().domain([4e5, 8e7]).range([0, W]).clamp(true);
    const yMax   = d3.max(allData, d => d.count);
    const yScale = d3.scaleLinear().domain([0, yMax * 1.14]).range([H, 0]);

    // Grid
    drawGrid(g, xScale, yScale, W, H,
      [5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7],
      [0, 10, 20, 30, 40, 50, 60, 70]);

    // Annotation lines
    drawAnnotations(g, xScale, H);

    // === AREAS ===
    const area = fill => d3.area()
      .x(d => xScale(d.cum)).y0(H).y1(d => yScale(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append("path").datum(estimated).attr("d", area()(estimated))
      .attr("fill", C.crimson).attr("fill-opacity", 0.05);
    g.append("path").datum(verified).attr("d", area()(verified))
      .attr("fill", C.crimson).attr("fill-opacity", 0.10);

    // === LINES ===
    const mkLine = () => d3.line()
      .x(d => xScale(d.cum)).y(d => yScale(d.count))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append("path").datum(estimated).attr("d", mkLine()(estimated))
      .attr("fill", "none").attr("stroke", C.crimson)
      .attr("stroke-width", 1.8).attr("stroke-dasharray", "5,5").attr("stroke-opacity", 0.5);

    g.append("path").datum(verified).attr("d", mkLine()(verified))
      .attr("fill", "none").attr("stroke", C.crimson)
      .attr("stroke-width", 2.2).attr("stroke-opacity", 0.9);

    // Connector at 1946
    const lastEst = estimated[estimated.length - 1];
    const firstVer = verified[0];
    if (lastEst && firstVer) {
      g.append("line")
        .attr("x1", xScale(lastEst.cum)).attr("x2", xScale(firstVer.cum))
        .attr("y1", yScale(lastEst.count)).attr("y2", yScale(firstVer.count))
        .attr("stroke", C.crimson).attr("stroke-width", 1.8)
        .attr("stroke-dasharray", "2,5").attr("stroke-opacity", 0.45);
    }

    // === INVISIBLE HIT TARGETS ===
    g.selectAll(".hit-dot").data(allData).enter()
      .append("circle").attr("class", "hit-dot")
      .attr("cx", d => xScale(d.cum)).attr("cy", d => yScale(d.count))
      .attr("r", 7).attr("fill", "transparent")
      .on("mouseover", (evt, d) => {
        showTip(
          `<div class="tt-name">${d.year}</div>` +
          `<div class="tt-years">${d.estimated ? "CoW estimate (pre-UCDP)" : "UCDP/PRIO ACD v25.1"}</div>` +
          `<div class="tt-row"><span>Active conflicts</span><span class="tt-val">${d.count}</span></div>` +
          `<div class="tt-row"><span>Cumul. patents</span><span class="tt-val">${fmtPatents(d.cum)}</span></div>`,
          evt
        );
      })
      .on("mousemove", moveTip)
      .on("mouseout", hideTip);

    // === KEY YEAR CALLOUT DOTS ===
    const KEY_YEARS = new Set([1918, 1945, 1992, 2010, 2024]);
    allData.filter(d => KEY_YEARS.has(d.year)).forEach(d => {
      const cx = xScale(d.cum), cy = yScale(d.count);
      if (isNaN(cx) || isNaN(cy)) return;

      g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 5)
        .attr("fill", C.crimson).attr("stroke", C.bg).attr("stroke-width", 1.8);

      // Smart label placement
      const above = d.year === 1992 || d.year === 2024;
      const align  = d.year === 1992 ? "middle" : "start";
      const ox     = d.year === 1992 ? 0 : 8;
      const oy     = above ? -16 : 16;

      g.append("text")
        .attr("x", cx + ox).attr("y", cy + oy)
        .attr("text-anchor", align)
        .attr("fill", C.textSec)
        .attr("font-size", "11px").attr("font-family", "Inter, sans-serif")
        .attr("font-weight", "500")
        .text(`${d.year}: ${d.count} conflicts`);
    });

    // Y-axis
    const yAxis = d3.axisLeft(yScale).tickValues([0, 10, 20, 30, 40, 50, 60, 70]);
    const ya = g.append("g").call(yAxis);
    ya.select(".domain").attr("stroke", C.axis);
    ya.selectAll(".tick line").attr("stroke", C.axis);
    ya.selectAll(".tick text")
      .attr("fill", C.textSec).attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2).attr("y", -64)
      .attr("text-anchor", "middle")
      .attr("fill", C.textSec)
      .attr("font-size", "12px").attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "500")
      .text("← Active Armed Conflicts (per year)");

    // X-axis
    drawXAxis(g, xScale, H);

    // === LEGEND ===
    const LX = MARGIN.left + W + 18;
    let ly = MARGIN.top + 10;

    svg.append("text").attr("x", LX).attr("y", ly)
      .attr("fill", C.textSec).attr("font-size", "10px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "700").attr("letter-spacing", "0.12em").text("DATA");
    ly += 6;

    [{
      label: "UCDP/PRIO ACD v25.1",
      sub:   "(1946–2024, verified)",
      dash:  "none", opacity: 0.9,
    }, {
      label: "CoW estimates",
      sub:   "(pre-1946)",
      dash:  "5,5", opacity: 0.5,
    }].forEach(item => {
      ly += 22;
      svg.append("line")
        .attr("x1", LX).attr("x2", LX + 22)
        .attr("y1", ly - 4).attr("y2", ly - 4)
        .attr("stroke", C.crimson).attr("stroke-width", 2.2)
        .attr("stroke-dasharray", item.dash).attr("stroke-opacity", item.opacity);
      svg.append("text").attr("x", LX + 28).attr("y", ly)
        .attr("fill", C.textSec).attr("font-size", "10px")
        .attr("font-family", "Inter, sans-serif").text(item.label);
      svg.append("text").attr("x", LX + 28).attr("y", ly + 13)
        .attr("fill", C.textMuted).attr("font-size", "9px")
        .attr("font-family", "Inter, sans-serif").text(item.sub);
      ly += 14;
    });

    // Insight box
    const section = document.getElementById("section-chart2");
    drawInsightBox(section,
      "In 2024, with ~12 million patents in force, 61 armed conflicts are active " +
      "— a record high in the UCDP series. The angel's pile of debris keeps growing."
    );
  }


  // ============================================================
  // INIT
  // ============================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { buildChart1(); buildChart2(); });
  } else {
    buildChart1();
    buildChart2();
  }

})();
