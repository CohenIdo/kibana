/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { number } from 'io-ts';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { Pagination } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { EsHitRecord } from '@kbn/discover-utils/types';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { FindingsBaseEsQuery } from '../../../common/types';
import { getAggregationCount, getFindingsCountAggQuery } from '../utils/utils';
import {
  CSP_LATEST_FINDINGS_DATA_VIEW,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '../../../../common/constants';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import { useGetCspBenchmarkRulesStatesApi } from '../../../common/api/use_get_benchmark_rules_state_api';
import { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-plugin/common/types/latest';

interface UseFindingsOptions extends FindingsBaseEsQuery {
  sort: string[][];
  enabled: boolean;
}

export interface FindingsGroupByNoneQuery {
  pageIndex: Pagination['pageIndex'];
  sort: any;
}

type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

const buildMutedRulesFilter = (rulesStates: any) => {
  // const getRulesStatesResponse = await useGetCspBenchmarkRulesStatesApi();

  console.log('**************************');
  console.log({ rulesStates });
  console.log('**************************');
  // const rulesStates = getRulesStatesResponse.data as CspBenchmarkRulesStates;

  // console.log({ rulesStates });
  const mustNotFilter = [];
  const mutedRules = Object.fromEntries(
    Object.entries(rulesStates).filter(([key, value]) => value.muted === true)
  );
  for (const key in mutedRules) {
    if (mutedRules.hasOwnProperty(key)) {
      const rule = mutedRules[key];
      const mustNotClause = {
        bool: {
          must: [
            { term: { 'rule.benchmark.id': rule.benchmark_id } },
            { term: { 'rule.benchmark.version': rule.benchmark_version } },
            { term: { 'rule.benchmark.rule_number ': rule.rule_number } },
          ],
        },
      };

      mustNotFilter.push(mustNotClause);
    }
  }

  console.log({ mustNotFilter });

  return mustNotFilter;
};
export const getFindingsQuery = async (
  { query, sort }: UseFindingsOptions,
  rulesStates: any,
  pageParam: any
) => ({
  index: CSP_LATEST_FINDINGS_DATA_VIEW,
  sort: getMultiFieldsSort(sort),
  size: MAX_FINDINGS_TO_LOAD,
  aggs: getFindingsCountAggQuery(),
  ignore_unavailable: false,
  query: {
    bool: {
      must_not: [
        {
          term: {
            'rule.benchmark.id': {
              value: 'cis_gcp',
            },
          },
        },
        // Add more must_not conditions if needed
      ],
      ...query?.bool,
      filter: [
        ...(query?.bool?.filter ?? []),
        {
          range: {
            '@timestamp': {
              gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
              lte: 'now',
            },
          },
        },
      ],
    },
  },
  ...(pageParam ? { search_after: pageParam } : {}),
});

// export const getFindingsQuery = async (
//   { query, sort }: UseFindingsOptions,
//   rulesStates: any,
//   pageParam: any
// ) => ({
//   index: CSP_LATEST_FINDINGS_DATA_VIEW,
//   sort: getMultiFieldsSort(sort),
//   size: MAX_FINDINGS_TO_LOAD,
//   aggs: getFindingsCountAggQuery(),
//   ignore_unavailable: false,
//   query: {
//     ...query,
//     bool: {
//       // must_not: buildMutedRulesFilter(rulesStates),
//       must_not: [
//         {
//           term: {
//             'rule.benchmark.id': {
//               value: 'cis_gcp',
//             },
//           },
//         },
//       ],
//       ...query?.bool,
//       filter: [
//         ...(query?.bool?.filter ?? []),
//         {
//           range: {
//             '@timestamp': {
//               gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
//               lte: 'now',
//             },
//           },
//         },
//       ],
//     },
//   },
//   ...(pageParam ? { search_after: pageParam } : {}),
// });

const getMultiFieldsSort = (sort: string[][]) => {
  return sort.map(([id, direction]) => {
    return {
      ...getSortField({ field: id, direction }),
    };
  });
};

/**
 * By default, ES will sort keyword fields in case-sensitive format, the
 * following fields are required to have a case-insensitive sorting.
 */
const fieldsRequiredSortingByPainlessScript = [
  'rule.section',
  'resource.name',
  'resource.sub_type',
];

/**
 * Generates Painless sorting if the given field is matched or returns default sorting
 * This painless script will sort the field in case-insensitive manner
 */
const getSortField = ({ field, direction }: { field: string; direction: string }) => {
  if (fieldsRequiredSortingByPainlessScript.includes(field)) {
    return {
      _script: {
        type: 'string',
        order: direction,
        script: {
          source: `doc["${field}"].value.toLowerCase()`,
          lang: 'painless',
        },
      },
    };
  }
  return { [field]: direction };
};

export const useLatestFindings = (options: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const { data: rulesStates, status, isSuccess } = useGetCspBenchmarkRulesStatesApi();

  return useInfiniteQuery(
    ['csp_findings', { params: options }],
    async ({ pageParam }) => {
      // const getRulesStatesResponse = await useGetCspBenchmarkRulesStatesApi();

      // console.log({ getRulesStatesResponse });
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: await getFindingsQuery(options, rulesStates, pageParam),
        })
      );
      if (!aggregations) throw new Error('expected aggregations to be an defined');
      if (!Array.isArray(aggregations.count.buckets))
        throw new Error('expected buckets to be an array');
      console.log('ORCHO', number.is(hits.total) ? hits.total : 0);
      return {
        page: hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord)),
        total: number.is(hits.total) ? hits.total : 0,
        count: getAggregationCount(aggregations.count.buckets),
      };
    },
    {
      // TODO: handle when rules states is empty and errors
      enabled: options.enabled && !!rulesStates,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
      getNextPageParam: (lastPage) => {
        if (lastPage.page.length === 0) return undefined;
        return lastPage.page[lastPage.page.length - 1].raw.sort;
      },
    }
  );
};
