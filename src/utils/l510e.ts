import { Logger } from 'homebridge';
import { LightSysinfo } from '../homekit-device/types.js';
import P100 from './p100.js';

export default class L510E extends P100 {

  private _lightSysInfo!:LightSysinfo;

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

  async getDeviceInfo(force?:boolean): Promise<LightSysinfo>{
    return super.getDeviceInfo(force).then(() => {
      return this.getSysInfo();
    });
  }

  async setBrightness(brightness:number):Promise<boolean>{
    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"brightness": ' + brightness +
                  '},'+
                  '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                  '};';

    return this.sendRequest(payload);
  }

  protected setSysInfo(sysInfo:LightSysinfo){
    this._lightSysInfo = sysInfo;
    this._lightSysInfo.last_update = Date.now();
  }

  public getSysInfo():LightSysinfo{
    return this._lightSysInfo;
  }
}