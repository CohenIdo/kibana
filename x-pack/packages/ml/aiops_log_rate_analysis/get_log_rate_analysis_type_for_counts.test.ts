/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from './log_rate_analysis_type';
import { getLogRateAnalysisTypeForCounts } from './get_log_rate_analysis_type_for_counts';

const windowParameters = {
  baselineMin: 1654579807500,
  baselineMax: 1654586107500,
  deviationMin: 1654586400000,
  deviationMax: 1654587007500,
};

describe('getLogRateAnalysisTypeForCounts', () => {
  it('returns SPIKE when normalized deviation count is higher than baseline count', () => {
    const result = getLogRateAnalysisTypeForCounts({
      baselineCount: 100,
      deviationCount: 200,
      windowParameters,
    });

    expect(result).toEqual(LOG_RATE_ANALYSIS_TYPE.SPIKE);
  });

  it('returns DIP when normalized deviation count is lower than baseline count', () => {
    const result = getLogRateAnalysisTypeForCounts({
      baselineCount: 20000,
      deviationCount: 10,
      windowParameters,
    });

    expect(result).toEqual(LOG_RATE_ANALYSIS_TYPE.DIP);
  });

  it('handles zero baseline count without throwing error', () => {
    const result = getLogRateAnalysisTypeForCounts({
      baselineCount: 0,
      deviationCount: 100,
      windowParameters,
    });

    expect(result).toBe(LOG_RATE_ANALYSIS_TYPE.SPIKE);
  });

  it('handles zero deviation count without throwing error', () => {
    const result = getLogRateAnalysisTypeForCounts({
      baselineCount: 100,
      deviationCount: 0,
      windowParameters,
    });
    expect(result).toBe(LOG_RATE_ANALYSIS_TYPE.DIP);
  });
});
