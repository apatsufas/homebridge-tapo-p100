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
    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"hue": ' + Math.round(hue) + ','+
                  '"color_temp": 0,' +
                  '"saturation": ' + Math.round(saturation) +
                  '},'+
                  '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                  '};';

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
    const payload = '{'+
                '"method": "get_device_usage",'+
                    '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                    '};';
    this.log.debug('getEnergyUsage called');

    if(this.is_klap){
      this.log.debug('getEnergyUsage is klap');

      return this.handleKlapRequest(payload).then((response)=>{
        this.log.debug('Consumption: ' + JSON.stringify(response));
        if(response && response.result){
          this._consumption = {
            total: response.result.power_usage.today / 1000,
            current: this._consumption ? response.result.power_usage.today / this.toHours(response.result.time_usage.today) : 0,
          };
        } else{
          this._consumption = {
            total: 0,
            current: 0,
          };
        }
                        
        return response.result;
      }).catch((error)=>{
        if(error.message && error.message.indexOf('9999') > 0){
          return this.reconnect().then(()=>{
            return this.handleKlapRequest(payload).then(()=>{
              return true;
            });
          });
        }
        return false;
      });
    }else{
      return this.handleRequest(payload).then((response)=>{
        this.log.debug('Consumption: ' + response);
        if(response && response.result){
          this._consumption = {
            total: response.result.power_usage.today / 1000,
            current: this._consumption ? response.result.power_usage.today / this.toHours(response.result.time_usage.today)  : 0,
          };
        } else{
          this._consumption = {
            total: 0,
            current: 0,
          };
        }
                        
        return response.result;
      }).catch((error)=>{
        if(error.message && error.message.indexOf('9999') > 0){
          return this.reconnect().then(()=>{
            return this.handleRequest(payload).then(()=>{
              return true;
            });
          });
        }
        return false;
      });
    }
    
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