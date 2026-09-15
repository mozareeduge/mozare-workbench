const views = [...document.querySelectorAll('.view')];
const navs = [...document.querySelectorAll('[data-view]')];
const main = document.getElementById('main');
let lastTrigger = null;

function openView(id, push = true) {
  views.forEach(v => v.hidden = v.id !== id);
  navs.forEach(n => n.setAttribute('aria-current', n.dataset.view === id ? 'page' : 'false'));
  if (push && location.hash !== `#${id}`) history.pushState({view:id}, '', `#${id}`);
  const heading = document.querySelector(`#${id} h1`);
  heading?.setAttribute('tabindex','-1');
  heading?.focus({preventScroll:true});
  window.scrollTo({top:0, behavior:'auto'});
}
navs.forEach(n => n.addEventListener('click', () => openView(n.dataset.view)));
window.addEventListener('popstate', () => openView((location.hash || '#focus').slice(1), false));

const drawer = document.getElementById('drawer');
const drawerContent = document.getElementById('drawerContent');
const backdrop = document.getElementById('backdrop');
const mission = document.getElementById('missionSheet');

const drawerData = {
  system: `<div class="drawer-head"><div><div class="eyebrow">System view</div><h2>Recipe inspection</h2></div><button class="icon-btn" data-close aria-label="Close">×</button></div>
  <div class="drawer-section"><h3>Intent</h3><p>Let a reader inspect how a generated line was assembled without leaving the poem experience.</p></div>
  <div class="drawer-section"><h3>System behavior</h3><p>Select a line → open bounded inspection → return to the exact run position.</p></div>
  <div class="disclosure"><button data-disclosure>Architecture <span>＋</span></button><div class="disclosure-body" hidden>Run position and selected-line state remain presentation state. Inspection reads recipe evidence and does not mutate project JSON.</div></div>
  <div class="disclosure"><button data-disclosure>Implementation <span>＋</span></button><div class="disclosure-body" hidden>Production Workbench would show exact files, diff and technical terms here.</div></div>
  <div class="drawer-section"><h3>Verification</h3><p>Interaction path + return position + archive-parity tests.</p></div>`,
  relation: `<div class="drawer-head"><div><div class="eyebrow">Relation object</div><h2>Question ↔ material</h2></div><button class="icon-btn" data-close aria-label="Close">×</button></div>
  <div class="drawer-section"><h3>Classification</h3><p>Provisional · descriptor: recipe may make constraint inspectable.</p></div>
  <div class="drawer-section"><h3>Evidence for</h3><p>Current line recipe is already available as procedural evidence in the instrument.</p></div>
  <div class="drawer-section"><h3>Uncertainty</h3><p>The inspection could interrupt poetic flow if it becomes visually or technically dominant.</p></div>
  <div class="drawer-section"><h3>Use in project</h3><p>Active in the current design experiment; not yet a settled design claim.</p></div>`,
  material: `<div class="drawer-head"><div><div class="eyebrow">Material</div><h2>Line recipes</h2></div><button class="icon-btn" data-close aria-label="Close">×</button></div><div class="drawer-section"><h3>Role</h3><p>Procedural trace of how a generated line was assembled. Used as material/evidence, not automatically as public explanation.</p></div>`,
  decision: `<div class="drawer-head"><div><div class="eyebrow">Accepted decision</div><h2>Run stays a poem surface</h2></div><button class="icon-btn" data-close aria-label="Close">×</button></div><div class="drawer-section"><h3>Consequence</h3><p>Inspection must remain subordinate to reading/play. Technical procedure cannot become the dominant visual layer.</p></div>`
};

function wireDisclosure(root=document) {
  root.querySelectorAll('[data-disclosure]').forEach(btn => btn.addEventListener('click', () => {
    const body = btn.nextElementSibling; const open = !body.hidden; body.hidden = open; btn.querySelector('span').textContent = open ? '＋' : '−'; btn.setAttribute('aria-expanded', String(!open));
  }));
}
function closeOverlay() {
  drawer.hidden = true; mission.hidden = true; backdrop.hidden = true; lastTrigger?.focus();
}
function openDrawer(type, trigger) {
  lastTrigger=trigger; drawerContent.innerHTML=drawerData[type] || ''; drawer.hidden=false; backdrop.hidden=false; wireDisclosure(drawer); drawer.querySelector('button')?.focus();
}
document.querySelectorAll('[data-drawer]').forEach(el => el.addEventListener('click', () => openDrawer(el.dataset.drawer, el)));
function openMission(trigger) { lastTrigger=trigger; mission.hidden=false; backdrop.hidden=false; mission.querySelector('textarea')?.focus(); }
document.getElementById('openMission').addEventListener('click', e => openMission(e.currentTarget));
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeOverlay(); });
backdrop.addEventListener('click', closeOverlay);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (!drawer.hidden || !mission.hidden)) closeOverlay(); });

document.getElementById('startMission').addEventListener('click', () => { closeOverlay(); const live=document.querySelector('.live'); live.innerHTML='<span class="pulse"></span><span>Claude Code · preparing context · 0m</span>'; });

document.getElementById('listMode').addEventListener('click', e => openDrawer('relation', e.currentTarget));

const reviewDetail = document.getElementById('reviewDetail');
const reviews = {
  interaction: `<div class="review-detail-inner"><div class="eyebrow">Technical / interaction proposal</div><h1 class="surface-title">Recipe inspection without leaving Run</h1><div class="review-meta"><span class="status good">Fresh base</span><span class="status good">7 observed tests passed</span><span class="status">Visual review pending</span></div>
  <div class="effect-grid"><div class="effect-block"><h3>Requested outcome</h3><p>Expose one line recipe without turning Run into a technical dashboard.</p></div><div class="effect-block"><h3>What changed</h3><p>A bounded inspection layer opens from a line and returns to the exact run position.</p></div><div class="effect-block"><h3>Unresolved</h3><p>Final density and wording still need human visual judgment.</p></div></div>
  <section class="section"><h2>Verification</h2><div class="evidence-row"><span class="evidence-icon">✓</span><div><strong>Return-position interaction</strong><small>Observed by browser test · passed</small></div><span class="status good">Observed</span></div><div class="evidence-row"><span class="evidence-icon">✓</span><div><strong>Archive semantics unchanged</strong><small>Observed fixture parity · passed</small></div><span class="status good">Observed</span></div><div class="evidence-row"><span class="evidence-icon" style="background:var(--c-info-soft);color:var(--c-info)">i</span><div><strong>“Feels subordinate to the poem”</strong><small>Agent assessment · human visual review required</small></div><span class="status">Claim</span></div></section>
  <section class="section"><h2>Impact</h2><p class="lead">Run surface and inspection state change. Project JSON, generation rules and export semantics remain protected.</p></section>
  <div class="disclosure"><button data-disclosure>Architecture / rationale <span>＋</span></button><div class="disclosure-body" hidden>Selected line + run position remain local UI state. Inspection reads recipe data. No canonical write occurs unless the author edits and explicitly saves project structure.</div></div>
  <div class="disclosure"><button data-disclosure>Implementation detail <span>＋</span></button><div class="disclosure-body" hidden><code>next2/index.html</code> · three bounded regions changed. Production Workbench would embed the exact diff and raw log here, collapsed by default.</div></div>
  <div class="decision-bar"><span class="fresh">✓ Base is current</span><span class="decision-spacer"></span><button class="btn">Preserve</button><button class="btn">Reject</button><button class="btn">Request revision</button><button class="btn primary">Accept</button></div></div>`,
  wording: `<div class="review-detail-inner"><div class="eyebrow">Owner language decision</div><h1 class="surface-title">Should the public text use “visible constraint”?</h1><div class="review-meta"><span class="status">No runtime effect</span><span class="status">Owner-only wording</span></div><div class="effect-grid"><div class="effect-block"><h3>Current</h3><p>visible constraint</p></div><div class="effect-block"><h3>Alternative</h3><p>inspectable procedure</p></div><div class="effect-block"><h3>Consequence</h3><p>Changes description and emphasis, not software behavior.</p></div></div><section class="section"><h2>Evidence</h2><p class="lead">Current interface behavior and documentation use both procedural visibility and constraint language. This remains a language/aesthetic judgment.</p></section><div class="decision-bar"><span class="fresh">Owner decision</span><span class="decision-spacer"></span><button class="btn">Preserve as residue</button><button class="btn">Request revision</button><button class="btn primary">Accept wording</button></div></div>`
};
function openReview(id) { reviewDetail.innerHTML=reviews[id]; wireDisclosure(reviewDetail); }
document.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('[data-review]').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); openReview(btn.dataset.review); }));
openReview('interaction');
wireDisclosure();


const dynamicFocus = document.getElementById('dynamicFocus');
const repRoute = document.getElementById('repRoute');
const repViews = {
  orient: `<section class="generated-zone static-zone"><div class="gen-kicker">Stable orientation · deterministic</div><div class="gen-grid"><div><small>Main tension</small><strong>Visibility without technical domination</strong></div><div><small>Evidence</small><strong>2 verified · 1 unsettled</strong></div><div><small>Next</small><strong>One reversible interaction experiment</strong></div></div></section>`,
  compare: `<section class="generated-zone"><div class="gen-kicker">Adaptive comparison · bounded representation</div><div class="compare-mini"><div></div><strong>Current Run</strong><strong>Inspectable recipe</strong><span>Poetic continuity</span><b>strong</b><b>must preserve</b><span>Procedure visibility</span><b>low</b><b>high</b><span>Risk</span><b>opaque process</b><b>technical dominance</b></div><div class="gen-actions"><button class="btn">Inspect evidence</button><button class="btn">Open relation</button></div></section>`,
  system: `<section class="generated-zone"><div class="gen-kicker">System view · progressive disclosure</div><div class="system-mini"><div><small>Intent</small><p>Inspect construction without leaving the poem.</p></div><div><small>Behavior</small><p>Select line → inspect → return to exact run position.</p></div><details><summary>Architecture</summary><p>Selected line/run position stay UI state; recipe evidence is read-only.</p></details><div><small>Verification</small><p>2 observed browser/semantics checks.</p></div></div></section>`
};
function setRepresentation(mode){
  document.querySelectorAll('[data-rep]').forEach(b=>b.classList.toggle('active',b.dataset.rep===mode));
  dynamicFocus.innerHTML=repViews[mode]||repViews.orient;
  repRoute.textContent=mode==='orient' ? 'static · 0 model tokens' : 'reference adaptive view · bounded context';
}
document.querySelectorAll('[data-rep]').forEach(b=>b.addEventListener('click',()=>setRepresentation(b.dataset.rep)));
setRepresentation('orient');

openView((location.hash || '#focus').slice(1), false);
