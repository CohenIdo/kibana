/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCnvmUsageRecord } from './cnvm_metring_task';
import { getCspmUsageRecord } from './cspm_metring_task';
import type { MeteringCallbackInput, UsageRecord } from '../types';

export const CLOUD_SECURITY_TASK_TYPE = 'Cloud_Security';
export const AGGREGATION_PRECISION_THRESHOLD = 3000;

export const cloudSecurityMetringCallback = async ({
  esClient,
  cloudSetup,
  logger,
  taskId,
  lastSuccessfulReport,
}: MeteringCallbackInput): Promise<UsageRecord[]> => {
  const projectId = cloudSetup?.serverless?.projectId || 'missing project id';

  if (!cloudSetup?.serverless?.projectId) {
    logger.error('no project id found');
  }

  try {
    const cloudSecurityUsageRecords: UsageRecord[] = [];

    const cspmUsageRecord = await getCspmUsageRecord({
      esClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport,
    });

    if (cspmUsageRecord) {
      cloudSecurityUsageRecords.push(cspmUsageRecord);
    }

    const cnvmUsageRecord = await getCnvmUsageRecord({
      esClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport,
    });

    cnvmUsageRecord ? cloudSecurityUsageRecords.push(cnvmUsageRecord) : cloudSecurityUsageRecords;

    return cloudSecurityUsageRecords;
  } catch (err) {
    logger.error(`Failed to fetch Cloud Security metering data ${err}`);
    return [];
  }
};
