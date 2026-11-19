import { PlatformAccessory, CharacteristicValue, Logger } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import L520E from './utils/l520e.js';
import { TPLinkPlatformAccessory } from './platformTPLinkAccessory.js';

/**
 * L510E Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class L520EAccessory extends TPLinkPlatformAccessory<L520E> {

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {

    super(log, platform, accessory, timeout, updateInterval);

    this.tpLinkAccessory = new L520E(this.log, accessory.context.device.host, platform.config.username, platform.config.password, 
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
        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo L520E')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Outlet

      this.service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setOn.bind(this))
        .onGet(this.getOn.bind(this));

      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .onSet(this.setBrightness.bind(this))
        .onGet(this.getBrightness.bind(this));

      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .onSet(this.setColorTemp.bind(this))
        .onGet(this.getColorTemp.bind(this))
        .setProps({
          minValue: 154,
          maxValue: 400,
          minStep: 1,
        });

      
      const interval = updateInterval ? updateInterval*1000 : 10000;
      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(() => {
      this.log.error('Get Device Info failed');
      this.retryInitialise();
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  async setBrightness(value: CharacteristicValue):Promise<void> {
    const brightness = value as number;
    return this.setWhenOn('brightness', () => this.tpLinkAccessory.setBrightness(brightness).then((result) => {
      if(result){
        this.platform.log.debug('Set Characteristic Brightness ->', brightness);
        this.tpLinkAccessory.getSysInfo().brightness = brightness;
      }
      return result;
    }));
  }

  async getBrightness():Promise<CharacteristicValue> {
    const brightness = this.cached((sysInfo) => sysInfo.brightness);
    this.platform.log.debug('Get Characteristic Brightness ->', brightness);
    return brightness;
  }

  protected updateState(interval:number){
    this.tpLinkAccessory.getDeviceInfo(true).then((response) => {
      if(response){
        const isOn = response.device_on;
        const brightness = response.brightness;

        this.platform.log.debug('Get Characteristic On ->', isOn);
  
        if(brightness){
          this.service.updateCharacteristic(this.platform.Characteristic.Brightness, brightness);
        }

        if(isOn !== undefined){
          this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
          this.scheduleNextUpdate(interval);
          return;
        }
      }
      this.setNoResponse();
      this.scheduleNextUpdate(interval, true);
    }).catch(()=>{
      this.setNoResponse();
      this.scheduleNextUpdate(interval, true);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  async setColorTemp(value: CharacteristicValue):Promise<void> {
    this.log.debug('Color Temp Homekit :' + value);
    const mired = value as number;
    // L520E.setColorTemp caches the resulting Kelvin value itself.
    return this.setWhenOn('colorTemp', () => this.tpLinkAccessory.setColorTemp(mired));
  }

  async getColorTemp():Promise<CharacteristicValue> {
    const colorTemp = this.cached((sysInfo) => sysInfo.color_temp);
    return this.tpLinkAccessory.calculateColorTemp(colorTemp);
  }
}
