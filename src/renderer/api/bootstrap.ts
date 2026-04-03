/**
 * API client bootstrap — MUST be imported before any module that calls getApiClient().
 *
 * ES module imports are hoisted, so this file exists as a dedicated module
 * whose side effect (creating + registering the ApiClient singleton) runs
 * before downstream imports like i18n that depend on it.
 */
import { ApiClient } from './client';
import { setApiClient } from './hooks';

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const apiServerUrl =
  (window as any).electronConfig?.serverUrl ?? `${wsProtocol}//${window.location.host}`;

export const apiClient = new ApiClient(apiServerUrl);
setApiClient(apiClient);
apiClient.connect();
