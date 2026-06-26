import type { ServerState } from '../types/game';
import type { Rng } from './rng';
import {
  assertContentValid,
  validateContent,
  type ContentValidationIssue,
} from '../content/validateContent';
import {
  repairServerRuntime,
  validateServerRuntime,
  type RuntimeIssue,
} from './runtimeValidation';

export type ValidationIssue = ContentValidationIssue | RuntimeIssue;

export const validateRuntime = validateServerRuntime;

export const repairRuntime = (server: ServerState, _rng?: Rng): ServerState =>
  repairServerRuntime(server);

export const runAllStaticValidation = () => validateContent();

export const runAllRuntimeValidation = (server: ServerState, rng?: Rng) => {
  const repairedServer = repairRuntime(server, rng);
  return {
    server: repairedServer,
    contentIssues: validateContent(),
    runtimeIssues: validateRuntime(repairedServer),
  };
};

export {
  assertContentValid,
  validateContent,
  repairServerRuntime,
  validateServerRuntime,
};

export type {
  ContentValidationIssue,
  RuntimeIssue,
};
