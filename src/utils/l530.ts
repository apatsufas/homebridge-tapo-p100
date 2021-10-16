import { Logger } from 'homebridge';
import {ColorLightSysinfo, ConsumptionInfo} from '../homekit-device/types';
import L510E from './l510e';
import { PowerUsage } from './powerUsage';

export default class L530 extends L510E {

  private _colorLightSysInfo!:ColorLightSysinfo;
  private _consumption!:ConsumptionInfo;

  constructor(
        public readonly log: Logger,
        public readonly ipAddress: string,
        public readonly email: string,
        public readonly password: string,
  ) {
    super(log, ipAddress, email, password);
    this.log.debug('Constructing L530 on host: ' + ipAddress);
  }

  async getDeviceInfo(): Promise<ColorLightSysinfo>{
    return super.getDeviceInfo().then(() => {
      return this.getSysInfo();
    });
  }

  async setColorTemp(color_temp:number):Promise<true>{
    const transformedColorTemp = this.transformColorTemp(color_temp);
    this.log.debug('Color Temp Tapo :' + transformedColorTemp);

    const roundedValue = transformedColorTemp > 6500 ? 6500 : transformedColorTemp < 2500 ? 
      2500 : transformedColorTemp;

    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"color_temp": ' + roundedValue +
                  '},'+
                  '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                  '};';

    return this.handleRequest(payload).then(()=>{
      return true;
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
                  '"hue": ' + hue + ','+
                  '"saturation": ' + saturation +
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

  private transformColorTemp(value: number){
    return Math.floor(1000000 / value);
  }

  async getColorTemp(): Promise<number>{
    return super.getDeviceInfo().then(() => {
      const newValue = this.transformColorTemp(this.getSysInfo().color_temp);
      return newValue > 370 ? 370 : (newValue < 154 ? 154 : newValue);
    });
  }

  async getEnergyUsage():Promise<PowerUsage>{        
    const payload = '{'+
                '"method": "get_device_usage",'+
                    '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                    '};';
    return this.handleRequest(payload).then((response)=>{
      this._consumption = {
        total: response.result.power_usage.today,
        current: (response.result.power_usage.today / 1000) / 60
      }

      return response.result;
    });
  }

  public getPowerConsumption():ConsumptionInfo{
    return this._consumption;
  }
}