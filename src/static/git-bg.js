/**
 * Animated Git-style branch lines background.
 * Draws slowly-scrolling branch lanes, commit nodes, and merge connections
 * on the #git-bg canvas element.
 */
(function startGitBackground() {
  const canvas = document.getElementById("git-bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // School colors: lime green palette
  const BRANCH_COLORS = [
    "rgba(74,158,15,0.30)",
    "rgba(106,191,42,0.25)",
    "rgba(46,107,0,0.28)",
    "rgba(120,200,0,0.22)",
    "rgba(168,216,64,0.22)",
  ];
  const COMMIT_ALPHA = 0.45;
  const LINE_WIDTH = 2;
  const COMMIT_RADIUS = 5;
  const COMMIT_SPACING = 100; // vertical pixels between commits
  const MERGE_EVERY = 350; // attempt a merge arc every ~N pixels per lane pair
  const SCROLL_SPEED = 0.5; // pixels per animation frame (upward scroll)
  const GRAPH_HEIGHT = 2000; // virtual height before pattern repeats
  const LANE_MIN_WIDTH = 160; // minimum pixel width allocated per lane

  let lanes = [];
  let merges = [];
  let scrollY = 0;
  let rafId = null;

  // ── Build graph ─────────────────────────────────────────────────────────────

  function buildGraph() {
    const numLanes = Math.max(3, Math.floor(canvas.width / LANE_MIN_WIDTH));
    const spacing = canvas.width / (numLanes + 1);

    lanes = [];
    for (let i = 0; i < numLanes; i++) {
      const x = spacing * (i + 1);
      const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
      // Stagger commit phases so they don't all appear on the same row
      const phase = (i * 43) % COMMIT_SPACING;
      lanes.push({ x, color, phase });
    }

    // Generate merge/branch arcs between adjacent lanes
    merges = [];
    for (let i = 0; i < lanes.length - 1; i++) {
      for (let y = MERGE_EVERY / 2; y < GRAPH_HEIGHT; y += MERGE_EVERY + (i * 97) % 150) {
        merges.push({
          fromX: lanes[i].x,
          toX: lanes[i + 1].x,
          y,
          color: BRANCH_COLORS[i % BRANCH_COLORS.length],
        });
      }
    }
  }

  // ── Resize ───────────────────────────────────────────────────────────────────

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function resizeAndRebuild() {
    resize();
    buildGraph();
  }

  resizeAndRebuild();
  window.addEventListener("resize", resizeAndRebuild);

  // ── Drawing helpers ──────────────────────────────────────────────────────────

  function colorWithAlpha(rgbaStr, alpha) {
    // Replace the alpha component in an "rgba(r,g,b,a)" string
    return rgbaStr.replace(/[\d.]+\)$/, alpha + ")");
  }

  function drawLane(lane, baseY) {
    const top = Math.max(0, baseY);
    const bottom = Math.min(canvas.height, baseY + GRAPH_HEIGHT);
    if (top >= bottom) return;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(lane.x, top);
    ctx.lineTo(lane.x, bottom);
    ctx.strokeStyle = lane.color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.stroke();

    // Commit nodes
    const startN = Math.ceil((-baseY - lane.phase - COMMIT_RADIUS) / COMMIT_SPACING);
    const endN = Math.floor((canvas.height - baseY - lane.phase + COMMIT_RADIUS) / COMMIT_SPACING);

    for (let n = startN; n <= endN; n++) {
      const y = baseY + lane.phase + n * COMMIT_SPACING;
      if (y < -COMMIT_RADIUS || y > canvas.height + COMMIT_RADIUS) continue;

      // Outer filled circle
      ctx.beginPath();
      ctx.arc(lane.x, y, COMMIT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(lane.color, COMMIT_ALPHA);
      ctx.fill();

      // White ring
      ctx.beginPath();
      ctx.arc(lane.x, y, COMMIT_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawMerge(merge, baseY) {
    const y = baseY + merge.y;
    // Draw a smooth bezier arc connecting the two lanes
    const arcHeight = 60;
    if (y + arcHeight < 0 || y > canvas.height) return;

    ctx.beginPath();
    ctx.moveTo(merge.fromX, y);
    ctx.bezierCurveTo(
      merge.fromX, y + arcHeight * 0.6,
      merge.toX,   y + arcHeight * 0.6,
      merge.toX,   y + arcHeight
    );
    ctx.strokeStyle = colorWithAlpha(merge.color, 0.35);
    ctx.lineWidth = LINE_WIDTH;
    ctx.stroke();
  }

  // ── Animation loop ───────────────────────────────────────────────────────────

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    scrollY = (scrollY + SCROLL_SPEED) % GRAPH_HEIGHT;

    // Draw two consecutive repetitions of the graph to create seamless scrolling
    for (let rep = 0; rep < 2; rep++) {
      const baseY = -scrollY + rep * GRAPH_HEIGHT;
      if (baseY > canvas.height || baseY + GRAPH_HEIGHT < 0) continue;

      ctx.lineWidth = LINE_WIDTH;

      for (const lane of lanes) {
        drawLane(lane, baseY);
      }
      for (const merge of merges) {
        drawMerge(merge, baseY);
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  draw();
})();
