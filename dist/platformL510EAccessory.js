"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.L510EAccessory = void 0;
const l510e_1 = __importDefault(require("./utils/l510e"));
/**
 * P100 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class L510EAccessory {
    constructor(log, platform, accessory) {
        this.log = log;
        this.platform = platform;
        this.accessory = accessory;
        this.log.debug('Start adding accessory: ' + accessory.context.device.host);
        this.l510e = new l510e_1.default(this.log, accessory.context.device.host, platform.config.username, platform.config.password);
        this.l510e.handshake().then(() => {
            this.l510e.login().then(() => {
                this.l510e.getDeviceInfo().then((sysInfo) => {
                    // set accessory information
                    this.accessory.getService(this.platform.Service.AccessoryInformation)
                        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
                        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo L510E')
                        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);
                    // each service must implement at-minimum the "required characteristics" for the given service type
                    // see https://developers.homebridge.io/#/service/Outlet
                    // register handlers for the On/Off Characteristic
                    this.service.getCharacteristic(this.platform.Characteristic.On)
                        .on('set', this.setOn.bind(this)) // SET - bind to the `setOn` method below
                        .on('get', this.getOn.bind(this)); // GET - bind to the `getOn` method below
                    // register handlers for the Brightness Characteristic
                    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
                        .on('set', this.setBrightness.bind(this)) // SET - bind to the `setBrightness` method below
                        .on('get', this.getBrightness.bind(this)); // GET - bind to the `getBrightness` method below
                });
            });
        });
        // get the Outlet service if it exists, otherwise create a new Outlet service
        this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
        // set the service name, this is what is displayed as the default name on the Home app
        // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    }
    /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory.
     */
    setOn(value, callback) {
        this.l510e.setPowerState(value).then(() => {
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
        this.l510e.getDeviceInfo().then((response) => {
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
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory.
     */
    setBrightness(value, callback) {
        this.l510e.setBrightness(value).then(() => {
            this.platform.log.debug('Set Characteristic Brightness ->', value);
            // you must call the callback function
            callback(null);
        });
    }
    /**
     * Handle the "GET" requests from HomeKit
     * These are sent when HomeKit wants to know the current state of the accessory.
     *
     */
    getBrightness(callback) {
        this.l510e.getDeviceInfo().then((response) => {
            const brightness = response.brightness;
            this.platform.log.debug('Get Characteristic Brightness ->', brightness);
            // you must call the callback function
            // the first argument should be null if there were no errors
            // the second argument should be the value to return
            // you must call the callback function
            callback(null, brightness);
        });
    }
}
exports.L510EAccessory = L510EAccessory;
//# sourceMappingURL=platformL510EAccessory.js.map