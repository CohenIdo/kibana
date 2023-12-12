/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { CspBenchmarkRulesStates, CspSettings } from '../../../../common/types/rules/v3';

import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

export const updateRulesStates = async (
  encryptedSoClient: SavedObjectsClientContract,
  newRulesStates: CspBenchmarkRulesStates
) => {
  return await encryptedSoClient.update<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
    { rules: newRulesStates }
  );
};

export const setRulesStates = (
  rulesStates: CspBenchmarkRulesStates,
  ruleIds: string[],
  state: boolean
): CspBenchmarkRulesStates => {
  ruleIds.forEach((ruleId) => {
    if (rulesStates[ruleId]) {
      // Rule exists, set entry
      rulesStates[ruleId] = { muted: state };
    } else {
      // Rule does not exist, create an entry
      rulesStates[ruleId] = { muted: state };
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
