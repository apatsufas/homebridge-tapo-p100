import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Logger } from 'homebridge';
import TapoPlatform from './platform';
import P100 from './utils/p100';

/**
 * P100 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class P100Accessory {
  private service: Service;

  private p100: P100;

  constructor(
    public readonly log: Logger,
    private readonly platform: TapoPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly timeout: number,
    private readonly updateInterval?: number,
  ) {
    this.log.debug('Start adding accessory: ' + accessory.context.device.host);
    this.p100 = new P100(this.log, accessory.context.device.host, platform.config.username, platform.config.password, this.timeout);

    this.p100.handshake().then(() => {
      this.p100.login().then(() => {
        this.p100.getDeviceInfo().then((sysInfo) => {
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

          const interval = updateInterval ? updateInterval*1000 : 30000;
          this.log.debug('interval: ' + interval);

          setTimeout(()=>{
            this.updateState(interval);
          }, interval);
        }).catch(() => {
          this.setNoResponse();
          this.log.error('52 - Get Device Info failed');
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
    this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);
    
    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.p100.setPowerState(value as boolean).then((result) => {
      if(result){
        this.platform.log.debug('Set Characteristic On ->', value);
        this.p100.getSysInfo().device_on = value as boolean;
  
        // you must call the callback function
        callback(null);
      } else{
        callback(new Error('unreachable'));
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
    this.p100.getDeviceInfo().then((response) => {
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
   * Handle requests to get the current value of the "Outlet In Use" characteristic
   */
  handleOutletInUseGet(callback: CharacteristicGetCallback) {
    this.log.debug('Triggered GET OutletInUse');

    //P100 does not expose this info so we assume it is always in use
    const currentValue = 1;

    callback(null, currentValue);
  }

  private updateState(interval:number){
    this.platform.log.debug('Updating state');
    this.p100.getDeviceInfo().then((response) => {
      if(response){
        const isOn = response.device_on;

        this.platform.log.debug('Get Characteristic On ->', isOn);
  
        if(isOn !== undefined){
          this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
        } else{
          this.platform.log.debug('On is undefined -> set no response');
          this.setNoResponse();
        }
      } else{
        this.setNoResponse();
        interval += 300000;
        setTimeout(()=>{
          this.updateState(interval);
        }, interval);
      }
    }).catch(()=>{
      this.setNoResponse();
      setTimeout(()=>{
        this.updateState(interval + 300000);
      }, interval);
    });
  }

  private setNoResponse():void{
    //@ts-ignore
    this.service.updateCharacteristic(this.platform.Characteristic.On, new Error('unreachable'));
  }
}
