import { formatArtifactSize, projectArtifacts, type ArtifactFixture, type ArtifactTile } from '../../core/projection/OutputProjection.js';

const fixtures: ArtifactFixture[] = [
  {
    id: 'out_art_json_canonical',
    title: 'TAROKE RIMIXER mission record',
    medium: 'json',
    canonicality: 'canonical',
    verification: 'verified',
    declaredVerified: true,
    lineage: 'Canonical project record · edited directly by the mission author',
    lineageRouteId: 'lineage_20260915_example01',
    createdAt: '2026-09-15T18:20:00Z',
    mimeType: 'application/json',
    textContent: '{\n  "id": "mission_20260915_example01",\n  "title": "Rhythm comparison pass v2",\n  "status": "in_progress"\n}',
  },
  {
    id: 'out_art_html_generated',
    title: 'Verse 3 comparison report',
    medium: 'html',
    canonicality: 'generated',
    verification: 'verified',
    declaredVerified: true,
    lineage: 'Generated from the canonical mission record via the export pipeline',
    lineageRouteId: 'lineage_20260915_example02',
    createdAt: '2026-09-15T17:05:00Z',
    mimeType: 'text/html',
    htmlContent:
      '<!doctype html><html><head><meta charset="utf-8"><title>Verse 3 comparison report</title></head>' +
      '<body style="font-family:system-ui;margin:24px"><h1>Verse 3 comparison report</h1>' +
      '<p>Rhythmic markers for the annotated cut, generated from the canonical mission record.</p></body></html>',
  },
  {
    id: 'out_art_image_still',
    title: 'Verse 3 waveform still',
    medium: 'image',
    canonicality: 'generated',
    verification: 'verified',
    declaredVerified: true,
    lineage: 'Rendered from the verse 3 listening cut',
    createdAt: '2026-09-15T16:40:00Z',
    mimeType: 'image/svg+xml',
    previewSrc:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='120'%3E" +
      "%3Crect width='320' height='120' fill='%23dce8e4'/%3E%3Cpath d='M0 60 L40 20 L80 100 L120 40 L160 90 L200 30 L240 80 L280 50 L320 60' " +
      "stroke='%23315f58' stroke-width='4' fill='none'/%3E%3C/svg%3E",
    sizeBytes: 8_420,
  },
  {
    id: 'out_art_audio_cut',
    title: 'Verse 3 listening cut render',
    medium: 'audio',
    canonicality: 'generated',
    verification: 'unverified',
    declaredVerified: false,
    lineage: 'Rendered by the audio pipeline · awaiting listening verification',
    createdAt: '2026-09-15T15:10:00Z',
    mimeType: 'audio/wav',
    sizeBytes: 2_415_820,
  },
  {
    id: 'out_art_video_pass',
    title: 'Verse 3 remix candidate render',
    medium: 'video',
    canonicality: 'generated',
    verification: 'failed',
    declaredVerified: false,
    lineage: 'Rendered by the build pipeline · the render step failed',
    createdAt: '2026-09-15T14:55:00Z',
    mimeType: 'video/mp4',
    sizeBytes: 18_204_112,
  },
  {
    id: 'out_art_pdf_brief',
    title: 'Rhythm comparison brief',
    medium: 'pdf',
    canonicality: 'generated',
    verification: 'verified',
    declaredVerified: true,
    lineage: 'Exported from the canonical mission record',
    createdAt: '2026-09-15T12:30:00Z',
    mimeType: 'application/pdf',
    sizeBytes: 184_004,
  },
  {
    id: 'out_art_text_notes',
    title: 'Annotation notes — verse 3 cut',
    medium: 'text',
    canonicality: 'generated',
    verification: 'verified',
    declaredVerified: true,
    lineage: 'Exported from the annotation subtasks of the active outcome',
    createdAt: '2026-09-15T11:45:00Z',
    mimeType: 'text/plain',
    textContent: 'Verse 3 cut: rhythmic markers align with the source through bar 12; divergence begins at bar 13.',
  },
  {
    id: 'out_art_html_sandbox_sample',
    title: 'External HTML sample (sandbox verification)',
    medium: 'html',
    canonicality: 'external',
    verification: 'unverified',
    declaredVerified: false,
    lineage: 'Untrusted external HTML — never treated as canonical or verified',
    createdAt: '2026-09-15T10:15:00Z',
    mimeType: 'text/html',
    htmlContent:
      '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
      '<p>Sandbox verification sample.</p>' +
      '<script>' +
      "try { window.parent.postMessage('hostile-probe', '*'); } catch (e) {}" +
      "try { window.parent.document.title = 'HOSTILE-OVERWRITE'; } catch (e) {}" +
      "try { window.top.location = 'https://example.invalid/'; } catch (e) {}" +
      "document.title = 'inside-sandboxed-iframe';" +
      '</script></body></html>',
  },
  {
    id: 'out_art_binary_installer',
    title: 'TAROKE RIMIXER installer',
    medium: 'binary',
    canonicality: 'generated',
    verification: 'unverified',
    declaredVerified: false,
    lineage: 'Packaged by the release pipeline · not yet verified',
    createdAt: '2026-09-14T09:00:00Z',
    hash: 'sha256:9f4a2e7c1b6d8305af0e77c4b1e9d3a5c2f0187654e3b2a19d8f0c6e4b3a7d1',
    path: 'dist/installers/taroke-rimixer-0.3.2.apk',
    sizeBytes: 41_402_880,
    mimeType: 'application/vnd.android.package-archive',
  },
];

const registry = projectArtifacts(fixtures);

function ArtifactPreview({ tile }: { tile: ArtifactTile }) {
  const openExternally = () => {
    if (!tile.htmlContent) return;
    const blob = new Blob([tile.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  switch (tile.previewKind) {
    case 'html-sandbox':
      return <div className="artifact-preview artifact-preview-html">
        <iframe
          title={`Sandboxed preview of ${tile.title}`}
          className="artifact-html-frame"
          sandbox="allow-scripts"
          srcDoc={tile.htmlContent ?? '<p>No preview content available.</p>'}
        />
        <p className="artifact-sandbox-note" role="note">Sandboxed preview — this frame cannot read or change the Workbench window.</p>
        <button type="button" className="artifact-open-external" onClick={openExternally}>Open externally</button>
      </div>;
    case 'image':
      return <div className="artifact-preview artifact-preview-image">
        {tile.previewSrc ? <img src={tile.previewSrc} alt={tile.title} /> : <p className="artifact-preview-empty">Preview not available for this fixture.</p>}
      </div>;
    case 'audio':
      return <div className="artifact-preview artifact-preview-audio">
        {tile.previewSrc ? <audio controls src={tile.previewSrc} /> : <p className="artifact-preview-empty">Preview not available for this fixture.</p>}
      </div>;
    case 'video':
      return <div className="artifact-preview artifact-preview-video">
        {tile.previewSrc ? <video controls src={tile.previewSrc} /> : <p className="artifact-preview-empty">Preview not available for this fixture.</p>}
      </div>;
    case 'pdf':
      return <div className="artifact-preview artifact-preview-pdf">
        {tile.previewSrc ? <iframe title={`Preview of ${tile.title}`} className="artifact-pdf-frame" src={tile.previewSrc} sandbox="" /> : <p className="artifact-preview-empty">Preview not available for this fixture.</p>}
      </div>;
    case 'text':
      return <div className="artifact-preview artifact-preview-text">
        <pre>{tile.textContent ?? 'No preview text available.'}</pre>
      </div>;
    case 'binary-metadata':
      return <div className="artifact-preview artifact-preview-binary" role="note">
        <p className="artifact-binary-glyph" aria-hidden="true">▣</p>
        <p className="artifact-binary-note">Binary artifact — metadata only. It is never opened or executed automatically.</p>
      </div>;
    default:
      return null;
  }
}

function ArtifactTileView({ tile }: { tile: ArtifactTile }) {
  return <article className={`artifact-tile artifact-medium-${tile.medium}`}>
    <ArtifactPreview tile={tile} />
    <div className="artifact-meta">
      <h3>{tile.title}</h3>
      <p className="artifact-badges">
        <span className={tile.isCanonical ? 'artifact-badge is-canonical' : 'artifact-badge'}>{tile.canonicalityLabel}</span>
        <span className={`artifact-badge artifact-verification-${tile.verificationLabel.toLowerCase()}`}>{tile.verificationLabel}</span>
      </p>
      <p className="artifact-lineage">
        {tile.lineageRouteId ? <button type="button" className="artifact-lineage-link">{tile.lineage}</button> : <span>{tile.lineage}</span>}
      </p>
      {(tile.medium === 'binary' || tile.medium === 'audio' || tile.medium === 'video' || tile.medium === 'pdf') && <dl className="artifact-technical">
        {tile.hash && <><dt>Hash</dt><dd>{tile.hash}</dd></>}
        {tile.path && <><dt>Path</dt><dd>{tile.path}</dd></>}
        <dt>Size</dt><dd>{formatArtifactSize(tile.sizeBytes)}</dd>
      </dl>}
      <p className="artifact-primary-action">{tile.primaryActionLabel}</p>
    </div>
  </article>;
}

export function Output() {
  return <section className="output-surface" aria-labelledby="output-heading">
    <div className="output-heading"><div><p className="eyebrow">Project surface</p><h1 id="output-heading">Output</h1><p>Recent, important produced artifacts — not a general file browser.</p></div></div>
    <p className="derived-state" role="status">Canonicality and verification are independent: an artifact can be canonical and unverified, or generated and verified. Binary artifacts are never opened or executed automatically.</p>
    <ul className="output-gallery" aria-label="Artifact registry">
      {registry.tiles.map((tile) => <li key={tile.id}><ArtifactTileView tile={tile} /></li>)}
    </ul>
  </section>;
}
