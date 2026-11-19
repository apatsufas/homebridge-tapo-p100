import { CharacteristicValue, HapStatusError, Logger, PlatformAccessory, Service } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import { TpLinkAccessory } from './utils/tplinkAccessory.js';

/** Delay before retrying start-up when a device is unreachable. */
const INIT_RETRY_MS = 60000;
/** Extra delay added to the next poll after a failed one. */
const OFFLINE_BACKOFF_MS = 300000;

export abstract class TPLinkPlatformAccessory <T extends TpLinkAccessory>{

  protected tpLinkAccessory!: T;
  protected service!: Service;
  private readonly pendingWhileOff = new Map<string, () => Promise<boolean>>();

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {
    this.log.debug('Start adding accessory: ' + accessory.context.device.host);
  }

  protected initialise(platform: TapoPlatform, updateInterval?: number):void{
    // Always try KLAP first; a previous failed attempt may have flipped this flag.
    this.tpLinkAccessory.is_klap = true;
    this.tpLinkAccessory.handshake().then(() => {
      if(this.tpLinkAccessory.is_klap){
        setTimeout(()=>{
          this.tpLinkAccessory.handshake_new().then(() => {
            this.init(platform, updateInterval);
          }).catch(() => {
            this.log.debug('KLAP Handshake failed, falling back to legacy login');
            this.tpLinkAccessory.is_klap = false;
            this.legacyLogin(platform, updateInterval);
          });
        }, 100);
      } else{
        this.legacyLogin(platform, updateInterval);
      }
    }).catch(() => {
      this.log.error('Handshake failed');
      this.retryInitialise();
    });
  }

  private legacyLogin(platform: TapoPlatform, updateInterval?: number):void{
    this.tpLinkAccessory.login().then(() => {
      // If neither KLAP nor the legacy handshake established a session, init()'s
      // getDeviceInfo rejects and init() schedules a retry.
      this.init(platform, updateInterval);
    }).catch(() => {
      this.log.error('Login failed');
      this.retryInitialise();
    });
  }

  /**
   * Called when the device could not be reached during start-up. Marks the accessory
   * as not responding and tries the whole handshake again later.
   */
  protected retryInitialise():void{
    this.setNoResponse();
    this.log.warn('Device ' + this.accessory.context.device.host + ' not reachable, retrying in ' +
      INIT_RETRY_MS / 1000 + 's');
    setTimeout(() => {
      this.initialise(this.platform, this.updateInterval);
    }, INIT_RETRY_MS);
  }

  protected abstract init(platform: TapoPlatform, updateInterval?: number):void;

  /**
   * Schedules exactly one future updateState call. `interval` is always the configured
   * polling interval; a failed poll only delays the next one, it never grows `interval`.
   */
  protected scheduleNextUpdate(interval:number, failed = false):void{
    setTimeout(() => {
      this.updateState(interval);
    }, failed ? interval + OFFLINE_BACKOFF_MS : interval);
  }

  /** The error HomeKit shows as "No Response". Throw it from onGet/onSet handlers. */
  protected unreachable():HapStatusError{
    return new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  /**
   * Reads a value from the last polled device state for an onGet handler. Throws "No Response"
   * if the device has not reported that value.
   */
  protected cached<V extends CharacteristicValue>(read: (sysInfo: ReturnType<T['getSysInfo']>) => V | undefined):V{
    const sysInfo = this.tpLinkAccessory.getSysInfo() as ReturnType<T['getSysInfo']>;
    const value = sysInfo ? read(sysInfo) : undefined;
    if(value === undefined || value === null){
      throw this.unreachable();
    }
    return value;
  }

  /**
   * Runs a device request for an onSet handler, turning a failed or rejected request into
   * "No Response".
   */
  protected async send(what: string, request: () => Promise<boolean>):Promise<void>{
    let result: boolean;
    try{
      result = await request();
    } catch(error){
      this.log.error('Failed to set ' + what + ': ' + error);
      throw this.unreachable();
    }
    if(!result){
      throw this.unreachable();
    }
  }

  async setOn(value: CharacteristicValue):Promise<void>{
    await this.send('power state', () => this.tpLinkAccessory.setPowerState(value as boolean));
    this.platform.log.debug('Set Characteristic On ->', value);
    this.tpLinkAccessory.getSysInfo().device_on = value as boolean;
    if(value){
      this.applyPendingChanges();
    }
  }

  async getOn():Promise<CharacteristicValue>{
    const isOn = this.cached((sysInfo) => sysInfo.device_on);
    this.platform.log.debug('Get Characteristic On ->', isOn);
    return isOn;
  }

  /**
   * Applies a light setting (brightness, colour, ...) from HomeKit. While the device is off the
   * change is queued under `key` (newer values replace older ones) and sent right after the
   * device is switched on, so it is neither lost nor able to switch the light on by itself
   * (e.g. Adaptive Lighting updates at night).
   */
  protected async setWhenOn(key: string, apply: () => Promise<boolean>):Promise<void>{
    const sysInfo = this.tpLinkAccessory.getSysInfo();
    if(sysInfo && sysInfo.device_on){
      await this.send(key, apply);
    } else{
      this.log.debug('Device off, queueing ' + key + ' until it is switched on');
      // delete first so the latest change is applied last
      this.pendingWhileOff.delete(key);
      this.pendingWhileOff.set(key, apply);
    }
  }

  protected discardPendingChange(key: string):void{
    this.pendingWhileOff.delete(key);
  }

  private async applyPendingChanges():Promise<void>{
    const pending = [...this.pendingWhileOff.entries()];
    this.pendingWhileOff.clear();
    for(const [key, apply] of pending){
      try{
        if(!await apply()){
          this.log.warn('Could not apply queued ' + key + ' change');
        }
      } catch(error){
        this.log.warn('Could not apply queued ' + key + ' change: ' + error);
      }
    }
  }

  protected updateState(interval:number){
    this.platform.log.debug('Updating state');
    this.tpLinkAccessory.getDeviceInfo(true).then((response) => {
      if(response){
        const isOn = response.device_on;

        this.platform.log.debug('Get Characteristic On ->', isOn);

        if(isOn !== undefined){
          this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
        } else{
          this.platform.log.debug('On is undefined -> set no response');
          this.setNoResponse();
        }

        this.scheduleNextUpdate(interval);
      } else{
        this.setNoResponse();
        this.scheduleNextUpdate(interval, true);
      }
    }).catch(()=>{
      this.setNoResponse();
      this.scheduleNextUpdate(interval, true);
    });
  }

  protected setNoResponse():void{
    this.service.updateCharacteristic(this.platform.Characteristic.On, this.unreachable());
  }
}
