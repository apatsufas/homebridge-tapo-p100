import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Logger } from 'homebridge';
import TapoPlatform from './platform';
import L510E from './utils/l510e';

/**
 * L510E Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class L510EAccessory {
  private service: Service;

  private l510e: L510E;

  constructor(
    public readonly log: Logger,
    private readonly platform: TapoPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly timeout: number,
    private readonly updateInterval?: number,
  ) {
    this.log.debug('Start adding accessory: ' + accessory.context.device.host);
    this.l510e = new L510E(this.log, accessory.context.device.host, platform.config.username, platform.config.password, this.timeout);

    this.l510e.handshake().then(() => {
      this.l510e.login().then(() => {
        this.l510e.getDeviceInfo().then((sysInfo) => {
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

          const interval = updateInterval ? updateInterval*1000 : 30000;
          setTimeout(()=>{
            this.updateState(interval);
          }, interval);
        }).catch(() => {
          this.setNoResponse();
          this.log.error('Get Device Info failed');
        });
      }).catch(() => {
        this.setNoResponse();
        this.log.error('Login failed');
      });
    }).catch(() => {
      this.setNoResponse();
      this.log.error('Handshake failed');
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
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.l510e.setPowerState(value as boolean).then((result) => {
      if(result){
        this.platform.log.debug('Set Characteristic On ->', value);
        this.l510e.getSysInfo().device_on = value as boolean;
        // you must call the callback function
        callback(null);
      } else{
        callback(new Error('unreachable'), false);
      }
    });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getOn(callback: CharacteristicGetCallback) {
    // implement your own code to check if the device is on
    this.l510e.getDeviceInfo().then((response) => {
      if(response){
        const isOn = response.device_on;

        this.platform.log.debug('Get Characteristic On ->', isOn);
  
        // you must call the callback function
        // the first argument should be null if there were no errors
        // the second argument should be the value to return
        // you must call the callback function
        if(isOn !== undefined){
          callback(null, isOn);
        } else{
          callback(new Error('unreachable'), isOn);
        }
      } else{
        callback(new Error('unreachable'), false);
      }
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.l510e.getSysInfo().device_on){
      this.l510e.setBrightness(value as number).then((result) => {
        if(result){
          this.platform.log.debug('Set Characteristic Brightness ->', value);
          this.l510e.getSysInfo().brightness = value as number;
  
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
    this.l510e.getDeviceInfo().then((response) => {
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
    });
  }

  private updateState(interval:number){
    this.l510e.getDeviceInfo().then((response) => {
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

  private setNoResponse():void{
    //@ts-ignore
    this.service.updateCharacteristic(this.platform.Characteristic.On, new Error('unreachable'));
  }
}
