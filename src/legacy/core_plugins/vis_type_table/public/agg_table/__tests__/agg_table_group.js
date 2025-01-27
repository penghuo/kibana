/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import fixtures from 'fixtures/fake_hierarchical_data';
import { legacyResponseHandlerProvider } from 'ui/vis/response_handlers/legacy';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VisProvider } from 'ui/vis';
import { tabifyAggResponse } from 'ui/agg_response/tabify';

import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { createTableVisTypeDefinition } from '../../table_vis_type';
import { visualizations } from '../../../../visualizations/public';

describe('Table Vis - AggTableGroup Directive', function () {
  let $rootScope;
  let $compile;
  let Vis;
  let indexPattern;
  let tableAggResponse;
  let legacyDependencies;
  const tabifiedData = {};

  const init = () => {
    const vis1 = new Vis(indexPattern, 'table');
    tabifiedData.metricOnly = tabifyAggResponse(vis1.aggs, fixtures.metricOnly);

    const vis2 = new Vis(indexPattern, {
      type: 'pie',
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'terms', schema: 'split', params: { field: 'extension' } },
        { type: 'terms', schema: 'segment', params: { field: 'geo.src' } },
        { type: 'terms', schema: 'segment', params: { field: 'machine.os' } }
      ]
    });
    vis2.aggs.aggs.forEach(function (agg, i) {
      agg.id = 'agg_' + (i + 1);
    });
    tabifiedData.threeTermBuckets = tabifyAggResponse(vis2.aggs, fixtures.threeTermBuckets);
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    legacyDependencies = {
      // eslint-disable-next-line new-cap
      createAngularVisualization: VisFactoryProvider(Private).createAngularVisualization
    };

    visualizations.types.VisTypesRegistryProvider.register(() =>
      createTableVisTypeDefinition(legacyDependencies)
    );

    tableAggResponse = legacyResponseHandlerProvider().handler;
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    Vis = Private(VisProvider);

    $rootScope = $injector.get('$rootScope');
    $compile = $injector.get('$compile');

    init();
  }));

  let $scope;
  beforeEach(function () {
    $scope = $rootScope.$new();
  });
  afterEach(function () {
    $scope.$destroy();
  });

  it('renders a simple split response properly', async function () {
    $scope.dimensions = { metrics: [{ accessor: 0, format: { id: 'number' }, params: {} }], buckets: [] };
    $scope.group = await tableAggResponse(tabifiedData.metricOnly, $scope.dimensions);
    $scope.sort = {
      columnIndex: null,
      direction: null
    };
    const $el = $('<kbn-agg-table-group dimensions="dimensions" group="group"></kbn-agg-table-group>');

    $compile($el)($scope);
    $scope.$digest();

    // should create one sub-tbale
    expect($el.find('kbn-agg-table').length).to.be(1);
  });

  it('renders nothing if the table list is empty', function () {
    const $el = $('<kbn-agg-table-group dimensions="dimensions" group="group"></kbn-agg-table-group>');

    $scope.group = {
      tables: []
    };

    $compile($el)($scope);
    $scope.$digest();

    const $subTables = $el.find('kbn-agg-table');
    expect($subTables.length).to.be(0);
  });

  it('renders a complex response properly', async function () {
    $scope.dimensions = {
      splitRow: [{ accessor: 0, params: {} }],
      buckets: [{ accessor: 2, params: {} }, { accessor: 4, params: {} }],
      metrics: [{ accessor: 1, params: {} }, { accessor: 3, params: {} }, { accessor: 5, params: {} }]
    };
    const group = $scope.group = await tableAggResponse(tabifiedData.threeTermBuckets, $scope.dimensions);
    const $el = $('<kbn-agg-table-group dimensions="dimensions" group="group"></kbn-agg-table-group>');
    $compile($el)($scope);
    $scope.$digest();

    const $subTables = $el.find('kbn-agg-table');
    expect($subTables.length).to.be(3);

    const $subTableHeaders = $el.find('.kbnAggTable__groupHeader');
    expect($subTableHeaders.length).to.be(3);

    $subTableHeaders.each(function (i) {
      expect($(this).text()).to.be(group.tables[i].title);
    });
  });
});
