/**
 * A device entry from the `devices` array in config.json (see config.schema.json).
 */
export type TapoDeviceConfig = {
  name?: string;
  /** IP address or hostname of the device. */
  host: string;
  /** Plug | PowerPlug | Light | WhiteLight | Colorlight (case-insensitive). Defaults to Plug. */
  type?: string;
  port?: number;
  /** (seconds) How often the device state is polled. Defaults to 10. */
  updateInterval?: number;
  /** (seconds) Request timeout for this device. Defaults to 2. */
  timeout?: number;
};

export type TapoConfig = {
  name: string;
  username: string;
  password: string;

  discoveryOptions: {
    devices: Array<TapoDeviceConfig> | undefined;
  };
};

const defaultConfig = {
  name: 'Tapo Smart Platform',
  username: '',
  password: '',
  devices: undefined as Array<TapoDeviceConfig> | undefined,
};

export function parseConfig(
  config: Record<string, unknown>,
): TapoConfig {
  // Like lodash.defaults: only fill keys that are missing or undefined.
  const c: Record<string, unknown> = { ...defaultConfig };
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) {
      c[key] = value;
    }
  }

  return {
    name: c.name as string,
    username: c.username as string,
    password: c.password as string,

    discoveryOptions: {
      devices: c.devices as Array<TapoDeviceConfig> | undefined,
    },
  };
}
