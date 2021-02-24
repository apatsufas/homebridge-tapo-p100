"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P100Accessory = void 0;
const p100_1 = __importDefault(require("./utils/p100"));
/**
 * P100 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class P100Accessory {
    constructor(log, platform, accessory) {
        this.log = log;
        this.platform = platform;
        this.accessory = accessory;
        this.log.debug('Start adding accessory: ' + accessory.context.device.host);
        this.p100 = new p100_1.default(this.log, accessory.context.device.host, platform.config.username, platform.config.password);
        this.p100.handshake().then(() => {
            this.p100.login().then(() => {
                this.p100.getDeviceInfo().then((sysInfo) => {
                    // set accessory information
                    this.accessory.getService(this.platform.Service.AccessoryInformation)
                        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
                        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo P100')
                        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);
                    // each service must implement at-minimum the "required characteristics" for the given service type
                    // see https://developers.homebridge.io/#/service/Outlet
                    // register handlers for the On/Off Characteristic
                    this.service.getCharacteristic(this.platform.Characteristic.On)
                        .on('set', this.setOn.bind(this)) // SET - bind to the `setOn` method below
                        .on('get', this.getOn.bind(this)); // GET - bind to the `getOn` method below
                    // register handlers for the OutletInUse Characteristic
                    this.service.getCharacteristic(this.platform.Characteristic.OutletInUse)
                        .on('get', this.handleOutletInUseGet.bind(this));
                });
            });
        });
        // get the Outlet service if it exists, otherwise create a new Outlet service
        this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);
        // set the service name, this is what is displayed as the default name on the Home app
        // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    }
    /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory.
     */
    setOn(value, callback) {
        this.p100.setPowerState(value).then(() => {
            this.platform.log.debug('Set Characteristic On ->', value);
            // you must call the callback function
            callback(null);
        });
    }
    /**
     * Handle the "GET" requests from HomeKit
     * These are sent when HomeKit wants to know the current state of the accessory.
     *
     */
    getOn(callback) {
        // implement your own code to check if the device is on
        this.p100.getDeviceInfo().then((response) => {
            const isOn = response.device_on;
            this.platform.log.debug('Get Characteristic On ->', isOn);
            // you must call the callback function
            // the first argument should be null if there were no errors
            // the second argument should be the value to return
            // you must call the callback function
            callback(null, isOn);
        });
    }
    /**
     * Handle requests to get the current value of the "Outlet In Use" characteristic
     */
    handleOutletInUseGet(callback) {
        this.log.debug('Triggered GET OutletInUse');
        //P100 does not expose this info so we assume it is always in use
        const currentValue = 1;
        callback(null, currentValue);
    }
}
exports.P100Accessory = P100Accessory;
//# sourceMappingURL=platformP100Accessory.js.map