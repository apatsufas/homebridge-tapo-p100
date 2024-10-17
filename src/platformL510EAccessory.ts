import { PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Logger } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import L510E from './utils/l510e.js';
import { TPLinkPlatformAccessory } from './platformTPLinkAccessory.js';

/**
 * L510E Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class L510EAccessory extends TPLinkPlatformAccessory<L510E> {

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {

    super(log, platform, accessory, timeout, updateInterval);
    
    this.tpLinkAccessory = new L510E(this.log, accessory.context.device.host, platform.config.username, platform.config.password, 
      this.timeout);
    
    this.initialise(platform, updateInterval);

    // get the Outlet service if it exists, otherwise create a new Outlet service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  protected init(platform: TapoPlatform, updateInterval?: number){
    this.tpLinkAccessory.getDeviceInfo(true).then((sysInfo) => {
      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo L510E')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Outlet

      // register handlers for the On/Off Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
        .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      // register handlers for the Brightness Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .on('set', this.setBrightness.bind(this))                // SET - bind to the `setBrightness` method below
        .on('get', this.getBrightness.bind(this));               // GET - bind to the `getBrightness` method below

      const interval = updateInterval ? updateInterval*1000 : 10000;
      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(() => {
      this.setNoResponse();
      this.log.error('Get Device Info failed');
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.tpLinkAccessory.getSysInfo().device_on){
      this.tpLinkAccessory.setBrightness(value as number).then((result) => {
        if(result){
          this.platform.log.debug('Set Characteristic Brightness ->', value);
          this.tpLinkAccessory.getSysInfo().brightness = value as number;
  
          // you must call the callback function
          callback(null);
        } else{
          callback(new Error('unreachable'), false);
        }
      });
    } else{
      callback(null);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getBrightness(callback: CharacteristicGetCallback) {
    this.tpLinkAccessory.getDeviceInfo().then((response) => {
      if(response){
        const brightness = response.brightness;

        if(brightness !== undefined){
          this.platform.log.debug('Get Characteristic Brightness ->', brightness);
  
          // you must call the callback function
          // the first argument should be null if there were no errors
          // the second argument should be the value to return
          // you must call the callback function
          callback(null, brightness);
        } else{
          callback(new Error('unreachable'), 0);
        }
      } else{
        callback(new Error('unreachable'), 0);
      }
    }).catch(() => {
      callback(new Error('unreachable'), 0);
    });
  }

  protected updateState(interval:number){
    this.tpLinkAccessory.getDeviceInfo(true).then((response) => {
      if(response){
        const isOn = response.device_on;
        const brightness = response.brightness;

        this.platform.log.debug('Get Characteristic On ->', isOn);
  
        if(isOn !== undefined){
          this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
        } else{
          this.setNoResponse();
          interval += 300000;
        }

        if(brightness){
          this.service.updateCharacteristic(this.platform.Characteristic.Brightness, brightness);
        }
      }
      setTimeout(()=>{
        this.updateState(interval + 300000);
      }, interval);
    }).catch(()=>{
      this.setNoResponse();
      setTimeout(()=>{
        this.updateState(interval + 300000);
      }, interval);
    });

    setTimeout(()=>{
      this.updateState(interval);
    }, interval);
  }
}
