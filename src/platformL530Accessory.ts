import { PlatformAccessory, CharacteristicValue, Logger, 
  AdaptiveLightingController } from 'homebridge';
import type { TapoPlatform } from './platform.js';
import L530 from './utils/l530.js';
import { TPLinkPlatformAccessory } from './platformTPLinkAccessory.js';
import { EnergyTotal } from './utils/energyTotal.js';

/**
 * L530 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class L530Accessory extends TPLinkPlatformAccessory<L530> {
  private adaptiveLightingController!: AdaptiveLightingController;
  private readonly fakeGatoHistoryService;
  private readonly energyTotal: EnergyTotal;
  /** Hue/saturation set by HomeKit but not yet sent to the bulb. */
  private pendingColor: { hue?: number; saturation?: number } = {};

  constructor(
    public readonly log: Logger,
    protected readonly platform: TapoPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly timeout: number,
    protected readonly updateInterval?: number,
  ) {
    super(log, platform, accessory, timeout, updateInterval);

    this.tpLinkAccessory = new L530(this.log, accessory.context.device.host, platform.config.username, platform.config.password, 
      this.timeout);

    this.fakeGatoHistoryService = new this.platform.FakeGatoHistoryService('energy', accessory, {
      log: this.log,
      size:4096, 
      storage:'fs',
    });
    this.energyTotal = new EnergyTotal(this.fakeGatoHistoryService, this.log);

    this.initialise(platform, updateInterval);

    // get the Outlet service if it exists, otherwise create a new Outlet service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  protected init(platform: TapoPlatform, updateInterval?: number){
    this.log.debug('init called');

    this.tpLinkAccessory.getDeviceInfo(true).then((sysInfo) => {
      this.log.debug('SysInfo: ', sysInfo);

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo L530')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Outlet

      this.service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setOn.bind(this))
        .onGet(this.getOn.bind(this));

      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .onSet(this.setBrightness.bind(this))
        .onGet(this.getBrightness.bind(this));

      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .onSet(this.setColorTemp.bind(this))
        .onGet(this.getColorTemp.bind(this))
        .setProps({
          minValue: 154,
          maxValue: 400,
          minStep: 1,
        });

      this.service.getCharacteristic(this.platform.Characteristic.Hue)
        .onSet(this.setHue.bind(this))
        .onGet(this.getHue.bind(this));

      this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        .onSet(this.setSaturation.bind(this))
        .onGet(this.getSaturation.bind(this));
        
      this.service.addOptionalCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic);
      this.service.getCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic)
        .onGet(this.getCurrentConsumption.bind(this));

      this.service.addOptionalCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic);
      this.service.getCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic)
        .onGet(this.getTotalConsumption.bind(this));

      // Setup the adaptive lighting controller if available
      if (this.platform.api.versionGreaterOrEqual && this.platform.api.versionGreaterOrEqual('1.3.0-beta.23')) {
        this.log.debug('Enabling Adaptvie Lightning');
        this.adaptiveLightingController = new platform.api.hap.AdaptiveLightingController(
          this.service, {
            controllerMode:
              this.platform.api.hap.AdaptiveLightingControllerMode.AUTOMATIC,
          },
        );
        this.accessory.configureController(this.adaptiveLightingController);
      }

      this.updateConsumption();

      const interval = updateInterval ? updateInterval*1000 : 10000;
      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(() => {
      this.log.error('100 - Get Device Info failed');
      this.retryInitialise();
    });
  }

  async setBrightness(value: CharacteristicValue):Promise<void> {
    const brightness = value as number;
    return this.setWhenOn('brightness', () => this.tpLinkAccessory.setBrightness(brightness).then((result) => {
      if(result){
        this.platform.log.debug('Set Characteristic Brightness ->', brightness);
        this.tpLinkAccessory.getSysInfo().brightness = brightness;
      }
      return result;
    }));
  }

  async getBrightness():Promise<CharacteristicValue> {
    const brightness = this.cached((sysInfo) => sysInfo.brightness);
    this.platform.log.debug('Get Characteristic Brightness ->', brightness);
    return brightness;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  async setColorTemp(value: CharacteristicValue):Promise<void> {
    this.log.debug('Color Temp Homekit :' + value);
    const mired = value as number;
    // colour temperature and hue/saturation are mutually exclusive modes on the bulb
    this.pendingColor = {};
    this.discardPendingChange('color');
    // L520E.setColorTemp caches the resulting Kelvin value itself.
    return this.setWhenOn('colorTemp', () => this.tpLinkAccessory.setColorTemp(mired));
  }

  async getColorTemp():Promise<CharacteristicValue> {
    const colorTemp = this.cached((sysInfo) => sysInfo.color_temp);
    return this.tpLinkAccessory.calculateColorTemp(colorTemp);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  async setHue(value: CharacteristicValue):Promise<void> {
    this.log.debug('Homekit Hue: ' + value);
    this.pendingColor.hue = Math.round(value as number);
    this.discardPendingChange('colorTemp');
    return this.setWhenOn('color', () => this.applyColor());
  }

  async getHue():Promise<CharacteristicValue> {
    // Tapo only reports hue once a colour has been set
    return this.cached((sysInfo) => sysInfo.hue ?? 0);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  async setSaturation(value: CharacteristicValue):Promise<void> {
    this.log.debug('Homekit Saturation: ' + value);
    this.pendingColor.saturation = Math.round(value as number);
    this.discardPendingChange('colorTemp');
    return this.setWhenOn('color', () => this.applyColor());
  }

  /**
   * Sends hue and saturation together. HomeKit sets them as two separate characteristics, so
   * whichever was not changed is taken from the last known device state.
   */
  private applyColor():Promise<boolean>{
    const sysInfo = this.tpLinkAccessory.getSysInfo();
    const hue = this.pendingColor.hue ?? sysInfo.hue;
    const saturation = this.pendingColor.saturation ?? sysInfo.saturation;
    this.pendingColor = {};
    return this.tpLinkAccessory.setColor(hue, saturation).then((result) => {
      if(result){
        this.platform.log.debug('Set Characteristic Hue/Saturation ->', hue, saturation);
        this.tpLinkAccessory.getSysInfo().hue = hue;
        this.tpLinkAccessory.getSysInfo().saturation = saturation;
      }
      return result;
    });
  }

  async getSaturation():Promise<CharacteristicValue> {
    // Tapo only reports saturation once a colour has been set
    return this.cached((sysInfo) => sysInfo.saturation ?? 0);
  }

  /**
   * Fetches the bulb's usage totals (every 10 minutes): refreshes the power estimate and
   * advances the lifetime Total Consumption.
   */
  private updateConsumption(){
    this.log.debug('updateConsumption called');
    this.tpLinkAccessory.getEnergyUsage().then((response) => {
      this.log.debug('Get Characteristic Power consumption ->', JSON.stringify(response));
      if (response && response.power_usage) {
        const totalKWh = this.energyTotal.update(response.power_usage.today);
        if (totalKWh !== undefined) {
          this.service.updateCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic, totalKWh);
        }
        this.recordPower();
      }
    }).catch((error) => {
      this.log.error('Failed to get energy usage: ' + error);
    });

    setTimeout(()=>{
      this.updateConsumption();
    }, 600000);
  }

  /**
   * Pushes the current power estimate to HomeKit and the Eve history. Called on every state
   * poll so switching the bulb on or off shows up within one poll, not only every 10 minutes;
   * fakegato averages these into one history point per 10 minutes.
   */
  private recordPower(){
    const watts = this.tpLinkAccessory.getPowerConsumption().current;
    this.service.updateCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic, watts);
    this.fakeGatoHistoryService.addEntry({
      time: Math.round(Date.now() / 1000),
      power: watts,
    });
  }

  async getCurrentConsumption():Promise<CharacteristicValue> {
    return this.tpLinkAccessory.getPowerConsumption().current;
  }

  async getTotalConsumption():Promise<CharacteristicValue> {
    return this.energyTotal.totalKWh ?? 0;
  }

  protected updateState(interval:number){
    this.log.debug('updateState called');
    this.tpLinkAccessory.getDeviceInfo(true).then((response) => {
      let failed = false;
      if(response){
        this.log.debug('Device Info: ' + JSON.stringify(response));
        const isOn = response.device_on;
        const saturation = response.saturation;
        const hue = response.hue;
        const color_temp = response.color_temp;
        const brightness = response.brightness;

        this.platform.log.debug('Get Device Info ->', JSON.stringify(response));
  
        if(isOn !== undefined){
          this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
        } else{
          this.setNoResponse();
          failed = true;
        }

        if(saturation){
          this.service.updateCharacteristic(this.platform.Characteristic.Saturation, saturation);
        }
        if(hue){
          this.service.updateCharacteristic(this.platform.Characteristic.Hue, hue);
        }
        if(color_temp){
          this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, 
            this.tpLinkAccessory.calculateColorTemp(color_temp));
        }
        if(brightness){
          this.service.updateCharacteristic(this.platform.Characteristic.Brightness, brightness);
        }
        if(!failed){
          this.recordPower();
        }
      } else{
        this.setNoResponse();
        failed = true;
      }

      this.scheduleNextUpdate(interval, failed);
    }).catch(()=>{
      this.setNoResponse();
      this.scheduleNextUpdate(interval, true);
    });
  }
}