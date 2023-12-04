/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE } from '../../common/constants';
import { cspSettingsSchema } from '../../common/schemas/csp_settings';
import { cspSettingsSavedObjectMapping } from './mappings';

export const cspSettings: SavedObjectsType = {
  name: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
  },
  schemas: {
    '8.12.0': cspSettingsSchema,
  },
  mappings: cspSettingsSavedObjectMapping,
};
