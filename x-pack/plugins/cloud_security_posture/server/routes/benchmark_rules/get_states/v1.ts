/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { CspBenchmarkRulesStates, CspSettings } from '../../../../common/types/rules/v3';
import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

export const getMutedCspBenchmarkRulesHandler = async (
  encryptedSoClient: SavedObjectsClientContract
): Promise<CspBenchmarkRulesStates> => {
  const getSoResponse = await encryptedSoClient.get<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID
  );

  const mutedRules = Object.fromEntries(
    Object.entries(getSoResponse.attributes.rules).filter(([key, value]) => value.muted === true)
  );

  return mutedRules;
};
