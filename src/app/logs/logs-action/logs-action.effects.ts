import { Injectable, NgZone } from '@angular/core';
import { Effect, Actions, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { map, switchMap, withLatestFrom, catchError, tap, filter, takeUntil } from 'rxjs/operators';
import { of, Subject, empty, timer } from 'rxjs';
import { networkActionFilter } from '../../network/network-action/network-action.effects';

const logActionDestroy$ = new Subject();

@Injectable()
export class LogsActionEffects {

  @Effect()
  LogsActionLoad$ = this.actions$.pipe(
    ofType('LOGS_ACTION_LOAD'),

    // merge state
    withLatestFrom(this.store, (action: any, state) => ({ action, state })),

    switchMap(({ action, state }) => {
      return this.http.get(state.settingsNode.api.debugger + '/v2/log/?' +
        logsActionLimit(action, state) +
        logsActionCursor(action, state) +
        logsActionFilter(action, state)
      );
    }),

    // dispatch action
    map((payload) => ({ type: 'LOGS_ACTION_LOAD_SUCCESS', payload })),
    catchError((error, caught) => {
      console.error(error);
      this.store.dispatch({
        type: 'LOGS_ACTION_LOAD_ERROR',
        payload: error
      });
      return caught;
    })
  );

  @Effect()
  LogsActionFilter$ = this.actions$.pipe(
    ofType('LOGS_ACTION_FILTER'),

    // merge state
    withLatestFrom(this.store, (action: any, state) => ({ action, state })),

    tap(response => {
      logActionDestroy$.next();
      logsActionFilter(response.action, response.state);
    }),

    // dispatch action
    map((payload) => ({ type: 'LOGS_ACTION_START', payload })),
    catchError((error, caught) => {
      console.error(error);
      this.store.dispatch({
        type: 'LOGS_ACTION_FILTER_ERROR',
        payload: error
      });
      return caught;
    })
  );

  // load logs actions
  @Effect()
  LogsActionStartEffect$ = this.actions$.pipe(
    ofType('LOGS_ACTION_START'),

    // merge state
    withLatestFrom(this.store, (action: any, state) => ({ action, state })),

    switchMap(({ action, state }) =>
      // get header data every second
      timer(0, 1000).pipe(
        takeUntil(logActionDestroy$),
        switchMap(() =>
          this.http.get(state.settingsNode.api.debugger + '/v2/log/' +
            logsActionLimit(action, state) +
            logsActionCursor(action, state) +
            logsActionFilter(action, state)
          ).pipe(
            map(response => ({ type: 'LOGS_ACTION_START_SUCCESS', payload: response })),
            catchError(error => of({ type: 'LOGS_ACTION_START_ERROR', payload: error }))
          )
        )
      )
    )
  );

  // stop logs action download
  @Effect({ dispatch: false })
  LogsActionStopEffect$ = this.actions$.pipe(
    ofType('LOGS_ACTION_STOP'),
    // merge state
    withLatestFrom(this.store, (action: any, state) => ({ action, state })),
    // init app modules
    tap(({ action, state }) => {
      // console.log('[LOGS_ACTION_STOP] stream', state.logsAction.stream);
      // close all open observables
      // if (state.logsAction.stream) {
      logActionDestroy$.next();
      // }
    })
  );

  constructor(
    private http: HttpClient,
    private actions$: Actions,
    private store: Store<any>
  ) {
  }

}

// use limit to load just the necessary number of records
export function logsActionLimit(action, state) {
  const limitNr = action.payload && action.payload.limit ?
    action.payload.limit :
    '120';

  return `?limit=${limitNr}`;
}

// use cursor to load previous pages
export function logsActionCursor(action, state) {
  return action.payload && action.payload.cursor_id ?
    `&cursor_id=${action.payload.cursor_id}` :
    '';
}

// filter logs action
export function logsActionFilter(action, state) {
  let filterType = '';
  debugger;

  if (state.logsAction && state.logsAction.filter) {
    const stateFilter = state.logsAction.filter;

    filterType = stateFilter.trace ? filterType + 'trace,' : filterType;
    filterType = stateFilter.debug ? filterType + 'debug,' : filterType;
    filterType = stateFilter.info ? filterType + 'info,' : filterType;
    filterType = stateFilter.notice ? filterType + 'notice,' : filterType;
    filterType = stateFilter.warn ? filterType + 'warn,' : filterType;
    filterType = stateFilter.warning ? filterType + 'warning,' : filterType;
    filterType = stateFilter.error ? filterType + 'error,' : filterType;
    filterType = stateFilter.fatal ? filterType + 'fatal,' : filterType;

    // remove the last ,
    filterType = filterType.length > 0 ? '&level=' + filterType.slice(0, -1) : '';
  }

  return filterType;
}
