import defaults from 'lodash.defaults';

export interface TapoConfigInput {
  // ==================
  // HomeKit
  // ------------------
  /**
   * Platform name
   * @defaultValue Tapo Smart Platform
   */
  name?: string;
  // ==================
  // Discovery
  // ------------------
  /**
   * (seconds) How often to check device status in the background
   * @defaultValue 10
   */
  pollingInterval?: number;
  /**
   * Manual list of devices
   */
  devices: Array<{ name?: string; host: string; type?: string | undefined; port?: number | undefined; 
    updateInterval?: number | undefined; timeout?: number; }>;
  /**
   * Username used in Tapo app
   */
  username: string;
  /**
   * Password used in Tapo app
   */
  password: string;
  // ==================
  // Advanced Settings
  // ------------------
  /**
   * (seconds) communication timeout
   * @defaultValue 15
   */
  timeout?: number;
  /**
   * (milliseconds) The time to wait to combine similar commands for a device before sending a command to a device
   * @defaultValue 100
   */
  waitTimeUpdate?: number;
}

type TapoConfigDefault = {
  name: string;
  username: string;
  password: string;

  pollingInterval: number;
  devices?: Array<{ name?: string; host: string; type?: string | 'plug'; port?: number | undefined; updateInterval?: number | 30; 
  timeout?: number | 2;}>;

  timeout: number;
  waitTimeUpdate: number;
};

export type TapoConfig = {
  name: string;
  username: string;
  password: string;
  waitTimeUpdate: number;

  defaultSendOptions: {
    timeout: number;
  };

  discoveryOptions: {
    discoveryInterval: number;
    deviceOptions: {
      defaultSendOptions: {
        timeout: number;
      };
    };
    devices: Array<{ name?: string; host: string; type?: string | undefined; port?: number | undefined; 
      updateInterval?: number | undefined; timeout?: number | undefined;}>;
  };
};

export const defaultConfig: TapoConfigDefault = {
  name: 'Tapo Smart Platform',
  username: '',
  password: '',
  pollingInterval: 10,
  devices: undefined,

  timeout: 15,
  waitTimeUpdate: 100,
};

export function parseConfig(
  config: Record<string, unknown>,
): TapoConfig {

  const c = defaults(config, defaultConfig);

  const defaultSendOptions = {
    timeout: c.timeout * 1000,
  };

  return {
    name: c.name,
    username: c.username,
    password: c.password,
    waitTimeUpdate: c.waitTimeUpdate,

    defaultSendOptions,

    discoveryOptions: {
      discoveryInterval: c.pollingInterval * 1000,
      deviceOptions: {
        defaultSendOptions,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      devices: c.devices,
    },
  };
}
