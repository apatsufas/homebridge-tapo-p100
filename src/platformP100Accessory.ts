import { PlatformAccessory, CharacteristicGetCallback, Logger } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import P100 from './utils/p100.js';
import { TPLinkPlatformAccessory } from './platformTPLinkAccessory.js';

/**
 * P100 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class P100Accessory extends TPLinkPlatformAccessory<P100>{

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {

    super(log, platform, accessory, timeout, updateInterval);
    
    this.tpLinkAccessory = new P100(this.log, accessory.context.device.host, platform.config.username, platform.config.password, 
      this.timeout);

    this.initialise(platform, updateInterval);

    // get the Outlet service if it exists, otherwise create a new Outlet service
    this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);
    
    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  protected init(platform: TapoPlatform, updateInterval?: number){
    this.tpLinkAccessory.getDeviceInfo(true).then((sysInfo) => {
      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo P100')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Outlet

      // register handlers for the On/Off Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
        .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      // register handlers for the OutletInUse Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.OutletInUse)
        .on('get', this.handleOutletInUseGet.bind(this));

      const interval = updateInterval ? updateInterval*1000 : 10000;
      this.log.debug('interval: ' + interval);

      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(() => {
      this.setNoResponse();
      this.log.error('52 - Get Device Info failed');
    });
  }

  /**
   * Handle requests to get the current value of the "Outlet In Use" characteristic
   */
  handleOutletInUseGet(callback: CharacteristicGetCallback) {
    this.log.debug('Triggered GET OutletInUse');

    //P100 does not expose this info so we assume it is always in use
    const currentValue = 1;

    callback(null, currentValue);
  }
}
