import { PlatformAccessory, CharacteristicValue, CharacteristicGetCallback, 
  Logger } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import P110 from './utils/p110.js';
import { TPLinkPlatformAccessory } from './platformTPLinkAccessory.js';

/**
 * P110 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class P110Accessory extends TPLinkPlatformAccessory<P110>{
  private readonly fakeGatoHistoryService?;

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {
    super(log, platform, accessory, timeout, updateInterval);

    this.tpLinkAccessory = new P110(this.log, accessory.context.device.host, platform.config.username, platform.config.password, 
      this.timeout);

    this.fakeGatoHistoryService = new this.platform.FakeGatoHistoryService('energy', accessory, {
      log: this.log,
      size:4096, 
      storage:'fs',
    });

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
        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo P110')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Outlet

      // register handlers for the On/Off Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
        .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      this.service.addOptionalCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic);
      this.service.getCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic)
        .on('get', this.getCurrentConsumption.bind(this));
  
      this.service.addOptionalCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic);
      this.service.getCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic)
        .on('get', this.getTotalConsumption.bind(this));
          
      this.updateConsumption();

      const interval = updateInterval ? updateInterval*1000 : 10000;
      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(() => {
      this.setNoResponse();
      this.log.error('Get Device Info failed');
    });
  }

  private updateConsumption(){
    this.log.debug('updateConsumption called');
    this.tpLinkAccessory.getEnergyUsage().then((response) => {
      this.log.debug('Get Characteristic Power consumption ->', JSON.stringify(response));
      if (this.fakeGatoHistoryService && response && response.current_power) {
        this.platform.log.debug('Get Characteristic Power consumption ->', response.current_power);
        this.fakeGatoHistoryService.addEntry({
          time: new Date().getTime() / 1000,
          power: this.tpLinkAccessory.getPowerConsumption().current,
        });
      }
    });

    setTimeout(()=>{
      this.updateConsumption();
    }, 600000);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   *
   */
  getCurrentConsumption(callback: CharacteristicGetCallback) {
    const consumption = this.tpLinkAccessory.getPowerConsumption();

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    if(consumption){
      callback(null, consumption.current);
    }else{
      callback(null, 0);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   *
   */
  getTotalConsumption(callback: CharacteristicGetCallback) {
    const consumption = this.tpLinkAccessory.getPowerConsumption();

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    if(consumption){
      callback(null, consumption.total);
    }else{
      callback(null, 0);
    }
  }

  /**
   * Handle the "SET" requests from HomeKit
   *
   */
  resetConsumption(value: CharacteristicValue, callback: CharacteristicGetCallback) {
    const now = Math.round(new Date().valueOf() / 1000);
    const epoch = Math.round(new Date('2001-01-01T00:00:00Z').valueOf() / 1000);

    this.service.updateCharacteristic(this.platform.customCharacteristics.ResetConsumptionCharacteristic, now - epoch);

    this.service.updateCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic, 0);
    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    callback(null);
  }
}
