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
        this._consumption = {
          current: this.estimateWatts(result),
          todayWh: result.power_usage.today,
        };
      }
      // On a failed request keep the last estimate rather than reporting a fake 0 W.

      return result;
    });
  }

  /**
   * Power while the bulb is on, in W. The L530 has no power meter and only reports energy (Wh) and
   * on-time (minutes) totals, so this is an average: past 7 days if available, else past 30 days,
   * else today. Today alone is unreliable: the bulb reports whole Wh, so after a few minutes of
   * on-time it can read 0 Wh and give 0 W for a bulb that is on.
   */
  private estimateWatts(usage: PowerUsage):number{
    for(const period of ['past7', 'past30', 'today'] as const){
      const hours = usage.time_usage[period] / 60;
      const wh = usage.power_usage[period];
      if(hours > 0 && Number.isFinite(wh)){
        return wh / hours;
      }
    }
    return 0;
  }

  public getPowerConsumption():ConsumptionInfo{
    const sysInfo = this.getSysInfo();
    if(!sysInfo || !sysInfo.device_on){
      return {
        current: 0,
        todayWh: this._consumption.todayWh,
      };
    }
    return this._consumption;
  }
}