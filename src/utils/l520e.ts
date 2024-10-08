import { Logger } from 'homebridge';
import { ColorTempLightSysinfo } from '../homekit-device/types.js';
import L510E from './l510e.js';

export default class L520E extends L510E {

  private _colorTempSysInfo!:ColorTempLightSysinfo;

  constructor(
        public readonly log: Logger,
        public readonly ipAddress: string,
        public readonly email: string,
        public readonly password: string,
        public readonly timeout: number,
  ) {
    super(log, ipAddress, email, password, timeout);
    this.log.debug('Constructing L510E on host: ' + ipAddress);
  }

  async getDeviceInfo(force?:boolean): Promise<ColorTempLightSysinfo>{
    return super.getDeviceInfo(force).then(() => {
      return this.getSysInfo();
    });
  }

  async setColorTemp(color_temp:number):Promise<boolean>{
    const transformedColorTemp = this.transformColorTemp(color_temp);
    this.log.debug('Color Temp Tapo :' + transformedColorTemp);

    const roundedValue = transformedColorTemp > 6500 ? 6500 : transformedColorTemp < 2500 ? 
      2500 : transformedColorTemp;

    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"hue": 0,' +
                  '"saturation": 0,' +
                  '"color_temp": ' + roundedValue +
                  '},'+
                  '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                  '};';

    return this.sendRequest(payload);
  }

  private transformColorTemp(value: number):number{
    return Math.floor(1000000 / value);
  }

  async getColorTemp(): Promise<number>{
    return super.getDeviceInfo().then(() => {
      return this.calculateColorTemp(this.getSysInfo().color_temp);
    });
  }

  calculateColorTemp(tapo_color_temp:number):number{
    const newValue = this.transformColorTemp(tapo_color_temp);
    return newValue > 400 ? 400 : (newValue < 154 ? 154 : newValue);
  }

  protected setSysInfo(sysInfo:ColorTempLightSysinfo){
    this._colorTempSysInfo = sysInfo;
    this._colorTempSysInfo.last_update = Date.now();
  }

  public getSysInfo():ColorTempLightSysinfo{
    return this._colorTempSysInfo;
  }
}