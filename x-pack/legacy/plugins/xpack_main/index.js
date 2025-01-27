/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import dedent from 'dedent';
import {
  XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS
} from '../../server/lib/constants';
import { getXpackConfigWithDeprecated } from '../telemetry/common/get_xpack_config_with_deprecated';
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { replaceInjectedVars } from './server/lib/replace_injected_vars';
import { setupXPackMain } from './server/lib/setup_xpack_main';
import {
  xpackInfoRoute,
  featuresRoute,
  settingsRoute,
} from './server/routes/api/v1';

import { registerOssFeatures } from './server/lib/register_oss_features';
import { uiCapabilitiesForFeatures } from './server/lib/ui_capabilities_for_features';
import { has } from 'lodash';

function movedToTelemetry(configPath) {
  return (settings, log) => {
    if (has(settings, configPath)) {
      log(`Config key ${configPath} is deprecated. Use "xpack.telemetry.${configPath}" instead.`);
    }
  };
}

export { callClusterFactory } from './server/lib/call_cluster_factory';
export const xpackMain = (kibana) => {
  return new kibana.Plugin({
    id: 'xpack_main',
    configPrefix: 'xpack.xpack_main',
    publicDir: resolve(__dirname, 'public'),
    require: ['elasticsearch'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        telemetry: Joi.object({
          config: Joi.string().default(),
          enabled: Joi.boolean().default(),
          url: Joi.string().default(),
        }).default(), // deprecated
        xpack_api_polling_frequency_millis: Joi.number().default(XPACK_INFO_API_DEFAULT_POLL_FREQUENCY_IN_MILLIS),
      }).default();
    },

    uiCapabilities(server) {
      return uiCapabilitiesForFeatures(server.plugins.xpack_main);
    },

    uiExports: {
      hacks: [
        'plugins/xpack_main/hacks/check_xpack_info_change',
      ],
      replaceInjectedVars,
      injectDefaultVars(server) {
        const config = server.config();

        return {
          telemetryEnabled: getXpackConfigWithDeprecated(config, 'telemetry.enabled'),
          activeSpace: null,
          spacesEnabled: config.get('xpack.spaces.enabled'),
        };
      },
      __webpackPluginProvider__(webpack) {
        return new webpack.BannerPlugin({
          banner: dedent`
            /*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
             * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
          `,
          raw: true,
        });
      },
    },

    init(server) {
      mirrorPluginStatus(server.plugins.elasticsearch, this, 'yellow', 'red');

      setupXPackMain(server);
      const { types: savedObjectTypes } = server.savedObjects;
      const config = server.config();
      const isTimelionUiEnabled = config.get('timelion.enabled') && config.get('timelion.ui.enabled');
      registerOssFeatures(server.plugins.xpack_main.registerFeature, savedObjectTypes, isTimelionUiEnabled);

      // register routes
      xpackInfoRoute(server);
      settingsRoute(server, this.kbnServer);
      featuresRoute(server);
    },
    deprecations: () => [
      movedToTelemetry('telemetry.config'),
      movedToTelemetry('telemetry.url'),
      movedToTelemetry('telemetry.enabled'),
    ],
  });
};
