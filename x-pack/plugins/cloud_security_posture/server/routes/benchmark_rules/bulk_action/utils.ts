/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { FindResult, RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleParams } from '@kbn/alerting-plugin/server/application/rule/types';
import {
  convertRuleTagsToKQL,
  generateBenchmarkRuleTags,
} from '../../../../common/utils/detection_rules';
import {
  CspBenchmarkRule,
  CspBenchmarkRulesStates,
  CspSettings,
} from '../../../../common/types/rules/v3';

import {
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

const disableDetectionRules = async (
  detectionRulesClient: RulesClient,
  detectionRules: Array<FindResult<RuleParams>>
) => {
  const idsToDisable = detectionRules
    .map((detectionRule) => {
      return detectionRule.data.map((data) => data.id);
    })
    .flat();
  if (!idsToDisable.length) return;
  return await detectionRulesClient.bulkDisableRules({ ids: idsToDisable });
};

export const getDetectionRules = async (
  detectionRulesClient: RulesClient,
  rulesTags: string[][]
): Promise<Array<FindResult<RuleParams>>> => {
  const detectionRules = Promise.all(
    rulesTags.map(async (ruleTags) => {
      return detectionRulesClient.find({
        excludeFromPublicApi: false,
        options: {
          filter: convertRuleTagsToKQL(ruleTags),
          searchFields: ['tags'],
          page: 1,
          per_page: 1,
        },
      });
    })
  );

  return detectionRules;
};

export const getBenchmarkRules = async (
  soClient: SavedObjectsClientContract,
  ruleIds: string[]
): Promise<Array<CspBenchmarkRule | undefined>> => {
  const bulkGetObject = ruleIds.map((ruleId) => ({
    id: ruleId,
    type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  }));
  const cspBenchmarkRulesSo = await soClient.bulkGet<CspBenchmarkRule>(bulkGetObject);

  const benchmarkRules = cspBenchmarkRulesSo.saved_objects.map(
    (cspBenchmarkRule) => cspBenchmarkRule.attributes
  );
  return benchmarkRules;
};

export const muteDetectionRules = async (
  soClient: SavedObjectsClientContract,
  detectionRulesClient: RulesClient,
  rulesIds: string[]
): Promise<number> => {
  const benchmarkRules = await getBenchmarkRules(soClient, rulesIds);
  if (benchmarkRules.includes(undefined))
    throw new Error('At least one of the provided benchmark rule id not exists');
  const benchmarkRulesTags = benchmarkRules.map((benchmarkRule) =>
    generateBenchmarkRuleTags(benchmarkRule!.metadata)
  );

  const detectionRules = await getDetectionRules(detectionRulesClient, benchmarkRulesTags);

  const disabledDetectionRules = await disableDetectionRules(detectionRulesClient, detectionRules);

  return disabledDetectionRules ? disabledDetectionRules.rules.length : 0;
};

export const updateRulesStates = async (
  encryptedSoClient: SavedObjectsClientContract,
  newRulesStates: CspBenchmarkRulesStates
): Promise<SavedObjectsUpdateResponse<CspSettings>> => {
  return await encryptedSoClient.update<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
    { rules: newRulesStates }
  );
};

export const setRulesStates = (
  rulesStates: CspBenchmarkRulesStates,
  ruleKeys: string[],
  state: boolean
): CspBenchmarkRulesStates => {
  ruleKeys.forEach((ruleKey) => {
    if (rulesStates[ruleKey]) {
      // Rule exists, set entry
      rulesStates[ruleKey] = {
        muted: state,
        benchmarkId: '',
        benchmarkVersion: '',
        ruleNumber: '',
        ruleId: '',
      };
    } else {
      // Rule does not exist, create an entry
      rulesStates[ruleKey] = {
        muted: state,
        benchmarkId: '',
        benchmarkVersion: '',
        ruleNumber: '',
        ruleId: '',
      };
    }
  });
  return rulesStates;
};

export const createCspSettingObject = async (encryptedSoClient: SavedObjectsClientContract) => {
  return encryptedSoClient.create<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    {
      rules: {},
    },
    { id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID }
  );
};

export const createCspSettingObjectSafe = async (
  encryptedSoClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const cspSettings = await getCspSettingsSafe(encryptedSoClient, logger);
  return cspSettings;
};

export const getCspSettingsSafe = async (
  encryptedSoClient: SavedObjectsClientContract,
  logger: Logger
): Promise<CspSettings> => {
  try {
    const cspSettings = await encryptedSoClient.get<CspSettings>(
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID
    );
    return cspSettings.attributes;
  } catch (err) {
    const error = transformError(err);
    logger.error(`An error occurred while trying to fetch csp settings: ${error}`);
    logger.warn(`Trying to create new csp settings object`);
    return (await createCspSettingObject(encryptedSoClient)).attributes;
  }
};

export const buildRuleKey = (benchmarkId: string, benchmarkVersion: string, ruleNumber: string) => {
  return `${benchmarkId};${benchmarkVersion};${ruleNumber}`;
};
