import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  WithUUID,
  Categories,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { P100Accessory } from './platformP100Accessory.js';
import { parseConfig, TapoConfig } from './config.js';
import { L510EAccessory } from './platformL510EAccessory.js';
import { L530Accessory } from './platformL530Accessory.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import fakegato from 'fakegato-history';
import { P110Accessory } from './platformP110Accessory.js';
import Characteristics from './custom-characteristics/index.js';
import { L520EAccessory } from './platformL520EAccessory.js';

/**
 * TapoPlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class TapoPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly FakeGatoHistoryService;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public readonly config: TapoConfig;

  public customCharacteristics: {
    [key: string]: WithUUID<new () => Characteristic>;
  };

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('config.json: %j', config);
    this.config = parseConfig(config);
    this.log.debug('config: %j', this.config);
    this.log.debug('Finished initializing platform:', this.config.name);
    this.customCharacteristics = Characteristics(api.hap.Characteristic);
    this.FakeGatoHistoryService = fakegato(this.api);
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
  configureAccessory(accessory: PlatformAccessory) {
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

    if(devices){
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
            if(device.type && device.type.toLowerCase() === 'colorlight'){
              new L530Accessory(this.log, this, existingAccessory, device.timeout ? device.timeout : 2, device.updateInterval);
            } else if(device.type && device.type.toLowerCase() === 'whiteLight'){
              new L520EAccessory(this.log, this, existingAccessory, device.timeout ? device.timeout : 2, device.updateInterval);
            } else if(device.type && device.type.toLowerCase() === 'light'){
              new L510EAccessory(this.log, this, existingAccessory, device.timeout ? device.timeout : 2, device.updateInterval);
            } else if(device.type && device.type.toLowerCase() === 'powerplug'){
              new P110Accessory(this.log, this, existingAccessory, device.timeout ? device.timeout : 2, device.updateInterval);
            } else{
              new P100Accessory(this.log, this, existingAccessory, device.timeout ? device.timeout : 2, device.updateInterval);
            }
      
            // update accessory cache with any changes to the accessory details and information
            this.api.updatePlatformAccessories([existingAccessory]);
          } else if (!device) {
            // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
            // remove platform accessories when no longer present
            this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
            this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
          }
        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info('Adding new accessory:', device.host);

          let accessory:PlatformAccessory;

          // create the accessory handler for the newly create accessory
          // this is imported from `platformAccessory.ts`
          if(device.type && device.type.toLowerCase() === 'colorlight'){
            // create a new accessory
            accessory = new this.api.platformAccessory(device.name ? device.name : device.host, uuid, Categories.LIGHTBULB);
            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = device;
            new L530Accessory(this.log, this, accessory, device.timeout ? device.timeout : 2, device.updateInterval);
          } else if(device.type && device.type.toLowerCase() === 'light'){
            // create a new accessory
            accessory = new this.api.platformAccessory(device.name ? device.name : device.host, uuid, Categories.LIGHTBULB);
            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = device;
            new L510EAccessory(this.log, this, accessory, device.timeout ? device.timeout : 2, device.updateInterval);
          } else if(device.type && device.type.toLowerCase() === 'whiteLight'){
            // create a new accessory
            accessory = new this.api.platformAccessory(device.name ? device.name : device.host, uuid, Categories.LIGHTBULB);
            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = device;
            new L520EAccessory(this.log, this, accessory, device.timeout ? device.timeout : 2, device.updateInterval);
          } else if(device.type && device.type.toLowerCase() === 'powerplug'){
            // create a new accessory
            accessory = new this.api.platformAccessory(device.name ? device.name : device.host, uuid, Categories.OUTLET);
            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = device;
            new P110Accessory(this.log, this, accessory, device.timeout ? device.timeout : 2, device.updateInterval);
          } else{
            // create a new accessory
            accessory = new this.api.platformAccessory(device.name ? device.name : device.host, uuid, Categories.OUTLET);
            // store a copy of the device object in the `accessory.context`
            // the `context` property can be used to store any data about the accessory you may need
            accessory.context.device = device;
            new P100Accessory(this.log, this, accessory, device.timeout ? device.timeout : 2, device.updateInterval);
          }

          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }
  }
}
