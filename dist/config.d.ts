export interface TapoConfigInput {
    /**
     * Platform name
     * @defaultValue Tapo Smart Platform
     */
    name?: string;
    /**
     * (seconds) How often to check device status in the background
     * @defaultValue 10
     */
    pollingInterval?: number;
    /**
     * Manual list of devices
     */
    devices: Array<{
        name?: string;
        host: string;
        type?: string | undefined;
        port?: number | undefined;
    }>;
    /**
     * Username used in Tapo app
     */
    username: string;
    /**
     * Password used in Tapo app
     */
    password: string;
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
declare type TapoConfigDefault = {
    name: string;
    username: string;
    password: string;
    pollingInterval: number;
    devices?: Array<{
        name?: string;
        host: string;
        type?: string | 'plug';
        port?: number | undefined;
    }>;
    timeout: number;
    waitTimeUpdate: number;
};
export declare type TapoConfig = {
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
        devices: Array<{
            name?: string;
            host: string;
            type?: string | undefined;
            port?: number | undefined;
        }>;
    };
};
export declare const defaultConfig: TapoConfigDefault;
export declare function parseConfig(config: Record<string, unknown>): TapoConfig;
export {};
//# sourceMappingURL=config.d.ts.map