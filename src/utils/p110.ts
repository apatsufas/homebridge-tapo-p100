import { Logger } from 'homebridge';
import { EnergyUsage } from './energyUsage.js';
import P100 from './p100.js';
import { ConsumptionInfo } from '../homekit-device/types.js';

export default class P110 extends P100 {

  private _consumption!:ConsumptionInfo;

  constructor(
        public readonly log: Logger,
        public readonly ipAddress: string,
        public readonly email: string,
        public readonly password: string,
        public readonly timeout: number,
  ) {
    super(log, ipAddress, email, password, timeout);
    this.log.debug('Constructing P110 on host: ' + ipAddress);
  }

  async getEnergyUsage():Promise<EnergyUsage>{        
    const payload = this.buildPayload('get_energy_usage');
     
    const request = this.is_klap ? this.handleKlapRequest(payload) : this.handleRequest(payload);

    return request.then((response)=>{
      // handleRequest resolves `false` on device errors; never dereference it blindly.
      const result = response ? response.result : undefined;
      if(result){
        this._consumption = {
          // current_power is in mW; keep sub-watt precision (an idle device draws < 1 W)
          current: result.current_power / 1000,
          // today_energy is in Wh and resets at midnight; EnergyTotal turns it into a lifetime total
          todayWh: result.today_energy,
        };
      }
      // On a failed request keep the last reading rather than reporting a fake 0 W.

      return result;
    });
  }

  public getPowerConsumption():ConsumptionInfo{
    return this._consumption;
  }
}