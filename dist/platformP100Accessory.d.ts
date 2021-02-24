import { PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Logger } from 'homebridge';
import TapoPlatform from './platform';
/**
 * P100 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class P100Accessory {
    readonly log: Logger;
    private readonly platform;
    private readonly accessory;
    private service;
    private p100;
    constructor(log: Logger, platform: TapoPlatform, accessory: PlatformAccessory);
    /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory.
     */
    setOn(value: CharacteristicValue, callback: CharacteristicSetCallback): void;
    /**
     * Handle the "GET" requests from HomeKit
     * These are sent when HomeKit wants to know the current state of the accessory.
     *
     */
    getOn(callback: CharacteristicGetCallback): void;
    /**
     * Handle requests to get the current value of the "Outlet In Use" characteristic
     */
    handleOutletInUseGet(callback: CharacteristicGetCallback): void;
}
//# sourceMappingURL=platformP100Accessory.d.ts.map