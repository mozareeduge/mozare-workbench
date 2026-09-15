// Reference implementation starting point, intentionally small.
// Verify installed OpenUI API against current primary docs before production pinning.
import React from "react";
import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod/v4";

const Action = z.object({ id: z.string(), label: z.string(), kind: z.enum(["read","proposal"]) });
const EvidenceItem = z.object({ ref: z.string(), label: z.string(), status: z.enum(["verified","claim","unverified","contested"]) });

const OrientationBrief = defineComponent({
  name: "OrientationBrief",
  description: "Shows the current project question/state and one next meaningful action.",
  props: z.object({ question: z.string(), state: z.string(), next: z.string() }),
  component: ({ props }) => <section className="mwb-gen-block"><small>Current question</small><h2>{props.question}</h2><p>{props.state}</p><strong>{props.next}</strong></section>,
});

const UncertaintyBlock = defineComponent({
  name: "UncertaintyBlock",
  description: "Shows a bounded unresolved, contested, or insufficient-evidence condition.",
  props: z.object({ label: z.string(), detail: z.string(), evidenceRef: z.string().optional() }),
  component: ({ props }) => <aside className="mwb-gen-uncertainty"><strong>{props.label}</strong><p>{props.detail}</p>{props.evidenceRef && <code>{props.evidenceRef}</code>}</aside>,
});

const EvidencePath = defineComponent({
  name: "EvidencePath",
  description: "Shows a short authority-aware evidence path.",
  props: z.object({ title: z.string(), items: z.array(EvidenceItem) }),
  component: ({ props }) => <section className="mwb-gen-block"><h3>{props.title}</h3><ol>{props.items.map(x=><li key={x.ref}><span>{x.label}</span> <small>{x.status} · {x.ref}</small></li>)}</ol></section>,
});

const CompareMatrix = defineComponent({
  name: "CompareMatrix",
  description: "Compares two bounded options across explicit dimensions; use unknown rather than inventing a value.",
  props: z.object({ title: z.string(), left: z.string(), right: z.string(), rows: z.array(z.object({ dimension:z.string(), left:z.string(), right:z.string() })) }),
  component: ({ props }) => <section className="mwb-gen-block"><h3>{props.title}</h3><table><thead><tr><th>Dimension</th><th>{props.left}</th><th>{props.right}</th></tr></thead><tbody>{props.rows.map(r=><tr key={r.dimension}><th>{r.dimension}</th><td>{r.left}</td><td>{r.right}</td></tr>)}</tbody></table></section>,
});

const SystemLadder = defineComponent({
  name: "SystemLadder",
  description: "Explains technical work from intent to verification; implementation is last.",
  props: z.object({ intent:z.string(), behavior:z.string(), architecture:z.string(), verification:z.string(), implementation:z.string().optional() }),
  component: ({ props }) => <section className="mwb-gen-system"><div><small>Intent</small><p>{props.intent}</p></div><div><small>System behavior</small><p>{props.behavior}</p></div><details><summary>Architecture</summary><p>{props.architecture}</p></details>{props.implementation && <details><summary>Implementation</summary><p>{props.implementation}</p></details>}<div><small>Verification</small><p>{props.verification}</p></div></section>,
});

const NextMoves = defineComponent({
  name: "NextMoves",
  description: "Shows one to three viable allowlisted next actions.",
  props: z.object({ actions: z.array(Action).min(1).max(3) }),
  component: ({ props }) => <div className="mwb-gen-actions">{props.actions.map(a=><button key={a.id} data-action-id={a.id}>{a.label}</button>)}</div>,
});



const DecisionGate = defineComponent({
  name: "DecisionGate",
  description: "Shows a bounded decision with explicit consequences and proposal/read actions.",
  props: z.object({ question:z.string(), options:z.array(z.object({ id:z.string(), label:z.string(), consequence:z.string() })).min(2).max(4), recommendation:z.string().optional() }),
  component: ({ props }) => <section className="mwb-gen-block"><h3>{props.question}</h3>{props.options.map(o=><article key={o.id}><strong>{o.label}</strong><p>{o.consequence}</p></article>)}{props.recommendation && <small>Recommendation: {props.recommendation}</small>}</section>,
});

const ProposalReview = defineComponent({
  name: "ProposalReview",
  description: "Summarizes a proposal by system effect, verification, protected behavior, and unresolved items.",
  props: z.object({ title:z.string(), effect:z.string(), verification:z.string(), protected:z.array(z.string()), unresolved:z.array(z.string()) }),
  component: ({ props }) => <section className="mwb-gen-block"><h3>{props.title}</h3><p>{props.effect}</p><strong>Verification</strong><p>{props.verification}</p><strong>Protected</strong><ul>{props.protected.map(x=><li key={x}>{x}</li>)}</ul>{props.unresolved.length>0 && <><strong>Unresolved</strong><ul>{props.unresolved.map(x=><li key={x}>{x}</li>)}</ul></>}</section>,
});

const ArtifactSummary = defineComponent({
  name: "ArtifactSummary",
  description: "Shows an artifact's medium, canonicality, verification, and lineage reference.",
  props: z.object({ title:z.string(), medium:z.string(), canonicality:z.string(), verification:z.string(), lineageRef:z.string().optional() }),
  component: ({ props }) => <section className="mwb-gen-block"><h3>{props.title}</h3><p>{props.medium} · {props.canonicality} · {props.verification}</p>{props.lineageRef && <code>{props.lineageRef}</code>}</section>,
});

const RelationSlice = defineComponent({
  name: "RelationSlice",
  description: "Shows a small relation neighborhood with explicit relation status; never a whole project graph.",
  props: z.object({ center:z.string(), neighbors:z.array(z.object({ ref:z.string(), label:z.string(), relation:z.string(), status:z.string() })).max(8) }),
  component: ({ props }) => <section className="mwb-gen-block"><h3>{props.center}</h3><ul>{props.neighbors.map(n=><li key={n.ref}><strong>{n.relation}</strong> → {n.label} <small>{n.status} · {n.ref}</small></li>)}</ul></section>,
});

const MozareView = defineComponent({
  name: "MozareView",
  description: "Root container for a bounded adaptive representation inside an existing Workbench surface.",
  props: z.object({ mode: z.enum(["orient","compare","decide","system","review"]), children: z.array(z.union([OrientationBrief.ref, UncertaintyBlock.ref, EvidencePath.ref, CompareMatrix.ref, SystemLadder.ref, DecisionGate.ref, ProposalReview.ref, ArtifactSummary.ref, RelationSlice.ref, NextMoves.ref])) }),
  component: ({ props, renderNode }) => <section className="mwb-generated-view" data-mode={props.mode}>{renderNode(props.children)}</section>,
});

export const mozareOrientLibrary = createLibrary({
  root: "MozareView",
  components: [MozareView, OrientationBrief, UncertaintyBlock, EvidencePath, ArtifactSummary, NextMoves],
  componentGroups: [{name:"Orientation",components:["OrientationBrief","UncertaintyBlock","EvidencePath","NextMoves"],notes:["Prefer compact state and references; do not restate project history."]}],
});

export const mozareCompareLibrary = createLibrary({
  root: "MozareView",
  components: [MozareView, CompareMatrix, EvidencePath, UncertaintyBlock, NextMoves],
});

export const mozareSystemLibrary = createLibrary({
  root: "MozareView",
  components: [MozareView, SystemLadder, EvidencePath, UncertaintyBlock, NextMoves],
});


export const mozareDecideLibrary = createLibrary({
  root: "MozareView",
  components: [MozareView, DecisionGate, EvidencePath, UncertaintyBlock, NextMoves],
});

export const mozareReviewLibrary = createLibrary({
  root: "MozareView",
  components: [MozareView, ProposalReview, EvidencePath, SystemLadder, DecisionGate],
});

export const mozareRelationLibrary = createLibrary({
  root: "MozareView",
  components: [MozareView, RelationSlice, EvidencePath, UncertaintyBlock, NextMoves],
});
