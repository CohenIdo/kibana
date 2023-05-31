/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX } from '../..';
import { SyncStatus, TriggerMethod } from '../../../common/types/connectors';

import { ErrorCode } from '../../../common/types/error_codes';

import { startConnectorSync } from './start_sync';

describe('startSync lib function', () => {
  const mockClient = {
    asCurrentUser: {
      get: jest.fn(),
      index: jest.fn(),
      update: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start a sync', async () => {
    mockClient.asCurrentUser.get.mockImplementationOnce(() => {
      return Promise.resolve({
        _id: 'connectorId',
        _source: {
          api_key_id: null,
          configuration: {},
          created_at: null,
          custom_scheduling: {},
          error: null,
          index_name: 'index_name',
          language: null,
          last_access_control_sync_status: null,
          last_seen: null,
          last_sync_error: null,
          last_sync_scheduled_at: null,
          last_sync_status: null,
          last_synced: null,
          scheduling: { enabled: true, interval: '1 2 3 4 5' },
          service_type: null,
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      startConnectorSync(mockClient as unknown as IScopedClusterClient, 'connectorId')
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration: {},
          filtering: null,
          id: 'connectorId',
          index_name: 'index_name',
          language: null,
          pipeline: null,
          service_type: null,
        },
        created_at: expect.any(String),
        deleted_document_count: 0,
        error: null,
        indexed_document_count: 0,
        indexed_document_volume: 0,
        last_seen: null,
        metadata: {},
        started_at: null,
        status: SyncStatus.PENDING,
        total_document_count: null,
        trigger_method: TriggerMethod.ON_DEMAND,
        worker_hostname: null,
      },
      index: CONNECTORS_JOBS_INDEX,
    });
  });
  it('should start a sync with service type, pipeline and nextSyncConfig', async () => {
    mockClient.asCurrentUser.get.mockImplementationOnce(() => {
      return Promise.resolve({
        _source: {
          api_key_id: null,
          configuration: { config: { label: 'label', value: 'haha' } },
          created_at: null,
          custom_scheduling: {},
          error: null,
          filtering: [{ active: 'filtering' }],
          index_name: 'index_name',
          language: 'nl',
          last_seen: null,
          last_sync_error: null,
          last_sync_status: null,
          last_synced: null,
          pipeline: { name: 'pipeline' },
          scheduling: { enabled: true, interval: '1 2 3 4 5' },
          service_type: 'service_type',
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      startConnectorSync(mockClient as unknown as IScopedClusterClient, 'connectorId', 'syncConfig')
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration: {
            config: { label: 'label', value: 'haha' },
            nextSyncConfig: { label: 'nextSyncConfig', value: 'syncConfig' },
          },
          filtering: 'filtering',
          id: 'connectorId',
          index_name: 'index_name',
          language: 'nl',
          pipeline: { name: 'pipeline' },
          service_type: 'service_type',
        },
        created_at: expect.any(String),
        deleted_document_count: 0,
        error: null,
        indexed_document_count: 0,
        indexed_document_volume: 0,
        last_seen: null,
        metadata: {},
        started_at: null,
        status: SyncStatus.PENDING,
        total_document_count: null,
        trigger_method: TriggerMethod.ON_DEMAND,
        worker_hostname: null,
      },
      index: CONNECTORS_JOBS_INDEX,
    });
  });

  it('should not create index if there is no connector', async () => {
    mockClient.asCurrentUser.get.mockImplementationOnce(() => {
      return Promise.resolve({});
    });
    await expect(
      startConnectorSync(mockClient as unknown as IScopedClusterClient, 'connectorId')
    ).rejects.toEqual(new Error(ErrorCode.RESOURCE_NOT_FOUND));
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
  });

  it('should set sync_now for crawler and not index a sync job', async () => {
    mockClient.asCurrentUser.get.mockImplementationOnce(() => {
      return Promise.resolve({
        _primary_term: 1,
        _seq_no: 10,
        _source: {
          api_key_id: null,
          configuration: { config: { label: 'label', value: 'haha' } },
          created_at: null,
          custom_scheduling: {},
          error: null,
          filtering: [{ active: 'filtering' }],
          index_name: 'index_name',
          language: 'nl',
          last_seen: null,
          last_sync_error: null,
          last_sync_status: null,
          last_synced: null,
          pipeline: { name: 'pipeline' },
          scheduling: { enabled: true, interval: '1 2 3 4 5' },
          service_type: 'elastic-crawler',
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.asCurrentUser.update.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      startConnectorSync(mockClient as unknown as IScopedClusterClient, 'connectorId', 'syncConfig')
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.update).toHaveBeenCalledWith({
      doc: {
        configuration: {
          config: { label: 'label', value: 'haha' },
          nextSyncConfig: { label: 'nextSyncConfig', value: 'syncConfig' },
        },
        sync_now: true,
      },
      id: 'connectorId',
      if_primary_term: 1,
      if_seq_no: 10,
      index: CONNECTORS_INDEX,
    });
  });
});
