import { describe, expect, it } from 'vitest';
import {
  ArtifactFixtureValidationError,
  derivePreviewKind,
  formatArtifactSize,
  projectArtifacts,
  validateArtifactFixture,
  type ArtifactFixture,
} from '../../src/core/projection/OutputProjection.js';

const fixtures: ArtifactFixture[] = [
  {
    id: 'art_json',
    title: 'Canonical mission record',
    medium: 'json',
    canonicality: 'canonical',
    verification: 'verified',
    declaredVerified: true,
    lineage: 'Canonical project record',
    createdAt: '2026-09-15T18:00:00Z',
    textContent: '{"id":"x"}',
  },
  {
    id: 'art_html',
    title: 'Generated report',
    medium: 'html',
    canonicality: 'generated',
    verification: 'verified',
    declaredVerified: true,
    lineage: 'Generated from canonical record',
    createdAt: '2026-09-15T19:00:00Z',
    htmlContent: '<p>ok</p>',
  },
  {
    id: 'art_binary',
    title: 'Installer',
    medium: 'binary',
    canonicality: 'generated',
    verification: 'unverified',
    declaredVerified: false,
    lineage: 'Packaged by release pipeline',
    createdAt: '2026-09-15T17:00:00Z',
    hash: 'sha256:abc',
    path: 'dist/installer.apk',
    sizeBytes: 1024,
  },
  {
    id: 'art_failed',
    title: 'Failed render',
    medium: 'video',
    canonicality: 'generated',
    verification: 'failed',
    declaredVerified: false,
    lineage: 'Render pipeline · build failed',
    createdAt: '2026-09-15T16:00:00Z',
  },
];

describe('TEST-009: Output artifact registry — canonicality and verification independence, security posture', () => {
  it('derives a distinct preview kind per medium, with binary always metadata-only (ORACLE-027)', () => {
    expect(derivePreviewKind('json')).toBe('text');
    expect(derivePreviewKind('text')).toBe('text');
    expect(derivePreviewKind('html')).toBe('html-sandbox');
    expect(derivePreviewKind('image')).toBe('image');
    expect(derivePreviewKind('audio')).toBe('audio');
    expect(derivePreviewKind('video')).toBe('video');
    expect(derivePreviewKind('pdf')).toBe('pdf');
    expect(derivePreviewKind('binary')).toBe('binary-metadata');
  });

  it('positive proof: canonicality and verification vary independently (ORACLE-013)', () => {
    const { tiles } = projectArtifacts(fixtures);
    const json = tiles.find((tile) => tile.id === 'art_json')!;
    const html = tiles.find((tile) => tile.id === 'art_html')!;
    expect(json.canonicalityLabel).toBe('Canonical/editable');
    expect(json.isCanonical).toBe(true);
    expect(json.verificationLabel).toBe('Verified');
    expect(json.isVerified).toBe(true);
    expect(html.canonicalityLabel).toBe('Generated/distributable');
    expect(html.isCanonical).toBe(false);
    expect(html.verificationLabel).toBe('Verified');
  });

  it('SCN-OUT-05: a failed build remains inspectable but never shows Verified', () => {
    const { tiles } = projectArtifacts(fixtures);
    const failed = tiles.find((tile) => tile.id === 'art_failed')!;
    expect(failed).toBeDefined();
    expect(failed.verificationLabel).toBe('Failed');
    expect(failed.isVerified).toBe(false);
  });

  it('negative control: a fixture that declares Verified while its recorded state is not Verified fails', () => {
    const badFixture: ArtifactFixture = {
      id: 'art_bad',
      title: 'Invalid demo fixture',
      medium: 'binary',
      canonicality: 'generated',
      verification: 'failed',
      declaredVerified: true,
      lineage: 'x',
      createdAt: '2026-09-15T20:00:00Z',
    };
    expect(() => validateArtifactFixture(badFixture)).toThrow(ArtifactFixtureValidationError);
    expect(() => projectArtifacts([...fixtures, badFixture])).toThrow(/never be declared Verified/i);
  });

  it('SCN-OUT-04: binary artifacts resolve to metadata-only tiles carrying hash/path, never a live/embedded preview source', () => {
    const { tiles } = projectArtifacts(fixtures);
    const binary = tiles.find((tile) => tile.id === 'art_binary')!;
    expect(binary.previewKind).toBe('binary-metadata');
    expect(binary.hash).toBe('sha256:abc');
    expect(binary.path).toBe('dist/installer.apk');
    expect(binary.htmlContent).toBeUndefined();
    expect(binary.previewSrc).toBeUndefined();
  });

  it('orders tiles recent-first (DEC-012: default important/recent)', () => {
    const { tiles } = projectArtifacts(fixtures);
    expect(tiles.map((tile) => tile.id)).toEqual(['art_html', 'art_json', 'art_binary', 'art_failed']);
  });

  it('formatArtifactSize renders compact human-readable sizes', () => {
    expect(formatArtifactSize(undefined)).toBe('Unknown size');
    expect(formatArtifactSize(512)).toBe('512 B');
    expect(formatArtifactSize(2048)).toBe('2.0 KB');
    expect(formatArtifactSize(5_242_880)).toBe('5.0 MB');
  });
});
