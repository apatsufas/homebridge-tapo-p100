import { Logger } from 'homebridge';
import {ColorLightSysinfo, ConsumptionInfo} from '../homekit-device/types';
import L520E from './l520e';
import { PowerUsage } from './powerUsage';

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

  async getDeviceInfo(): Promise<ColorLightSysinfo>{
    return super.getDeviceInfo().then(() => {
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
    return this.handleRequest(payload).then((response)=>{
      if(response && response.result){
        this._consumption = {
          total: response.result.power_usage.today / 1000,
          current: this._consumption ? response.result.power_usage.today - this._consumption.current : 0,
        };
      } else{
        this._consumption = {
          total: 0,
          current: 0,
        };
      }
      
      return response.result;
    }).catch((error)=>{
      if(error.message.indexOf('9999') > 0){
        return this.reconnect().then(()=>{
          return this.handleRequest(payload).then(()=>{
            return true;
          });
        });
      }
      return false;
    });
  }

  public getPowerConsumption():ConsumptionInfo{
    return this._consumption;
  }
}