/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';

import { Row } from '../helpers';
import { RowRenderer, RowRendererContainer } from '../row_renderer';
import { ZeekDetails } from './zeek_details';

export const zeekRowRenderer: RowRenderer = {
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    return module != null && module.toLowerCase() === 'zeek';
  },
  renderRow: ({ browserFields, data, children }) => (
    <Row>
      {children}
      <RowRendererContainer>
        <ZeekDetails data={data} browserFields={browserFields} />
      </RowRendererContainer>
    </Row>
  ),
};
