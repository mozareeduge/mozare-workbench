/**
 * Output is the bounded artifact registry (DEC-012: "recent/important produced artifacts
 * with canonicality and verification status; no generic file browser"). This module derives
 * a fixture/demo-scoped gallery of `ArtifactTile`s from declared artifact records. It never
 * imports `node:*` modules: it is bundled for the browser by Vite via `src/web/surfaces/Output.tsx`.
 *
 * Canonicality and verification are independent axes (ORACLE-013, HZN-007): an artifact can be
 * canonical-but-unverified, generated-and-verified, generated-and-failed, etc. Neither implies
 * the other, and this module never derives one from the other.
 */

export const ARTIFACT_MEDIA = ['json', 'html', 'image', 'audio', 'video', 'pdf', 'text', 'binary'] as const;
export type ArtifactMedium = (typeof ARTIFACT_MEDIA)[number];

/** Mirrors the four canonicality labels fixed by `AUTHORITY/03_DESIGN_UIUX_BLUEPRINTS.md` SURF-OUTPUT. */
export type ArtifactCanonicality = 'canonical' | 'generated' | 'external' | 'temporary';

/** Mirrors the three verification labels fixed by `AUTHORITY/03_DESIGN_UIUX_BLUEPRINTS.md` SURF-OUTPUT. */
export type ArtifactVerification = 'verified' | 'unverified' | 'failed';

export type ArtifactPreviewKind = 'html-sandbox' | 'image' | 'audio' | 'video' | 'pdf' | 'text' | 'binary-metadata';

export type ArtifactPrimaryAction = 'preview' | 'listen' | 'read' | 'inspect';

/**
 * A fixture/demo-scoped artifact record. `declaredVerified`, when present, is a claim from the
 * fixture source (mirroring an untrusted external feed) that must agree with the verification
 * state the record itself carries. This is what makes ORACLE-013's "canonicality and
 * verification are independent and visible" a structural property of `projectArtifacts`, not an
 * accident of well-behaved demo data: a failed or unverified build can never be declared
 * Verified (SCN-OUT-05).
 */
export type ArtifactFixture = {
  id: string;
  title: string;
  medium: ArtifactMedium;
  canonicality: ArtifactCanonicality;
  verification: ArtifactVerification;
  declaredVerified?: boolean;
  lineage: string;
  lineageRouteId?: string;
  createdAt: string;
  hash?: string;
  path?: string;
  sizeBytes?: number;
  mimeType?: string;
  /** Raw HTML for `medium: 'html'` artifacts, rendered only inside a restrictive sandboxed iframe. */
  htmlContent?: string;
  /** Inline text for `medium: 'text' | 'json'` artifacts. */
  textContent?: string;
  /** Safe, non-executable preview source (e.g. an image data URI) for image/audio/video/pdf media. */
  previewSrc?: string;
};

export type ArtifactTile = {
  id: string;
  title: string;
  medium: ArtifactMedium;
  previewKind: ArtifactPreviewKind;
  canonicalityLabel: string;
  isCanonical: boolean;
  verificationLabel: string;
  isVerified: boolean;
  lineage: string;
  lineageRouteId?: string;
  createdAt: string;
  hash?: string;
  path?: string;
  sizeBytes?: number;
  mimeType?: string;
  htmlContent?: string;
  textContent?: string;
  previewSrc?: string;
  primaryAction: ArtifactPrimaryAction;
  primaryActionLabel: string;
};

export type ArtifactRegistry = { tiles: ArtifactTile[] };

export class ArtifactFixtureValidationError extends Error {
  constructor(message: string, readonly fixtureId: string) {
    super(message);
    this.name = 'ArtifactFixtureValidationError';
  }
}

const CANONICALITY_LABELS: Record<ArtifactCanonicality, string> = {
  canonical: 'Canonical/editable',
  generated: 'Generated/distributable',
  external: 'External',
  temporary: 'Temporary',
};

const VERIFICATION_LABELS: Record<ArtifactVerification, string> = {
  verified: 'Verified',
  unverified: 'Unverified',
  failed: 'Failed',
};

/** Binary artifacts are metadata-only (ORACLE-027): they never resolve to an executable preview. */
export function derivePreviewKind(medium: ArtifactMedium): ArtifactPreviewKind {
  switch (medium) {
    case 'html':
      return 'html-sandbox';
    case 'image':
      return 'image';
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    case 'pdf':
      return 'pdf';
    case 'json':
    case 'text':
      return 'text';
    case 'binary':
      return 'binary-metadata';
    default:
      throw new ArtifactFixtureValidationError(`Unknown artifact medium: ${String(medium)}`, 'unknown');
  }
}

function derivePrimaryAction(previewKind: ArtifactPreviewKind): { action: ArtifactPrimaryAction; label: string } {
  switch (previewKind) {
    case 'audio':
      return { action: 'listen', label: 'Listen' };
    case 'text':
      return { action: 'read', label: 'Read' };
    case 'binary-metadata':
      return { action: 'inspect', label: 'Inspect' };
    default:
      return { action: 'preview', label: 'Preview' };
  }
}

/**
 * Rejects any fixture whose `declaredVerified` disagrees with the recorded `verification` state.
 * This is the enforcement point for TEST-009's negative control: a failed or unverified build
 * that claims Verified must fail here, not render silently (SCN-OUT-05, ORACLE-013).
 */
export function validateArtifactFixture(fixture: ArtifactFixture): ArtifactFixture {
  const isVerified = fixture.verification === 'verified';
  if (fixture.declaredVerified !== undefined && fixture.declaredVerified !== isVerified) {
    throw new ArtifactFixtureValidationError(
      `Fixture "${fixture.id}" declares verified=${String(fixture.declaredVerified)} but its recorded ` +
        `verification state is "${fixture.verification}". A failed or unverified build must never be ` +
        'declared Verified.',
      fixture.id,
    );
  }
  return fixture;
}

function toTile(fixture: ArtifactFixture): ArtifactTile {
  const previewKind = derivePreviewKind(fixture.medium);
  const { action, label } = derivePrimaryAction(previewKind);
  return {
    id: fixture.id,
    title: fixture.title,
    medium: fixture.medium,
    previewKind,
    canonicalityLabel: CANONICALITY_LABELS[fixture.canonicality],
    isCanonical: fixture.canonicality === 'canonical',
    verificationLabel: VERIFICATION_LABELS[fixture.verification],
    isVerified: fixture.verification === 'verified',
    lineage: fixture.lineage,
    lineageRouteId: fixture.lineageRouteId,
    createdAt: fixture.createdAt,
    hash: fixture.hash,
    path: fixture.path,
    sizeBytes: fixture.sizeBytes,
    mimeType: fixture.mimeType,
    htmlContent: fixture.htmlContent,
    textContent: fixture.textContent,
    previewSrc: fixture.previewSrc,
    primaryAction: action,
    primaryActionLabel: label,
  };
}

/**
 * Validates every fixture, then projects to tiles ordered recent-first (DEC-012: "Default:
 * important/recent, not every generated file").
 */
export function projectArtifacts(fixtures: ArtifactFixture[]): ArtifactRegistry {
  const validated = fixtures.map(validateArtifactFixture);
  const tiles = validated.map(toTile).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { tiles };
}

/** Pure display helper: renders a byte count as a compact human-readable size string. */
export function formatArtifactSize(sizeBytes: number | undefined): string {
  if (sizeBytes === undefined) return 'Unknown size';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = sizeBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
