import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

export const DERIVED_DIRECTORY = '.mozare';
export const CACHE_DIRECTORY = join(DERIVED_DIRECTORY, 'cache');
export const RUNTIME_DIRECTORY = join(DERIVED_DIRECTORY, 'runtime');

export type CanonicalObject = {
  id: string;
  type: string;
  project_id: string;
  name: string;
  lifecycle: string;
  evidence_state: string;
  use_status: string;
  verification_state: string;
  origin: { kind: string };
  relations: string[];
};

export type CanonicalRelation = {
  id: string;
  project_id: string;
  participants: string[];
  relation_type: string | null;
  classification_state: string;
  evidence_state: string;
  use_status: string;
  claimability: string;
  origin: { kind: string };
};

export type CanonicalProject = {
  id: string;
  name: string;
  kind: string;
  lifecycle: string;
  current_objective: string;
  current_question_id: string;
};

export type CanonicalArtifact = {
  id: string;
  name: string;
  kind: string;
  ref: string;
  canonicality: string;
  verification_state: string;
};

export type WorkspaceSnapshot = {
  project: CanonicalProject;
  objects: CanonicalObject[];
  relations: CanonicalRelation[];
  artifacts: CanonicalArtifact[];
};

export class WorkspaceValidationError extends Error {
  constructor(message: string, readonly file: string) {
    super(`${file}: ${message}`);
    this.name = 'WorkspaceValidationError';
  }
}

const projectSchema = {
  type: 'object', additionalProperties: true,
  required: ['id', 'name', 'kind', 'lifecycle', 'current_objective', 'current_question_id'],
  properties: {
    id: { type: 'string', minLength: 1 }, name: { type: 'string', minLength: 1 },
    kind: { type: 'string', minLength: 1 }, lifecycle: { type: 'string', minLength: 1 },
    current_objective: { type: 'string', minLength: 1 }, current_question_id: { type: 'string', minLength: 1 },
  },
};

const objectSchema = {
  type: 'object', additionalProperties: true,
  required: ['id', 'type', 'project_id', 'name', 'lifecycle', 'evidence_state', 'use_status', 'verification_state', 'origin', 'relations'],
  properties: {
    id: { type: 'string', minLength: 1 }, type: { type: 'string', minLength: 1 }, project_id: { type: 'string', minLength: 1 }, name: { type: 'string', minLength: 1 },
    lifecycle: { type: 'string', minLength: 1 }, evidence_state: { type: 'string', minLength: 1 }, use_status: { type: 'string', minLength: 1 }, verification_state: { type: 'string', minLength: 1 },
    origin: { type: 'object', required: ['kind'], properties: { kind: { type: 'string', minLength: 1 } }, additionalProperties: true },
    relations: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
};

const relationSchema = {
  type: 'object', additionalProperties: true,
  required: ['id', 'project_id', 'participants', 'relation_type', 'classification_state', 'evidence_state', 'use_status', 'claimability', 'origin'],
  properties: {
    id: { type: 'string', minLength: 1 }, project_id: { type: 'string', minLength: 1 }, participants: { type: 'array', minItems: 2, items: { type: 'string', minLength: 1 } },
    relation_type: { type: 'string', nullable: true }, classification_state: { type: 'string', minLength: 1 }, evidence_state: { type: 'string', minLength: 1 },
    use_status: { type: 'string', minLength: 1 }, claimability: { type: 'string', minLength: 1 },
    origin: { type: 'object', required: ['kind'], properties: { kind: { type: 'string', minLength: 1 } }, additionalProperties: true },
  },
};

const artifactRegistrySchema = {
  type: 'object', additionalProperties: false, required: ['artifacts'],
  properties: { artifacts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'name', 'kind', 'ref', 'canonicality', 'verification_state'], properties: {
    id: { type: 'string', minLength: 1 }, name: { type: 'string', minLength: 1 }, kind: { type: 'string', minLength: 1 }, ref: { type: 'string', minLength: 1 }, canonicality: { type: 'string', minLength: 1 }, verification_state: { type: 'string', minLength: 1 },
  } } } },
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateProject = ajv.compile(projectSchema);
const validateObject = ajv.compile(objectSchema);
const validateRelation = ajv.compile(relationSchema);
const validateArtifacts = ajv.compile(artifactRegistrySchema);

function parseYaml(file: string): unknown {
  try { return YAML.parse(readFileSync(file, 'utf8')); }
  catch (error) { throw new WorkspaceValidationError(error instanceof Error ? error.message : 'invalid YAML', file); }
}

function frontMatter(file: string): unknown {
  const content = readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) throw new WorkspaceValidationError('missing YAML front matter', file);
  try { return YAML.parse(match[1]); }
  catch (error) { throw new WorkspaceValidationError(error instanceof Error ? error.message : 'invalid YAML front matter', file); }
}

function assertValid<T>(valid: ValidateFunction, value: unknown, file: string): T {
  if (!valid(value)) throw new WorkspaceValidationError(ajv.errorsText(valid.errors), file);
  return value as T;
}

function files(directory: string, extension: string): string[] {
  if (!existsSync(directory)) throw new WorkspaceValidationError('required canonical directory is missing', directory);
  return readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(extension)).map((entry) => join(directory, entry.name)).sort();
}

/** Reads only canonical records. .mozare is derived and never a source of truth. */
export function loadWorkspace(workspaceRoot: string): WorkspaceSnapshot {
  const root = resolve(workspaceRoot);
  const projectFile = join(root, 'PROJECT.md');
  const project = assertValid<CanonicalProject>(validateProject, frontMatter(projectFile), projectFile);
  const objects = files(join(root, 'objects'), '.md').map((file) => assertValid<CanonicalObject>(validateObject, frontMatter(file), file));
  const relations = files(join(root, 'relations'), '.yaml').map((file) => assertValid<CanonicalRelation>(validateRelation, parseYaml(file), file));
  const artifactFile = join(root, 'artifacts', 'registry.yaml');
  const artifacts = assertValid<{ artifacts: CanonicalArtifact[] }>(validateArtifacts, parseYaml(artifactFile), artifactFile).artifacts;
  const ids = new Set<string>();
  for (const item of [...objects, ...relations, ...artifacts]) {
    if (ids.has(item.id)) throw new WorkspaceValidationError(`duplicate canonical ID ${item.id}`, root);
    ids.add(item.id);
  }
  if (!objects.some((object) => object.id === project.current_question_id)) throw new WorkspaceValidationError(`current_question_id ${project.current_question_id} is missing`, projectFile);
  for (const object of objects) {
    if (object.project_id !== project.id) throw new WorkspaceValidationError(`project_id ${object.project_id} does not match ${project.id}`, join(root, 'objects'));
    for (const relationId of object.relations) if (!relations.some((relation) => relation.id === relationId)) throw new WorkspaceValidationError(`unknown relation ${relationId}`, join(root, 'objects'));
  }
  for (const relation of relations) {
    if (relation.project_id !== project.id) throw new WorkspaceValidationError(`project_id ${relation.project_id} does not match ${project.id}`, join(root, 'relations'));
    for (const participant of relation.participants) if (!objects.some((object) => object.id === participant)) throw new WorkspaceValidationError(`unknown participant ${participant}`, join(root, 'relations'));
  }
  return { project, objects, relations, artifacts };
}

export function canonicalHash(workspace: WorkspaceSnapshot): string {
  return createHash('sha256').update(JSON.stringify(workspace)).digest('hex');
}

export function rebuildDerivedWorkspace(workspaceRoot: string): WorkspaceSnapshot {
  const snapshot = loadWorkspace(workspaceRoot);
  const cacheRoot = join(resolve(workspaceRoot), CACHE_DIRECTORY);
  mkdirSync(cacheRoot, { recursive: true });
  writeFileSync(join(cacheRoot, 'projection.json'), `${JSON.stringify({ canonicalHash: canonicalHash(snapshot), objectIds: snapshot.objects.map((object) => object.id), relationIds: snapshot.relations.map((relation) => relation.id) }, null, 2)}\n`, 'utf8');
  return snapshot;
}

export function clearDerivedWorkspace(workspaceRoot: string): void {
  const derivedRoot = join(resolve(workspaceRoot), DERIVED_DIRECTORY);
  if (existsSync(derivedRoot)) rmSync(derivedRoot, { recursive: true, force: true });
}

export function isCanonicalPath(workspaceRoot: string, candidate: string): boolean {
  const path = relative(resolve(workspaceRoot), resolve(candidate));
  return path !== '' && !path.startsWith(`..${sep}`) && path !== '..' && !path.split(sep).includes(DERIVED_DIRECTORY);
}
