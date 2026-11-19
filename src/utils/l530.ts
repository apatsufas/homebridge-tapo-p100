import { Logger } from 'homebridge';
import { ColorLightSysinfo, ConsumptionInfo } from '../homekit-device/types.js';
import L520E from './l520e.js';
import { PowerUsage } from './powerUsage.js';

export default class L530 extends L520E {

  private _colorLightSysInfo!:ColorLightSysinfo;
  private _consumption!:ConsumptionInfo;

  constructor(
        public readonly log: Logger,
        public readonly ipAddress: string,
        public readonly email: string,
        public readonly password: string,
        public readonly timeout: number,
  ) {
    super(log, ipAddress, email, password, timeout);
    this.log.debug('Constructing L530 on host: ' + ipAddress);
    this._consumption = {
      total: 0,
      current: 0,
    };
  }

  async getDeviceInfo(force?:boolean): Promise<ColorLightSysinfo>{
    return super.getDeviceInfo(force).then(() => {
      return this.getSysInfo();
    });
  }

  async setColor(hue:number, saturation:number):Promise<boolean>{
    if(!hue){
      hue = 0;
    }
    if(!saturation){
      saturation = 0;
    }
    this.log.debug('Setting color: ' + hue + ', ' + saturation);
    const payload = this.buildPayload('set_device_info', {
      hue: Math.round(hue),
      color_temp: 0,
      saturation: Math.round(saturation),
    });

    return this.sendRequest(payload);
  }

  protected setSysInfo(sysInfo:ColorLightSysinfo){
    this._colorLightSysInfo = sysInfo;
    this._colorLightSysInfo.last_update = Date.now();
  }

  public getSysInfo():ColorLightSysinfo{
    return this._colorLightSysInfo;
  }

  async getEnergyUsage():Promise<PowerUsage>{        
    const payload = this.buildPayload('get_device_usage');
    this.log.debug('getEnergyUsage called');

    // Session-expiry retries happen inside handleKlapRequest (403) and handleRequest (9999),
    // so errors that reach here are real failures and are passed on to the caller.
    const request = this.is_klap ? this.handleKlapRequest(payload) : this.handleRequest(payload);

    return request.then((response)=>{
      this.log.debug('Consumption: ' + JSON.stringify(response));
      // handleRequest resolves `false` on device errors; never dereference it blindly.
      const result = response ? response.result : undefined;
      if(result && result.power_usage && result.time_usage){
        const hoursOnToday = this.toHours(result.time_usage.today);
        this._consumption = {
          total: result.power_usage.today / 1000,
          // Average power over today's on-time; 0 if the bulb has not been on yet today.
          current: hoursOnToday > 0 ? result.power_usage.today / hoursOnToday : 0,
        };
      } else{
        this._consumption = {
          total: 0,
          current: 0,
        };
      }

      return result;
    });
  }

  public getPowerConsumption():ConsumptionInfo{
    if(!this.getSysInfo().device_on){
      return {
        total: this._consumption.total,
        current: 0,
      };
    }
    return this._consumption;
  }

  private toHours(minutes: number):number{
    return minutes/60;
  }
}