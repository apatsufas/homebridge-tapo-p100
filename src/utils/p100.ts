/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'homebridge';
import { PlugSysinfo } from '../homekit-device/types.js';
import TpLinkCipher from './tpLinkCipher.js';
import { v4 as uuidv4 } from 'uuid';
import { AxiosResponse } from 'axios';
import NewTpLinkCipher from './newTpLinkCipher.js';
import { TpLinkAccessory } from './tplinkAccessory.js';
import axios from 'axios';
import crypto from 'crypto';
import utf8 from 'utf8';

export default class P100 implements TpLinkAccessory{

  private _crypto = crypto;
  protected _axios = axios;
  private _utf8 = utf8;
  public is_klap = true;

  private encodedPassword!: string;
  private encodedEmail!: string;
  private privateKey!: string;
  private publicKey!: string;
  protected ip: string;
  protected cookie!: string;
  protected tplink_timeout!: number;
  protected token!: string;
  protected terminalUUID: string;
  private _plugSysInfo!: PlugSysinfo;
  private _reconnect_counter: number;
  protected _timeout!: number;

  protected tpLinkCipher!: TpLinkCipher;
  protected newTpLinkCipher!: NewTpLinkCipher;

  protected ERROR_CODES = {
    '0': 'Success',
    '-1010': 'Invalid Public Key Length',
    '-1012': 'Invalid terminalUUID',
    '-1501': 'Invalid Request or Credentials',
    '1002': 'Incorrect Request',
    '-1003': 'JSON formatting error ',
    '9999': 'Session Timeout',
    '-1301': 'Device Error',
    '1100': 'Handshake Failed',
    '1111': 'Login Failed',
    '1112': 'Http Transport Failed',
    '1200': 'Multiple Requests Failed',
    '-1004': 'JSON Encode Failed',
    '-1005': 'AES Decode Failed',
    '-1006': 'Request Length Error',
    '-2101': 'Account Error',
    '-1': 'ERR_COMMON_FAILED',
    '1000': 'ERR_NULL_TRANSPORT',
    '1001': 'ERR_CMD_COMMAND_CANCEL',
    '-1001': 'ERR_UNSPECIFIC',
    '-1002': 'ERR_UNKNOWN_METHOD',
    '-1007': 'ERR_CLOUD_FAILED',
    '-1008': 'ERR_PARAMS',
    '-1101': 'ERR_SESSION_PARAM',
    '-1201': 'ERR_QUICK_SETUP',
    '-1302': 'ERR_DEVICE_NEXT_EVENT',
    '-1401': 'ERR_FIRMWARE',
    '-1402': 'ERR_FIRMWARE_VER_ERROR',
    '-1601': 'ERR_TIME',
    '-1602': 'ERR_TIME_SYS',
    '-1603': 'ERR_TIME_SAVE',
    '-1701': 'ERR_WIRELESS',
    '-1702': 'ERR_WIRELESS_UNSUPPORTED',
    '-1801': 'ERR_SCHEDULE',
    '-1802': 'ERR_SCHEDULE_FULL',
    '-1803': 'ERR_SCHEDULE_CONFLICT',
    '-1804': 'ERR_SCHEDULE_SAVE',
    '-1805': 'ERR_SCHEDULE_INDEX',
    '-1901': 'ERR_COUNTDOWN',
    '-1902': 'ERR_COUNTDOWN_CONFLICT',
    '-1903': 'ERR_COUNTDOWN_SAVE',
    '-2001': 'ERR_ANTITHEFT',
    '-2002': 'ERR_ANTITHEFT_CONFLICT',
    '-2003': 'ERR_ANTITHEFT_SAVE',
    '-2201': 'ERR_STAT',
    '-2202': 'ERR_STAT_SAVE',
    '-2301': 'ERR_DST',
    '-2302': 'ERR_DST_SAVE',
    '1003': 'KLAP',
  };

  constructor(
    public readonly log: Logger,
    public readonly ipAddress: string,
    public readonly email: string,
    public readonly password: string,
    public readonly timeout: number,
  ) {
    this.log.debug('Constructing P100 on host: ' + ipAddress);
    this.ip = ipAddress;
    this.encryptCredentials(email, password);
    this.createKeyPair();
    this.terminalUUID = uuidv4();
    this._reconnect_counter = 0;
    this._timeout = timeout;
  }

  private encryptCredentials(email: string, password: string) {
    //Password Encoding
    this.encodedPassword = TpLinkCipher.mime_encoder(password);

    //Email Encoding
    this.encodedEmail = this.sha_digest_username(email);
    this.encodedEmail = TpLinkCipher.mime_encoder(this.encodedEmail);
  }

  private sha_digest_username(data: string): string {
    const digest = this._crypto.createHash('sha1').update(data).digest('hex');

    return digest;
  }

  private calc_auth_hash(username: string, password: string): Buffer {
    const usernameDigest = this._crypto.createHash('sha1').update(Buffer.from(username.normalize('NFKC'))).digest();
    const passwordDigest = this._crypto.createHash('sha1').update(Buffer.from(password.normalize('NFKC'))).digest();
    const digest = this._crypto.createHash('sha256').update((Buffer.concat([usernameDigest, passwordDigest]))).digest();
    return digest;
  }

  private createKeyPair() {
    // Including publicKey and  privateKey from  
    // generateKeyPairSync() method with its  
    // parameters 
    const { publicKey, privateKey } = this._crypto.generateKeyPairSync('rsa', {
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
    //@ts-ignore
    this.publicKey = publicKey.toString('utf8');
  }

  //old tapo requests
  async handshake(): Promise<void> {
    const URL = 'http://' + this.ip + '/app';
    const payload = {
      'method': 'handshake',
      'params': {
        'key': this.publicKey,
        'requestTimeMils': Math.round(Date.now() * 1000),
      },
    };
    this.log.debug('Handshake P100 on host: ' + this.ip);

    const headers = {
      'Connection': 'Keep-Alive',
    };
    const config = {
      timeout: 5000,
      headers: headers,
    };

    await this._axios.post(URL, payload, config)
      .then((res: AxiosResponse) => {
        this.log.debug('Received Handshake P100 on host response: ' + this.ip);

        if (res.data.error_code || res.status !== 200) {
          return this.handleError(res.data!.error_code ? res.data.error_code : res.status, '172');
        }

        try {
          const encryptedKey = res.data.result.key.toString('utf8');
          this.decode_handshake_key(encryptedKey);
          if(res.headers['set-cookie']){
            this.cookie = res.headers['set-cookie'][0].split(';')[0];
          }
          return;
        } catch (error) {
          return this.handleError(res.data.error_code, '106');
        }
      })
      .catch((error: Error) => {
        this.log.error('111 Error: ' + error.message);
        return error;
      });
  }

  async login(): Promise<void> {
    const URL = 'http://' + this.ip + '/app';
    const payload = '{' +
      '"method": "login_device",' +
      '"params": {' +
      '"username": "' + this.encodedEmail + '",' +
      '"password": "' + this.encodedPassword + '"' +
      '},' +
      '"requestTimeMils": ' + Math.round(Date.now() * 1000) + '' +
      '};';

    const headers = {
      'Cookie': this.cookie,
      'Connection': 'Keep-Alive',
    };

    if (this.tpLinkCipher) {
      const encryptedPayload = this.tpLinkCipher.encrypt(payload);

      const securePassthroughPayload = {
        'method': 'securePassthrough',
        'params': {
          'request': encryptedPayload,
        },
      };

      const config = {
        headers: headers,
        timeout: this._timeout * 1000,
      };

      await this._axios.post(URL, securePassthroughPayload, config)
        .then((res: AxiosResponse) => {
          if (res.data.error_code || res.status !== 200) {
            return this.handleError(res.data!.error_code ? res.data.error_code : res.status, '226');
          }
          const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
          try {
            const response = JSON.parse(decryptedResponse);
            if (response.error_code !== 0) {
              return this.handleError(res.data.error_code, '152');
            }
            this.token = response.result.token;
            return;
          } catch (error) {
            return this.handleError(JSON.parse(decryptedResponse).error_code, '157');
          }
        })
        .catch((error: Error) => {
          this.log.error('Error: ' + error.message);
          return error;
        });
    }
  }

  private async raw_request(path: string, data: Buffer, responseType: string, params?: any): Promise<any> {
    const URL = 'http://' + this.ip + '/app/' + path;

    const headers = {
      'Connection': 'Keep-Alive',
      Host: this.ip,
      Accept: '*/*',
      'Content-Type': 'application/octet-stream',
    };

    if (this.cookie) {
      //@ts-ignore
      headers.Cookie = this.cookie;
    }

    const config = {
      timeout: 5000,
      responseType: responseType,
      headers: headers,
      params: params,
    };
    //@ts-ignore
    return this._axios.post(URL, data, config)
      .then((res: AxiosResponse) => {
        this.log.debug('Received request on host response: ' + this.ip);
        if (res.data.error_code || res.status !== 200) {
          return this.handleError(res.data!.error_code ? res.data.error_code : res.status, '273');
        }

        try {
          if (res.headers && res.headers['set-cookie']) {
            this.log.debug('Handshake 1 cookie: ' + JSON.stringify(res.headers['set-cookie'][0]));
            this.cookie = res.headers['set-cookie'][0].split(';')[0];
            this.tplink_timeout = Number(res.headers['set-cookie'][0].split(';')[1]);
          }
          return res.data;
        } catch (error) {
          return this.handleError(res.data.error_code, '318');
        }
      })
      .catch((error: Error) => {
        this.log.error('276 Error: ' + error.message);
        if(error.message.indexOf('403') > -1){
          this.reAuthenticate();
        }
        return error;
      });
  }

  private decode_handshake_key(key: string) {
    const buff = Buffer.from(key, 'base64');

    const decoded = this._crypto.privateDecrypt(
      {
        key: this.privateKey,
        padding: this._crypto.constants.RSA_PKCS1_PADDING,
      }
      , buff);

    const b_arr = decoded.slice(0, 16);
    const b_arr2 = decoded.slice(16, 32);

    this.tpLinkCipher = new TpLinkCipher(this.log, b_arr, b_arr2);
  }

  //new tapo klap requests
  async handshake_new(): Promise<void> {
    this.log.debug('Trying new habdshake');

    const local_seed = this._crypto.randomBytes(16);

    await this.raw_request('handshake1', local_seed, 'arraybuffer').then((res) => {
      const remote_seed: Buffer = res.subarray(0, 16);
      const server_hash: Buffer = res.subarray(16);

      let auth_hash: any = undefined;
      const ah = this.calc_auth_hash(this.email, this.password);
      const local_seed_auth_hash = this._crypto.createHash('sha256').update(Buffer.concat([local_seed, remote_seed, ah])).digest();

      if (local_seed_auth_hash.toString('hex') === server_hash.toString('hex')) {
        this.log.debug('Handshake 1 successful');
        auth_hash = ah;
      }
      const req = this._crypto.createHash('sha256').update(Buffer.concat([remote_seed, local_seed, auth_hash])).digest();

      return this.raw_request('handshake2', req, 'text').then((res) => {
        this.log.debug('Handshake 2 successful: ' + res);

        this.newTpLinkCipher = new NewTpLinkCipher(local_seed, remote_seed, auth_hash, this.log);
        this.log.debug('Init cipher successful');

        return;
      });
    });
  }

  async turnOff(): Promise<boolean> {
    const payload = '{' +
      '"method": "set_device_info",' +
      '"params": {' +
      '"device_on": false' +
      '},' +
      '"terminalUUID": "' + this.terminalUUID + '",' +
      '"requestTimeMils": ' + Math.round(Date.now() * 1000) + '' +
      '};';
    return this.sendRequest(payload);
  }

  async turnOn(): Promise<boolean> {
    const payload = '{' +
      '"method": "set_device_info",' +
      '"params": {' +
      '"device_on": true' +
      '},' +
      '"terminalUUID": "' + this.terminalUUID + '",' +
      '"requestTimeMils": ' + Math.round(Date.now() * 1000) + '' +
      '};';

    return this.sendRequest(payload);
  }

  async setPowerState(state: boolean): Promise<boolean> {
    if (state) {
      return this.turnOn();
    } else {
      return this.turnOff();
    }
  }

  async getDeviceInfo(force?:boolean): Promise<PlugSysinfo> {
    if (!force) {
      return new Promise((resolve) => {
        resolve(this.getSysInfo());
      });
    }
    const URL = 'http://' + this.ip + '/app?token=' + this.token;

    const payload = '{' +
      '"method": "get_device_info",' +
      '"requestTimeMils": ' + Math.round(Date.now() * 1000) + '' +
      '};';
    const headers = {
      'Cookie': this.cookie,
    };

    if (this.tpLinkCipher) {
      const encryptedPayload = this.tpLinkCipher.encrypt(payload);

      const securePassthroughPayload = {
        'method': 'securePassthrough',
        'params': {
          'request': encryptedPayload,
        },
      };

      const config = {
        headers: headers,
        timeout: this._timeout * 1000,
      };
      //@ts-ignore
      return this._axios.post(URL, securePassthroughPayload, config)
        .then((res:any) => {
          if (res.data.error_code) {
            if ((res.data.error_code === '9999' || res.data.error_code === 9999) && this._reconnect_counter <= 3) {
              //@ts-ignore
              this.log.error(' Error Code: ' + res.data.error_code + ', ' + this.ERROR_CODES[res.data.error_code]);
              this.log.debug('Trying to reconnect...');
              return this.reconnect().then(() => {
                return this.getDeviceInfo();
              });
            }
            this._reconnect_counter = 0;
            return this.handleError(res.data.error_code, '326');
          }

          const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
          try {
            const response = JSON.parse(decryptedResponse);
            if (response.error_code !== 0) {
              return this.handleError(response.error_code, '333');
            }
            this.setSysInfo(response.result);
            this.log.debug('Device Info: ', response.result);

            return this.getSysInfo();
          } catch (error) {
            return this.handleError(JSON.parse(decryptedResponse).error_code, '340');
          }
        })
        .catch((error: Error) => {
          this.log.error('371 Error: ' + error.message);
          return error;
        });
    } else if (this.newTpLinkCipher) {
      const data = this.newTpLinkCipher.encrypt(payload);

      const URL = 'http://' + this.ip + '/app/' + 'request';
      const headers = {
        'Connection': 'Keep-Alive',
        Host: this.ip,
        Accept: '*/*',
        'Content-Type': 'application/octet-stream',
      };

      if (this.cookie) {
        //@ts-ignore
        headers.Cookie = this.cookie;
      }

      const config = {
        timeout: 5000,
        responseType: 'arraybuffer',
        headers: headers,
        params: { seq: data.seq.toString() },
      };
      //@ts-ignore
      return this._axios.post(URL, data.encryptedPayload, config)
        .then((res: AxiosResponse) => {
          if (res.data.error_code) {
            return this.handleError(res.data.error_code, '309');
          }

          try {
            if (res.headers && res.headers['set-cookie']) {
              this.cookie = res.headers['set-cookie'][0].split(';')[0];
            }

            const response = JSON.parse(this.newTpLinkCipher.decrypt(res.data));

            if (response.error_code !== 0) {
              return this.handleError(response.error_code, '333');
            }
            this.setSysInfo(response.result);
            this.log.debug('Device Info: ', response.result);

            return this.getSysInfo();
          } catch (error) {
            this.log.debug(this.newTpLinkCipher.decrypt(res.data));
            this.log.debug('Status: ' + res.status);
            return this.handleError(res.data.error_code, '480');
          }
        })
        .catch((error: Error) => {
          this.log.debug('469 Error: ' + JSON.stringify(error));
          this.log.error('469 Error: ' + error.message);
          if(error.message.indexOf('403') > -1){
            this.reAuthenticate();
          }
          return error;
        });


    } else {
      return new Promise<PlugSysinfo>((resolve, reject) => {
        reject();
      });
    }
  }

  /**
 * Cached value of `sysinfo.device_id`  if set.
 */
  get id(): string {
    if (this.getSysInfo()) {
      return this.getSysInfo().device_id;
    }
    return '';
  }

  /**
 * Cached value of `sysinfo.device_id`  if set.
 */
  get name(): string {
    if (this.getSysInfo()) {
      return Buffer.from(this.getSysInfo().nickname, 'base64').toString('utf8');
    }
    return '';
  }

  get model(): string {
    if (this.getSysInfo()) {
      return this.getSysInfo().model;
    }
    return '';
  }

  get serialNumber(): string {
    if (this.getSysInfo()) {
      return this.getSysInfo().hw_id;
    }
    return '';
  }

  get firmwareRevision(): string {
    if (this.getSysInfo()) {
      return this.getSysInfo().fw_ver;
    }
    return '';
  }

  get hardwareRevision(): string {
    if (this.getSysInfo()) {
      return this.getSysInfo().hw_ver;
    }
    return '';
  }

  protected setSysInfo(sysInfo: PlugSysinfo) {
    this._plugSysInfo = sysInfo;
    this._plugSysInfo.last_update = Date.now();
  }

  public getSysInfo(): PlugSysinfo {
    return this._plugSysInfo;
  }

  protected handleError(errorCode: number | string, line: string): boolean {
    //@ts-ignore
    const errorMessage = this.ERROR_CODES[errorCode];
    if (typeof errorCode === 'number' && errorCode === 1003) {
      this.log.info('Trying KLAP Auth');
      this.is_klap = true;
    } else{
      this.log.error(line + ' Error Code: ' + errorCode + ', ' + errorMessage + ' ' + this.ip);
    }
    return false;
  }

  protected async sendRequest(payload: string): Promise<boolean> {
    if (this.tpLinkCipher) {
      return this.handleRequest(payload).then((result) => {
        return result ? true : false;
      }).catch((error) => {
        if (error.message && error.message.indexOf('9999') > 0 && this._reconnect_counter <= 3) {
          return this.reconnect().then(() => {
            return this.handleRequest(payload).then((result) => {
              return result ? true : false;
            });
          });
        }
        this._reconnect_counter = 0;
        return false;
      });
    } else {
      return this.handleKlapRequest(payload).then((result) => {
        return result ? true : false;
      }).catch((error) => {
        if (error.message && error.message.indexOf('9999') > 0 && this._reconnect_counter <= 3) {
          return this.newReconnect().then(() => {
            return this.handleKlapRequest(payload).then((result) => {
              return result ? true : false;
            });
          });
        }
        this._reconnect_counter = 0;
        return false;
      });
    }
  }

  protected handleRequest(payload: string): Promise<any> {
    const URL = 'http://' + this.ip + '/app?token=' + this.token;

    const headers = {
      'Cookie': this.cookie,
      'Connection': 'Keep-Alive',
    };

    if (this.tpLinkCipher) {
      const encryptedPayload = this.tpLinkCipher.encrypt(payload);

      const securePassthroughPayload = {
        'method': 'securePassthrough',
        'params': {
          'request': encryptedPayload,
        },
      };

      const config = {
        headers: headers,
        timeout: this._timeout * 1000,
      };

      return this._axios.post(URL, securePassthroughPayload, config)
        .then((res: AxiosResponse) => {
          if (res.data.error_code) {
            if (res.data.error_code === '9999' || res.data.error_code === 9999 && this._reconnect_counter <= 3) {
              //@ts-ignore
              this.log.error(' Error Code: ' + res.data.error_code + ', ' + this.ERROR_CODES[res.data.error_code]);
              this.log.debug('Trying to reconnect...');
              return this.reconnect().then(() => {
                return this.getDeviceInfo();
              });
            }
            this._reconnect_counter = 0;
            return this.handleError(res.data.error_code, '357');
          }

          const decryptedResponse = this.tpLinkCipher.decrypt(res.data.result.response);
          try {
            const response = JSON.parse(decryptedResponse);
            this.log.debug(response);
            if (response.error_code !== 0) {
              return this.handleError(response.error_code, '364');
            }
            return response;
          } catch (error) {
            return this.handleError(JSON.parse(decryptedResponse).error_code, '368');
          }
        })
        .catch((error: Error) => {
          return this.handleError(error.message, '656');
        });
    }
    return new Promise<true>((resolve, reject) => {
      reject();
    });
  }

  protected handleKlapRequest(payload: string): Promise<any> {
    if (this.newTpLinkCipher) {
      const data = this.newTpLinkCipher.encrypt(payload);

      return this.raw_request('request', data.encryptedPayload, 'arraybuffer', { seq: data.seq.toString() }).then((res) => {
        return JSON.parse(this.newTpLinkCipher.decrypt(res));
      }).catch((error: Error) => {
        return this.handleError(error.message, '671');
      });
    }
    return new Promise<true>((resolve, reject) => {
      reject();
    });
  }

  protected async reconnect(): Promise<void> {
    this._reconnect_counter++;
    return this.handshake().then(() => {
      this.login().then(() => {
        return;
      });
    });
  }


  protected async newReconnect(): Promise<void> {
    this._reconnect_counter++;
    return this.handshake_new().then(() => {
      return;
    });
  }

  private reAuthenticate():void{
    if(this.is_klap){
      this.handshake_new().then(() => {
        this.log.info('KLAP Authenticated successfully');
      }).catch(() => {
        this.log.error('KLAP Handshake failed');
        this.is_klap = false;
      });
    } else {
      this.handshake().then(() => {
        this.login().then(() => {
          this.log.info('Authenticated successfully');
        }).catch(() => {
          this.log.error('Login failed');
        });
      });
    }
  }
}