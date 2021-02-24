"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_1 = require("./settings");
const platformP100Accessory_1 = require("./platformP100Accessory");
const config_1 = require("./config");
const platformL510EAccessory_1 = require("./platformL510EAccessory");
/**
 * TapoPlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
class TapoPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.api = api;
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        // this is used to track restored cached accessories
        this.accessories = [];
        this.log.debug('config.json: %j', config);
        this.config = config_1.parseConfig(config);
        this.log.debug('config: %j', this.config);
        this.log.debug('Finished initializing platform:', this.config.name);
        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            // run the method to discover / register your devices as accessories
            this.discoverDevices();
        });
    }
    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        // add the restored accessory to the accessories cache so we can track if it has already been registered
        this.accessories.push(accessory);
    }
    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    discoverDevices() {
        // EXAMPLE ONLY
        // A real plugin you would discover accessories from the local network, cloud services
        // or a user-defined array in the platform config.
        const devices = this.config.discoveryOptions.devices;
        if (devices) {
            // loop over the discovered devices and register each one if it has not already been registered
            for (const device of devices) {
                // generate a unique id for the accessory this should be generated from
                // something globally unique, but constant, for example, the device serial
                // number or MAC address
                const uuid = this.api.hap.uuid.generate(device.host + (device.name ? device.name : ''));
                // see if an accessory with the same uuid has already been registered and restored from
                // the cached devices we stored in the `configureAccessory` method above
                const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
                if (existingAccessory) {
                    // the accessory already exists
                    if (device) {
                        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
                        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
                        // existingAccessory.context.device = device;
                        // this.api.updatePlatformAccessories([existingAccessory]);
                        // create the accessory handler for the restored accessory
                        // this is imported from `platformAccessory.ts`
                        this.log.info('found type: ' + device.type);
                        if (device.type && device.type.toLowerCase() === 'light') {
                            this.log.info('adding light');
                            new platformL510EAccessory_1.L510EAccessory(this.log, this, existingAccessory);
                        }
                        else {
                            this.log.info('adding plug');
                            new platformP100Accessory_1.P100Accessory(this.log, this, existingAccessory);
                        }
                        // update accessory cache with any changes to the accessory details and information
                        this.api.updatePlatformAccessories([existingAccessory]);
                    }
                    else if (!device) {
                        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
                        // remove platform accessories when no longer present
                        this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [existingAccessory]);
                        this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
                    }
                }
                else {
                    // the accessory does not yet exist, so we need to create it
                    this.log.info('Adding new accessory:', device.host);
                    // create a new accessory
                    const accessory = new this.api.platformAccessory(device.host, uuid);
                    // store a copy of the device object in the `accessory.context`
                    // the `context` property can be used to store any data about the accessory you may need
                    accessory.context.device = device;
                    // create the accessory handler for the newly create accessory
                    // this is imported from `platformAccessory.ts`
                    this.log.info('found type: ' + device.type);
                    if (device.type && device.type.toLowerCase() === 'light') {
                        this.log.info('adding light');
                        new platformL510EAccessory_1.L510EAccessory(this.log, this, accessory);
                    }
                    else {
                        this.log.info('adding plug');
                        new platformP100Accessory_1.P100Accessory(this.log, this, accessory);
                    }
                    // link the accessory to your platform
                    this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
                }
            }
        }
    }
}
exports.default = TapoPlatform;
//# sourceMappingURL=platform.js.map