/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { getExceptionListItemResponseMockWithoutAutoGeneratedValues } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import {
  getCreateExceptionListItemMinimalSchemaMock,
  getCreateExceptionListItemMinimalSchemaMockWithoutId,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import {
  deleteAllExceptions,
  removeExceptionListItemServerGeneratedProperties,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless read_exception_list_items', () => {
    describe('reading exception list items', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('should be able to read a single exception list items using item_id', async () => {
        // create a simple exception list to read
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const { body } = await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const bodyToCompare = removeExceptionListItemServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(
          getExceptionListItemResponseMockWithoutAutoGeneratedValues(await utils.getUsername())
        );
      });

      it('should be able to read a single exception list item using id', async () => {
        // create a simple exception list to read
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create a simple exception list item to read
        const { body: createListBody } = await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${createListBody.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const bodyToCompare = removeExceptionListItemServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(
          getExceptionListItemResponseMockWithoutAutoGeneratedValues(await utils.getUsername())
        );
      });

      it('should be able to read a single list item with an auto-generated id', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create a simple exception list item to read
        const { body: createListBody } = await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMockWithoutId())
          .expect(200);

        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${createListBody.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const outputtedList: Partial<ExceptionListItemSchema> = {
          ...getExceptionListItemResponseMockWithoutAutoGeneratedValues(await utils.getUsername()),
          item_id: body.item_id,
        };

        const bodyToCompare = removeExceptionListItemServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputtedList);
      });

      it('should be able to read a single list item with an auto-generated item_id', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create a simple exception list item to read
        const { body: createListBody } = await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMockWithoutId())
          .expect(200);

        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${createListBody.item_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        const outputtedList: Partial<ExceptionListItemSchema> = {
          ...getExceptionListItemResponseMockWithoutAutoGeneratedValues(await utils.getUsername()),
          item_id: body.item_id,
        };

        const bodyToCompare = removeExceptionListItemServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputtedList);
      });

      it('should return 404 if given a fake id', async () => {
        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=c1e1b359-7ac1-4e96-bc81-c683c092436f`)
          .set('kbn-xsrf', 'true')
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'exception list item id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" does not exist',
        });
      });

      it('should return 404 if given a fake list_id', async () => {
        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=c1e1b359-7ac1-4e96-bc81-c683c092436f`)
          .set('kbn-xsrf', 'true')
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message:
            'exception list item item_id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" does not exist',
        });
      });
    });
  });
};
