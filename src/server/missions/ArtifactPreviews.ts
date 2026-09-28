import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { ARTIFACT_MEDIA, type ArtifactCanonicality, type ArtifactFixture, type ArtifactMedium, type ArtifactVerification } from '../../core/projection/OutputProjection.js';

export type RegisteredArtifact = { id: string; name: string; kind: string; ref: string; canonicality: string; verification_state: string; source?: 'observed' };

const INLINE_LIMIT = 256 * 1024;
const MEDIA_TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.pdf': 'application/pdf',
};
const CANONICALITY: ArtifactCanonicality[] = ['canonical', 'generated', 'external', 'temporary'];

/** Resolves a registry ref inside the project only (relative to artifacts/, then to the root); anything outside is never read. */
export function resolveArtifactFile(projectRoot: string, ref: string): string | null {
  const canonicalRoot = realpathSync(projectRoot);
  for (const base of [join(projectRoot, 'artifacts'), projectRoot]) {
    const candidate = resolve(base, ref);
    const rel = relative(resolve(projectRoot), candidate);
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) continue;
    if (!existsSync(candidate)) continue;
    const real = realpathSync(candidate);
    const realRel = relative(canonicalRoot, real);
    if (realRel === '' || realRel === '..' || realRel.startsWith(`..\\`) || realRel.startsWith('../') || isAbsolute(realRel)) continue;
    if (statSync(real).isFile()) return real;
  }
  return null;
}

export function artifactMediaType(file: string): string {
  return MEDIA_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Builds Output tiles from the project's artifact registry. Text/JSON/HTML under 256 KB is
 * inlined (HTML only ever renders in a sandboxed iframe); image/audio/video/PDF previews are
 * served by a separate bounded route; binaries stay metadata-only and are never served.
 */
export function artifactFixtures(projectRoot: string, workspaceId: string, artifacts: RegisteredArtifact[]): ArtifactFixture[] {
  return artifacts.map((artifact) => {
    const medium: ArtifactMedium = (ARTIFACT_MEDIA as readonly string[]).includes(artifact.kind) ? artifact.kind as ArtifactMedium : 'binary';
    const verification: ArtifactVerification = artifact.verification_state === 'verified' ? 'verified' : artifact.verification_state === 'failed' ? 'failed' : 'unverified';
    const canonicality = CANONICALITY.includes(artifact.canonicality as ArtifactCanonicality) ? artifact.canonicality as ArtifactCanonicality : 'external';
    const file = resolveArtifactFile(projectRoot, artifact.ref);
    const stats = file ? statSync(file) : null;
    const fixture: ArtifactFixture = {
      id: artifact.id,
      title: artifact.name,
      medium,
      canonicality,
      verification,
      lineage: artifact.source === 'observed' ? 'Observed in this project output folder; not registered as canonical and not verified' : file ? 'Registered in the project artifact registry' : 'Registered, but the file is missing or outside the project folder — no preview is loaded',
      createdAt: stats ? stats.mtime.toISOString() : new Date(0).toISOString(),
      path: artifact.ref,
      sizeBytes: stats?.size,
    };
    if (!file || !stats) return fixture;
    if (medium === 'binary') return { ...fixture, hash: `sha256:${createHash('sha256').update(readFileSync(file)).digest('hex')}` };
    if (['text', 'json', 'html'].includes(medium)) {
      if (stats.size > INLINE_LIMIT) return fixture;
      const text = readFileSync(file, 'utf8');
      return medium === 'html' ? { ...fixture, htmlContent: text } : { ...fixture, textContent: text };
    }
    return { ...fixture, mimeType: artifactMediaType(file), previewSrc: `/api/workspaces/${encodeURIComponent(workspaceId)}/artifacts/${encodeURIComponent(artifact.id)}/content` };
  });
}
