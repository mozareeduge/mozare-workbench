import { formatArtifactSize, projectArtifacts, type ArtifactFixture, type ArtifactTile } from '../../core/projection/OutputProjection.js';

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
        {tile.previewSrc ? <img src={tile.previewSrc} alt={tile.title} /> : <p className="artifact-preview-empty">Preview not available for this artifact.</p>}
      </div>;
    case 'audio':
      return <div className="artifact-preview artifact-preview-audio">
        {tile.previewSrc ? <audio controls src={tile.previewSrc} /> : <p className="artifact-preview-empty">Preview not available for this artifact.</p>}
      </div>;
    case 'video':
      return <div className="artifact-preview artifact-preview-video">
        {tile.previewSrc ? <video controls src={tile.previewSrc} /> : <p className="artifact-preview-empty">Preview not available for this artifact.</p>}
      </div>;
    case 'pdf':
      return <div className="artifact-preview artifact-preview-pdf">
        {tile.previewSrc ? <iframe title={`Preview of ${tile.title}`} className="artifact-pdf-frame" src={tile.previewSrc} sandbox="" /> : <p className="artifact-preview-empty">Preview not available for this artifact.</p>}
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
      <h3 dir="auto">{tile.title}</h3>
      <p className="artifact-badges">
        <span className={tile.isCanonical ? 'artifact-badge is-canonical' : 'artifact-badge'}>{tile.canonicalityLabel}</span>
        <span className={`artifact-badge artifact-verification-${tile.verificationLabel.toLowerCase()}`}>{tile.verificationLabel}</span>
      </p>
      <p className="artifact-lineage">
        {tile.lineageRouteId ? <button type="button" className="artifact-lineage-link">{tile.lineage}</button> : <span>{tile.lineage}</span>}
      </p>
      {(tile.path || tile.hash || tile.sizeBytes !== undefined) && <dl className="artifact-technical">
        {tile.hash && <><dt>Hash</dt><dd><bdi dir="ltr">{tile.hash}</bdi></dd></>}
        {tile.path && <><dt>Path</dt><dd><bdi dir="ltr">{tile.path}</bdi></dd></>}
        <dt>Size</dt><dd>{formatArtifactSize(tile.sizeBytes)}</dd>
      </dl>}
      <p className="artifact-primary-action">{tile.primaryActionLabel}</p>
    </div>
  </article>;
}

export function Output({ artifacts }: { artifacts: ArtifactFixture[] }) {
  const registry = projectArtifacts(artifacts);
  return <section className="output-surface" aria-labelledby="output-heading">
    <div className="output-heading"><div><p className="eyebrow">Project surface</p><h1 id="output-heading">Output</h1><p>Recent, important registered artifacts — not a general file browser.</p></div></div>
    <p className="derived-state" role="status">Canonicality and verification are independent: an artifact can be canonical and unverified, or generated and verified. Binary artifacts are never opened or executed automatically.</p>
    {registry.tiles.length === 0 ? <div className="surface-empty"><h2>No registered outputs</h2><p>The active project has no artifact records. Nothing has been inferred from its filesystem.</p></div>
      : <ul className="output-gallery" aria-label="Artifact registry">
        {registry.tiles.map((tile) => <li key={tile.id}><ArtifactTileView tile={tile} /></li>)}
      </ul>}
  </section>;
}
