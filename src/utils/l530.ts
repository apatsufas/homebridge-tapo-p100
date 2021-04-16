import { Logger } from 'homebridge';
import { ColorLightSysinfo } from '../homekit-device/types';
import L510E from './l510e';

export default class L530 extends L510E {

  private _colorLightSysInfo!:ColorLightSysinfo;
  private tapoColorTempRange = [6500, 2500];
  private homekitColorTempRange = [154, 370];

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
    const transformedColorTemp = this.transformColorTemp(this.homekitColorTempRange, this.tapoColorTempRange, color_temp);
    this.log.debug('Color Temp Tapo :' + Math.round(transformedColorTemp));

    const roundedValue = Math.round(transformedColorTemp) > 6500 ? 6500 : Math.round(transformedColorTemp) < 2500 ? 
      2500 :Math.round(transformedColorTemp);
      
    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"color_temp": ' + roundedValue +
                  '},'+
                  '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                  '};';

    return this.handleRequest(payload);
  }

  async setColor(hue:number, saturation:number):Promise<true>{
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

    return this.handleRequest(payload);
  }

  protected setSysInfo(sysInfo:ColorLightSysinfo){
    this._colorLightSysInfo = sysInfo;
    this._colorLightSysInfo.last_update = Date.now();
  }

  public getSysInfo():ColorLightSysinfo{
    return this._colorLightSysInfo;
  }

  private transformColorTemp(fromRange: number[], toRange: number[], value: number){
    const oldRange = (fromRange[1] - fromRange[0]);  
    const newRange = (toRange[1] - toRange[0]);  
    return (((value - fromRange[0]) * newRange) / oldRange) + toRange[0];
  }

  async getColorTemp(): Promise<number>{
    return super.getDeviceInfo().then(() => {
      const newValue = this.transformColorTemp(this.tapoColorTempRange, this.homekitColorTempRange, this.getSysInfo().color_temp);
      return newValue > 500 ? 500 : (newValue < 140 ? 140 : newValue);
    });
  }

}