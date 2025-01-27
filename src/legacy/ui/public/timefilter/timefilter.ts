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

import _ from 'lodash';
import { Subject, BehaviorSubject } from 'rxjs';
import moment, { Moment } from 'moment';
import { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
import chrome from 'ui/chrome';
import { UiSettingsClientContract } from 'src/core/public';
import { RefreshInterval, TimeRange } from 'src/plugins/data/public';
import { IndexPattern } from 'src/legacy/core_plugins/data/public';
import { IScope } from 'angular';
import { timeHistory } from './time_history';
import { areRefreshIntervalsDifferent, areTimeRangesDifferent } from './lib/diff_time_picker_vals';
import uiRoutes from '../routes';
import { parseQueryString } from './lib/parse_querystring';
import { calculateBounds, getTime } from './get_time';

// Timefilter accepts moment input but always returns string output
export type InputTimeRange =
  | TimeRange
  | {
      from: Moment;
      to: Moment;
    };

export class Timefilter {
  // Fired when isTimeRangeSelectorEnabled \ isAutoRefreshSelectorEnabled are toggled
  private enabledUpdated$ = new BehaviorSubject(false);
  // Fired when a user changes the timerange
  private timeUpdate$ = new Subject();
  // Fired when a user changes the the autorefresh settings
  private refreshIntervalUpdate$ = new Subject();
  // Used when search poll triggers an auto refresh
  private autoRefreshFetch$ = new Subject();
  private fetch$ = new Subject();

  private _time: TimeRange;
  private _refreshInterval!: RefreshInterval;

  public isTimeRangeSelectorEnabled: boolean = false;
  public isAutoRefreshSelectorEnabled: boolean = false;

  constructor(uiSettings: UiSettingsClientContract) {
    this._time = uiSettings.get('timepicker:timeDefaults');
    this.setRefreshInterval(uiSettings.get('timepicker:refreshIntervalDefaults'));
  }

  getEnabledUpdated$ = () => {
    return this.enabledUpdated$.asObservable();
  };

  getTimeUpdate$ = () => {
    return this.timeUpdate$.asObservable();
  };

  getRefreshIntervalUpdate$ = () => {
    return this.refreshIntervalUpdate$.asObservable();
  };

  getAutoRefreshFetch$ = () => {
    return this.autoRefreshFetch$.asObservable();
  };

  getFetch$ = () => {
    return this.fetch$.asObservable();
  };

  getTime = (): TimeRange => {
    const { from, to } = this._time;
    return {
      ...this._time,
      from: moment.isMoment(from) ? from.toISOString() : from,
      to: moment.isMoment(to) ? to.toISOString() : to,
    };
  };

  /**
   * Updates timefilter time.
   * Emits 'timeUpdate' and 'fetch' events when time changes
   * @param {Object} time
   * @property {string|moment} time.from
   * @property {string|moment} time.to
   */
  setTime = (time: InputTimeRange) => {
    // Object.assign used for partially composed updates
    const newTime = Object.assign(this.getTime(), time);
    if (areTimeRangesDifferent(this.getTime(), newTime)) {
      this._time = {
        from: newTime.from,
        to: newTime.to,
      };
      timeHistory.add(this._time);
      this.timeUpdate$.next();
      this.fetch$.next();
    }
  };

  getRefreshInterval = () => {
    return _.clone(this._refreshInterval);
  };

  /**
   * Set timefilter refresh interval.
   * @param {Object} refreshInterval
   * @property {number} time.value Refresh interval in milliseconds. Positive integer
   * @property {boolean} time.pause
   */
  setRefreshInterval = (refreshInterval: Partial<RefreshInterval>) => {
    const prevRefreshInterval = this.getRefreshInterval();
    const newRefreshInterval = { ...prevRefreshInterval, ...refreshInterval };
    // If the refresh interval is <= 0 handle that as a paused refresh
    if (newRefreshInterval.value <= 0) {
      newRefreshInterval.value = 0;
      newRefreshInterval.pause = true;
    }
    this._refreshInterval = {
      value: newRefreshInterval.value,
      pause: newRefreshInterval.pause,
    };
    // Only send out an event if we already had a previous refresh interval (not for the initial set)
    // and the old and new refresh interval are actually different.
    if (
      prevRefreshInterval &&
      areRefreshIntervalsDifferent(prevRefreshInterval, newRefreshInterval)
    ) {
      this.refreshIntervalUpdate$.next();
      if (!newRefreshInterval.pause && newRefreshInterval.value !== 0) {
        this.fetch$.next();
      }
    }
  };

  toggleRefresh = () => {
    this.setRefreshInterval({
      pause: !this._refreshInterval.pause,
      value: this._refreshInterval.value,
    });
  };

  createFilter = (indexPattern: IndexPattern, timeRange: TimeRange) => {
    return getTime(indexPattern, timeRange ? timeRange : this._time, this.getForceNow());
  };

  getBounds = () => {
    return this.calculateBounds(this._time);
  };

  getForceNow = () => {
    const forceNow = parseQueryString().forceNow as string;
    if (!forceNow) {
      return;
    }

    const ticks = Date.parse(forceNow);
    if (isNaN(ticks)) {
      throw new Error(`forceNow query parameter, ${forceNow}, can't be parsed by Date.parse`);
    }
    return new Date(ticks);
  };

  calculateBounds = (timeRange: TimeRange) => {
    return calculateBounds(timeRange, { forceNow: this.getForceNow() });
  };

  getActiveBounds = () => {
    if (this.isTimeRangeSelectorEnabled) {
      return this.getBounds();
    }
  };

  /**
   * Show the time bounds selector part of the time filter
   */
  enableTimeRangeSelector = () => {
    this.isTimeRangeSelectorEnabled = true;
    this.enabledUpdated$.next(true);
  };

  /**
   * Hide the time bounds selector part of the time filter
   */
  disableTimeRangeSelector = () => {
    this.isTimeRangeSelectorEnabled = false;
    this.enabledUpdated$.next(false);
  };

  /**
   * Show the auto refresh part of the time filter
   */
  enableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = true;
    this.enabledUpdated$.next(true);
  };

  /**
   * Hide the auto refresh part of the time filter
   */
  disableAutoRefreshSelector = () => {
    this.isAutoRefreshSelectorEnabled = false;
    this.enabledUpdated$.next(false);
  };

  notifyShouldFetch = () => {
    this.autoRefreshFetch$.next();
  };
}

export const timefilter = new Timefilter(chrome.getUiSettingsClient());

// TODO
// remove everything underneath once globalState is no longer an angular service
// and listener can be registered without angular.
function convertISO8601(stringTime: string): string {
  const obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
  return obj.isValid() ? obj.toString() : stringTime;
}

// Currently some parts of Kibana (index patterns, timefilter) rely on addSetupWork in the uiRouter
// and require it to be executed to properly function.
// This function is exposed for applications that do not use uiRoutes like APM
// Kibana issue https://github.com/elastic/kibana/issues/19110 tracks the removal of this dependency on uiRouter
export const registerTimefilterWithGlobalState = _.once((globalState: any, $rootScope: IScope) => {
  const uiSettings = chrome.getUiSettingsClient();
  const timeDefaults = uiSettings.get('timepicker:timeDefaults');
  const refreshIntervalDefaults = uiSettings.get('timepicker:refreshIntervalDefaults');

  timefilter.setTime(_.defaults(globalState.time || {}, timeDefaults));
  timefilter.setRefreshInterval(
    _.defaults(globalState.refreshInterval || {}, refreshIntervalDefaults)
  );

  globalState.on('fetch_with_changes', () => {
    // clone and default to {} in one
    const newTime: TimeRange = _.defaults({}, globalState.time, timeDefaults);
    const newRefreshInterval: RefreshInterval = _.defaults(
      {},
      globalState.refreshInterval,
      refreshIntervalDefaults
    );

    if (newTime) {
      if (newTime.to) newTime.to = convertISO8601(newTime.to);
      if (newTime.from) newTime.from = convertISO8601(newTime.from);
    }

    timefilter.setTime(newTime);
    timefilter.setRefreshInterval(newRefreshInterval);
  });

  const updateGlobalStateWithTime = () => {
    globalState.time = timefilter.getTime();
    globalState.refreshInterval = timefilter.getRefreshInterval();
    globalState.save();
  };

  subscribeWithScope($rootScope, timefilter.getRefreshIntervalUpdate$(), {
    next: updateGlobalStateWithTime,
  });

  subscribeWithScope($rootScope, timefilter.getTimeUpdate$(), {
    next: updateGlobalStateWithTime,
  });
});

uiRoutes.addSetupWork((globalState, $rootScope) => {
  return registerTimefilterWithGlobalState(globalState, $rootScope);
});
