import { CspBenchmarkRuleMetadata } from '../types/latest';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const CSP_RULE_TAG = 'Cloud Security';
const CSP_RULE_TAG_USE_CASE = 'Use Case: Configuration Audit';
const CSP_RULE_TAG_DATA_SOURCE_PREFIX = 'Data Source: ';

const STATIC_RULE_TAGS = [CSP_RULE_TAG, CSP_RULE_TAG_USE_CASE];

export function convertRuleTagsToKQL(tags: string[]): string {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(' AND ')})`;
}

/*
 * Returns an array of CspFinding tags that can be used to search and filter a detection rule
 */
export const getFindingsDetectionRuleSearchTags = (cspBenchmarkRule: CspBenchmarkRuleMetadata) => {
  // ex: cis_gcp to ['CIS', 'GCP']
  const benchmarkIdTags = cspBenchmarkRule.benchmark.id.split('_').map((tag) => tag.toUpperCase());
  // ex: 'CIS GCP 1.1'
  const benchmarkRuleNumberTag = `${cspBenchmarkRule.benchmark.id
    .replace('_', ' ')
    .toUpperCase()} ${cspBenchmarkRule.benchmark.rule_number}`;

  return benchmarkIdTags.concat([benchmarkRuleNumberTag]);
};

export const generateBenchmarkRuleTags = (rule: CspBenchmarkRuleMetadata) => {
  return [STATIC_RULE_TAGS]
    .concat(getFindingsDetectionRuleSearchTags(rule))
    .concat(
      rule.benchmark.posture_type
        ? [
            rule.benchmark.posture_type.toUpperCase(),
            `${CSP_RULE_TAG_DATA_SOURCE_PREFIX}${rule.benchmark.posture_type.toUpperCase()}`,
          ]
        : []
    )
    .concat(rule.benchmark.posture_type === 'cspm' ? ['Domain: Cloud'] : ['Domain: Container'])
    .flat();
};
