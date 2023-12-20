/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import {
  buildRuleKey,
  getBenchmarkRules,
  muteDetectionRules,
  setRulesStates,
  updateRulesStates,
} from './utils';
import type {
  BulkActionBenchmarkRulesResponse,
  CspBenchmarkRule,
  CspBenchmarkRules,
} from '../../../../common/types/rules/v3';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const bulkActionBenchmarkRulesHandler = async (
  soClient: SavedObjectsClientContract,
  encryptedSoClient: SavedObjectsClientContract,
  detectionRulesClient: RulesClient,
  rulesToUpdate: CspBenchmarkRules,
  action: 'mute' | 'unmute',
  logger: Logger
): Promise<BulkActionBenchmarkRulesResponse> => {
  const rulesIds = rulesToUpdate.map((rule) => rule.rule_id);
  const benchmarkRules = await getBenchmarkRules(soClient, rulesIds);

  if (benchmarkRules.includes(undefined))
    throw new Error('At least one of the provided benchmark rule IDs does not exist');

  const rulesKeys = rulesToUpdate.map((rule) =>
    buildRuleKey(rule.benchmark_id, rule.benchmark_version, rule.rule_number)
  );

  const benchmarkRulesSafe = benchmarkRules as CspBenchmarkRule[]; // verified all rules are exists.

  const newRulesStates = setRulesStates(rulesKeys, muteStatesMap[action], benchmarkRulesSafe);

  const newCspSettings = await updateRulesStates(encryptedSoClient, newRulesStates);

  const disabledRulesCounter = await muteDetectionRules(soClient, detectionRulesClient, rulesIds);

  return { newCspSettings, disabledRulesCounter };
};
