import { Logger } from 'homebridge';
import { ColorLightSysinfo } from '../homekit-device/types';
import L510E from './l510e';

export default class L530 extends L510E {

  private _colorLightSysInfo!:ColorLightSysinfo;
  private tapoColorTempRange = [2500, 6500];
  private homekitColorTempRange = [140, 500];

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

  async setColorTemp(color_temp:number){
    const URL = 'http://' + this.ip + '/app?token=' + this.token;
    const transformedColorTemp = this.transformColorTemp(this.homekitColorTempRange, this.tapoColorTempRange, color_temp);

    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"color_temp": ' + transformedColorTemp +
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
          this.log.error('61 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
                
        const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
        try{
          const response = JSON.parse(decryptedResponse);
          if(response.error_code !== 0){
            const errorCode = response.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('71 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
          return true;
        } catch (error){
          const errorCode = JSON.parse(decryptedResponse).error_code;
          const errorMessage = this.ERROR_CODES[errorCode];
          this.log.error('78 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
      })
      .catch((error:any) => {
        this.log.error('83 Error: ' + error.message);
        return new Error(error);
      });
  }

  async setHue(hue:number){
    const URL = 'http://' + this.ip + '/app?token=' + this.token;

    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"hue": ' + hue +
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
          this.log.error('121 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
                
        const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
        try{
          const response = JSON.parse(decryptedResponse);
          if(response.error_code !== 0){
            const errorCode = response.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('131 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
          return true;
        } catch (error){
          const errorCode = JSON.parse(decryptedResponse).error_code;
          const errorMessage = this.ERROR_CODES[errorCode];
          this.log.error('138 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
      })
      .catch((error:any) => {
        this.log.error('143 Error: ' + error.message);
        return new Error(error);
      });
  }

  async setSaturation(saturation:number){
    const URL = 'http://' + this.ip + '/app?token=' + this.token;

    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"saturation": ' + saturation +
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
          this.log.error('181 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
                
        const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
        try{
          const response = JSON.parse(decryptedResponse);
          if(response.error_code !== 0){
            const errorCode = response.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('191 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
          return true;
        } catch (error){
          const errorCode = JSON.parse(decryptedResponse).error_code;
          const errorMessage = this.ERROR_CODES[errorCode];
          this.log.error('198 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
      })
      .catch((error:any) => {
        this.log.error('203 Error: ' + error.message);
        return new Error(error);
      });
  }

  async setColor(hue:number, saturation:number){
    const URL = 'http://' + this.ip + '/app?token=' + this.token;

    const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"hue": ' + hue +
                  '"saturation": ' + saturation +
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
          this.log.error('242 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
                
        const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
        try{
          const response = JSON.parse(decryptedResponse);
          if(response.error_code !== 0){
            const errorCode = response.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('252 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
          return true;
        } catch (error){
          const errorCode = JSON.parse(decryptedResponse).error_code;
          const errorMessage = this.ERROR_CODES[errorCode];
          this.log.error('259 Error Code: ' + errorCode + ', ' + errorMessage);
          return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
        }
      })
      .catch((error:any) => {
        this.log.error('264 Error: ' + error.message);
        return new Error(error);
      });
  }

  protected setSysInfo(sysInfo:ColorLightSysinfo){
    this._colorLightSysInfo = sysInfo;
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
      return this.transformColorTemp(this.tapoColorTempRange, this.homekitColorTempRange, this.getSysInfo().color_temp);
    });
  }

}