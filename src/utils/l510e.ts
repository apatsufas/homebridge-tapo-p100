import { Logger } from 'homebridge';
import { LightSysinfo } from '../homekit-device/types';
import P100 from './p100';

export default class L510E extends P100 {

  private _lightSysInfo!:LightSysinfo;

  constructor(
        public readonly log: Logger,
        public readonly ipAddress: string,
        public readonly email: string,
        public readonly password: string,
  ) {
    super(log, ipAddress, email, password);
    this.log.debug('Constructing L510E on host: ' + ipAddress);
  }

  async getDeviceInfo(): Promise<LightSysinfo>{
    return super.getDeviceInfo().then(() => {
      return this.getSysInfo();
    });
  }

  async setBrightness(brightness:number){
    const URL = 'http://' + this.ip + '/app?token=' + this.token;

    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"brightness": ' + brightness +
                  '},'+
                  '"requestTimeMils": ' + Math.round(Date.now() * 1000) + ''+
                  '};';

    const headers = {
      'Cookie': this.cookie,
    };
              
    const encryptedPayload = this.tpLinkCipher.encrypt(payload);
                      
    const securePassthroughPayload = {
      'method':'securePassthrough',
      'params':{
        'request': encryptedPayload,
      },
    };
                      
    const config = {
      headers: headers,
    };

    return this.axios.post(URL, securePassthroughPayload, config)
      .then((res) => {
        if(res.data.error_code){
          const errorCode = res.data.error_code;
          const errorMessage = this.ERROR_CODES[errorCode];
          this.log.error('344 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
                
        const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
        try{
          const response = JSON.parse(decryptedResponse);
          if(response.error_code !== 0){
            const errorCode = response.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('354 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
          return true;
        } catch (error){
          const errorCode = JSON.parse(decryptedResponse).error_code;
          const errorMessage = this.ERROR_CODES[errorCode];
          this.log.error('361 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
      })
      .catch((error:any) => {
        this.log.error('Error: ' + error.message);
        return new Error(error);
      });
  }

  protected setSysInfo(sysInfo:LightSysinfo){
    this._lightSysInfo = sysInfo;
  }

  public getSysInfo():LightSysinfo{
    return this._lightSysInfo;
  }
}