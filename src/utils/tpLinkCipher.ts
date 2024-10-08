/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from 'homebridge';

export default class TpLinkCipher{
  public iv: any; 
  public key: any; 
  private crypto = require('crypto');

  constructor(public readonly log: Logger, b_arr: any, b_arr2: any){
    this.iv = b_arr2;
    this.key = b_arr;
  }
   
  public static mime_encoder(to_encode: string){
    const base64data = Buffer.from(to_encode).toString('base64');
    return base64data;
  }

  public encrypt(data:string){
    const cipher = this.crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  public decrypt(data: string){
    const decipher = this.crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
   