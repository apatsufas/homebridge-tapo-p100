import { Logger } from 'homebridge';
import { EnergyUsage } from './energyUsage';
import P100 from './p100';

export default class P110 extends P100 {

  constructor(
        public readonly log: Logger,
        public readonly ipAddress: string,
        public readonly email: string,
        public readonly password: string,
  ) {
    super(log, ipAddress, email, password);
    this.log.debug('Constructing P110 on host: ' + ipAddress);
  }

  async getEnergyUsage():Promise<EnergyUsage>{        
    const payload = '{'+
            '"method": "get_energy_usage",'+
            '"params": {'+
                '"device_on": true'+
                '},'+
                '"terminalUUID": "' + this.terminalUUID + '",' +
                '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                '};';
     
    return this.handleRequest(payload).then((response)=>{
      return response.result;
    });
  }
}