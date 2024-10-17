import { CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, Logger, PlatformAccessory, Service } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import { TpLinkAccessory } from './utils/tplinkAccessory.js';

export abstract class TPLinkPlatformAccessory <T extends TpLinkAccessory>{ 

  protected tpLinkAccessory!: T;
  protected service!: Service;

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {
    this.log.debug('Start adding accessory: ' + accessory.context.device.host);
  }

  protected initialise(platform: TapoPlatform, updateInterval?: number):void{
    this.tpLinkAccessory.handshake().then(() => {
      if(this.tpLinkAccessory.is_klap){
        setTimeout(()=>{
          this.tpLinkAccessory.handshake_new().then(() => {
            this.init(platform, updateInterval);
          }).catch(() => {
            this.setNoResponse();
            this.log.error('KLAP Handshake failed');
            this.tpLinkAccessory.is_klap = false;
          });
        }, 100);
      } else{
        this.tpLinkAccessory.login().then(() => {
          this.init(platform, updateInterval);
        }).catch(() => {
          this.setNoResponse();
          this.log.error('Login failed');
        });
      }
    }).catch(() => {
      this.setNoResponse();
      this.log.error('Handshake failed');
    });
  }

  protected abstract init(platform: TapoPlatform, updateInterval?: number):void;

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.tpLinkAccessory.setPowerState(value as boolean).then((result) => {
      if(result){
        this.platform.log.debug('Set Characteristic On ->', value);
        this.tpLinkAccessory.getSysInfo().device_on = value as boolean;
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
    this.tpLinkAccessory.getDeviceInfo().then((response) => {
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
    }).catch((error) => {
      this.log.debug('error: ' + error);

      callback(new Error('unreachable'), 0);
    });
  }

  protected updateState(interval:number){
    this.platform.log.debug('Updating state');
    this.tpLinkAccessory.getDeviceInfo(true).then((response) => {
      if(response){
        const isOn = response.device_on;

        this.platform.log.debug('Get Characteristic On ->', isOn);
  
        if(isOn !== undefined){
          this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
        } else{
          this.platform.log.debug('On is undefined -> set no response');
          this.setNoResponse();
        }

        setTimeout(()=>{
          this.updateState(interval);
        }, interval);
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

  protected setNoResponse():void{
    this.service.updateCharacteristic(this.platform.Characteristic.On, new Error('unreachable'));
  }
}