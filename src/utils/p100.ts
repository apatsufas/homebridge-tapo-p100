import { Logger } from 'homebridge';
import { PlugSysinfo } from '../homekit-device/types';
import TpLinkCipher from './tpLinkCipher';
import { v4 as uuidv4 } from 'uuid';

export default class P100 {

    private crypto = require('crypto');
    protected axios = require('axios');

    private encodedPassword!:string;
    private encodedEmail!:string;
    private privateKey!:string;
    private publicKey!:string;
    protected ip:string;
    protected cookie!:string;
    protected token!:string;
    private terminalUUID:string;
    private _plugSysInfo!:PlugSysinfo;

    protected tpLinkCipher!:TpLinkCipher;

    protected ERROR_CODES = {
      '0': 'Success',
      '-1010': 'Invalid Public Key Length',
      '-1012': 'Invalid terminalUUID',
      '-1501': 'Invalid Request or Credentials',
      '1002': 'Incorrect Request',
      '-1003': 'JSON formatting error ',
    };

    constructor(
        public readonly log: Logger,
        public readonly ipAddress: string,
        public readonly email: string,
        public readonly password: string,
    ) {
      this.log.debug('Constructing P100 on host: ' + ipAddress);
      this.ip = ipAddress;
      this.encryptCredentials(email, password);
      this.createKeyPair();
      this.terminalUUID = uuidv4();
    }

    private encryptCredentials(email : string, password: string){
      //Password Encoding
      this.encodedPassword = TpLinkCipher.mime_encoder(password);

      //Email Encoding
      this.encodedEmail = this.sha_digest_username(email);
      this.encodedEmail = TpLinkCipher.mime_encoder(this.encodedEmail);
    }
	
    private sha_digest_username(data:string): string{
      const digest = this.crypto.createHash('sha1').update(data).digest('hex');
	
      return digest;
    }

    private createKeyPair(){
      // Including publicKey and  privateKey from  
      // generateKeyPairSync() method with its  
      // parameters 
      const { publicKey, privateKey } = this.crypto.generateKeyPairSync('rsa', {     
        publicKeyEncoding: { 
          type: 'spki', 
          format: 'pem',
        }, 
        privateKeyEncoding: { 
          type: 'pkcs1', 
          format: 'pem',
        }, 
        modulusLength: 1024,
      }); 
  
      this.privateKey = privateKey;
      this.publicKey = publicKey.toString('utf8');
    }

    async handshake():Promise<void>{
      const URL = 'http://' + this.ip + '/app';
      const payload = {
        'method':'handshake',
        'params':{
          'key': this.publicKey,
          'requestTimeMils': Math.round(Date.now() * 1000),
        },
      };
      this.log.debug('Handshake P100 on host: ' + this.ip);

      await this.axios.post(URL, payload)
        .then((res:any) => {
          this.log.debug('Received Handshake P100 on host response: ' + this.ip);

          if(res.data.error_code){
            const errorCode = res.data.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('94 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }

          try{
            const encryptedKey = res.data.result.key.toString('utf8');
            this.decode_handshake_key(encryptedKey);
            this.cookie = res.headers['set-cookie'][0].split(';')[0];
            return;
          } catch (error){
            const errorCode = res.data.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('106 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
        })
        .catch((error: any) => {
          this.log.error('111 Error: ' + error.message);
          return new Error(error);
        });
    }

    async login():Promise<void>{
      const URL = 'http://' + this.ip + '/app';
      const payload = '{'+
        '"method": "login_device",'+
        '"params": {'+
        '"username": "' + this.encodedEmail +'",'+
        '"password": "' + this.encodedPassword + '"'+
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

      await this.axios.post(URL, securePassthroughPayload, config)
        .then((res:any) => {
          if(res.data.error_code){
            const errorCode = res.data.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('149 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
          const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
          try{
            const response = JSON.parse(decryptedResponse);
            if(response.error_code !== 0){
              const errorCode = response.error_code;
              const errorMessage = this.ERROR_CODES[errorCode];
              this.log.error('158 Error Code: ' + errorCode + ', ' + errorMessage);
              return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            this.token = response.result.token;
            return;
          } catch (error){
            const errorCode = JSON.parse(decryptedResponse).error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('166 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
        })
        .catch((error: any) => {
          this.log.error('Error: ' + error.message);
          return new Error(error);
        });
    }

    private decode_handshake_key(key:string){
      const buff = Buffer.from(key, 'base64');

      const decoded = this.crypto.privateDecrypt(
        {
          key:  this.privateKey,
          padding: this.crypto.constants.RSA_PKCS1_PADDING,
        }
        , buff);
      
      const b_arr = decoded.slice(0, 16);
      const b_arr2 = decoded.slice(16, 32);      

      this.tpLinkCipher = new TpLinkCipher(this.log, b_arr, b_arr2);
    }

    async turnOff():Promise<true>{
      const URL = 'http://' + this.ip + '/app?token=' + this.token;
      
      const payload = '{'+
            '"method": "set_device_info",'+
            '"params": {'+
                '"device_on": false'+
                '},'+
                '"terminalUUID": ' + this.terminalUUID + ',' +
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
          //console.log(res);
          if(res.data.error_code){
            const errorCode = res.data.error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('225 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
              
          const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
          try{
            const response = JSON.parse(decryptedResponse);
            if(response.error_code !== 0){
              const errorCode = response.error_code;
              const errorMessage = this.ERROR_CODES[errorCode];
              this.log.error('235 Error Code: ' + errorCode + ', ' + errorMessage);
              return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            return true;
          } catch (error){
            const errorCode = JSON.parse(decryptedResponse).error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('242 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
        })
        .catch((error:any) => {
          this.log.error('247 Error: ' + error.message);
          return new Error(error);
        });
    }

    async turnOn():Promise<true>{
      const URL = 'http://' + this.ip + '/app?token=' + this.token;
        
      const payload = '{'+
              '"method": "set_device_info",'+
              '"params": {'+
                  '"device_on": true'+
                  '},'+
                  '"terminalUUID": ' + this.terminalUUID + ',' +
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
            this.log.error('284 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
                
          const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
          try{
            const response = JSON.parse(decryptedResponse);
            if(response.error_code !== 0){
              const errorCode = response.error_code;
              const errorMessage = this.ERROR_CODES[errorCode];
              this.log.error('294 Error Code: ' + errorCode + ', ' + errorMessage);
              return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            return true;
          } catch (error){
            const errorCode = JSON.parse(decryptedResponse).error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('301 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
        })
        .catch((error:any) => {
          this.log.error('306 Error: ' + error.message);
          return new Error(error);
        });
    }

    async setPowerState(state:boolean): Promise<true>{
      if(state){
        return this.turnOn();
      } else{
        return this.turnOff();
      }
    }
    
    async getDeviceInfo(): Promise<PlugSysinfo>{
      const URL = 'http://' + this.ip + '/app?token=' + this.token;
          
      const payload = '{'+
                '"method": "get_device_info",'+
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
            this.log.error('348 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
                  
          const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
          try{
            const response = JSON.parse(decryptedResponse);
            if(response.error_code !== 0){
              const errorCode = response.error_code;
              const errorMessage = this.ERROR_CODES[errorCode];
              this.log.error('358 Error Code: ' + errorCode + ', ' + errorMessage);
              return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
            }
            this.setSysInfo(response.result);
            return this.getSysInfo();
          } catch (error){
            const errorCode = JSON.parse(decryptedResponse).error_code;
            const errorMessage = this.ERROR_CODES[errorCode];
            this.log.error('366 Error Code: ' + errorCode + ', ' + errorMessage);
            return new Error('Error Code: ' + errorCode + ', ' + errorMessage);
          }
        })
        .catch((error:any) => {
          this.log.error('371 Error: ' + error.message);
          return new Error(error);
        });
    }

    /**
   * Cached value of `sysinfo.device_id`  if set.
   */
    get id(): string {
      if(this.getSysInfo()){
        return this.getSysInfo().device_id;
      }
      return '';
    }

    /**
   * Cached value of `sysinfo.device_id`  if set.
   */
    get name(): string {
      if(this.getSysInfo()){
        return Buffer.from(this.getSysInfo().nickname, 'base64').toString('utf8');
      }
      return '';
    }

    get model(): string {
      if(this.getSysInfo()){
        return this.getSysInfo().model;
      }
      return '';
    }
  
    get serialNumber(): string {
      if(this.getSysInfo()){
        this.getSysInfo().hw_id;
      }
      return '';
    }
  
    get firmwareRevision(): string {
      if(this.getSysInfo()){
        return this.getSysInfo().fw_ver;
      }
      return '';
    }
  
    get hardwareRevision(): string {
      if(this.getSysInfo()){
        return this.getSysInfo().hw_ver;
      }
      return '';
    }

    protected setSysInfo(sysInfo:PlugSysinfo){
      this._plugSysInfo = sysInfo;
    }

    public getSysInfo():PlugSysinfo{
      return this._plugSysInfo;
    }
}