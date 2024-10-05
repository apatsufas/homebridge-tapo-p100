import { PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Logger, 
  AdaptiveLightingController} from 'homebridge';
import TapoPlatform from './platform';
import L530 from './utils/l530';
import { TPLinkPlatformAccessory } from './platformTPLinkAccessory';

/**
 * L530 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class L530Accessory extends TPLinkPlatformAccessory<L530> {
  private adaptiveLightingController!: AdaptiveLightingController;
  private readonly fakeGatoHistoryService?;
  private lastMeasurement: number | null = null;

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

    this.initialise(platform, updateInterval);

    // get the Outlet service if it exists, otherwise create a new Outlet service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  protected init(platform: TapoPlatform, updateInterval?: number){
    this.tpLinkAccessory.getDeviceInfo().then((sysInfo) => {
      this.log.debug('SysInfo: ', sysInfo);

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
        .setCharacteristic(this.platform.Characteristic.Model, 'Tapo L530')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, sysInfo.hw_id);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Outlet

      // register handlers for the On/Off Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
        .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      // register handlers for the Brightness Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .on('set', this.setBrightness.bind(this))                // SET - bind to the `setBrightness` method below
        .on('get', this.getBrightness.bind(this));               // GET - bind to the `getBrightness` method below

      // register handlers for the ColorTemperature Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .on('set', this.setColorTemp.bind(this))                // SET - bind to the `setColorTemp` method below
        .on('get', this.getColorTemp.bind(this))
        .setProps({
          minValue: 140,
          maxValue: 400,
          minStep: 1,
        });              // GET - bind to the `getColorTemp` method below

      // register handlers for the Hue Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.Hue)
        .on('set', this.setHue.bind(this))                // SET - bind to the `setHue` method below
        .on('get', this.getHue.bind(this));               // GET - bind to the `getHue` method below

      // register handlers for the Saturation Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        .on('set', this.setSaturation.bind(this))                // SET - bind to the `setSaturation` method below
        .on('get', this.getSaturation.bind(this));               // GET - bind to the `getSaturation` method below

      this.service.getCharacteristic(this.platform.customCharacteristics.CurrentConsumptionCharacteristic)
        .on('get', this.getCurrentConsumption.bind(this));

      this.service.getCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic)
        .on('get', this.getTotalConsumption.bind(this));

      this.service.getCharacteristic(this.platform.customCharacteristics.ResetConsumptionCharacteristic)
        .on('set', this.resetConsumption.bind(this));
        
      // Setup the adaptive lighting controller if available
      if (this.platform.api.versionGreaterOrEqual && this.platform.api.versionGreaterOrEqual('1.3.0-beta.23')) {
        this.adaptiveLightingController = new platform.api.hap.AdaptiveLightingController(
          this.service,
        );
        this.accessory.configureController(this.adaptiveLightingController);
      }

      this.updateConsumption();

      const interval = updateInterval ? updateInterval*1000 : 30000;
      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(() => {
      if(!this.tpLinkAccessory.is_klap){
        this.setNoResponse();
        this.log.error('100 - Get Device Info failed');
      }
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.tpLinkAccessory.getSysInfo().device_on){
      this.tpLinkAccessory.setBrightness(value as number).then((result) => {
        if(result){
          this.platform.log.debug('Set Characteristic Brightness ->', value);
          this.tpLinkAccessory.getSysInfo().brightness = value as number;
  
          // you must call the callback function
          callback(null);
        } else{
          callback(new Error('unreachable'), false);
        }
      });
    } else{
      callback(null);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getBrightness(callback: CharacteristicGetCallback) {
    this.tpLinkAccessory.getDeviceInfo().then((response) => {
      if(response){
        const brightness = response.brightness;
        if(brightness !== undefined){
          this.platform.log.debug('Get Characteristic Brightness ->', brightness);
  
          // you must call the callback function
          // the first argument should be null if there were no errors
          // the second argument should be the value to return
          // you must call the callback function
          callback(null, brightness);
        }else{
          callback(new Error('unreachable'), 0);
        }
      } else{
        callback(new Error('unreachable'), 0);
      }
    }).catch(() => {
      callback(new Error('unreachable'), 0);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setColorTemp(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.log.debug('Color Temp Homekit :' + value);
    if(this.tpLinkAccessory.getSysInfo().device_on){
      this.tpLinkAccessory.setColorTemp(value as number).then((result) => {
        if(result){
          this.tpLinkAccessory.getSysInfo().color_temp = value as number;
          this.platform.log.debug('Set Characteristic Color Temperature ->', value);
    
          // you must call the callback function
          callback(null);
        } else{
          callback(new Error('unreachable'), false);
        }
      });
    } else{
      // you must call the callback function
      callback(null);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getColorTemp(callback: CharacteristicGetCallback) {
    this.tpLinkAccessory.getColorTemp().then((response) => {
      if(response !== undefined){
        const color_temp = response;

        this.platform.log.debug('Get Characteristic Color Temperature ->', color_temp);
  
        // you must call the callback function
        // the first argument should be null if there were no errors
        // the second argument should be the value to return
        // you must call the callback function
        callback(null, color_temp);
      }else{
        callback(new Error('unreachable'), 0);
      }
    }).catch(() => {
      callback(new Error('unreachable'), 0);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.tpLinkAccessory.getSysInfo().device_on){
      this.tpLinkAccessory.setColor(Math.round(value as number), this.tpLinkAccessory.getSysInfo().saturation).then((result) => {
        if(result){
          this.tpLinkAccessory.getSysInfo().hue = Math.round(value as number);
          this.platform.log.debug('Set Characteristic Hue ->', Math.round(value as number));
          this.platform.log.debug('With Characteristic Saturation ->', this.tpLinkAccessory.getSysInfo().saturation);
  
          // you must call the callback function
          callback(null);
        } else{
          callback(new Error('unreachable'), false);
        }
      });
    } else{
      callback(null);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getHue(callback: CharacteristicGetCallback) {
    this.tpLinkAccessory.getDeviceInfo().then((response) => {
      if(response){
        let hue = response.hue;
        this.platform.log.debug('Get Characteristic Hue ->', hue);
  
        //Tapo only returns the hue value when a color has been set. So we need to hanle the cases when an color is not set
        if(!hue){
          hue = 0;
        }
        // you must call the callback function
        // the first argument should be null if there were no errors
        // the second argument should be the value to return
        // you must call the callback function
        callback(null, hue);
      } else{
        callback(new Error('unreachable'), 0);
      }
    }).catch(() => {
      callback(new Error('unreachable'), 0);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.tpLinkAccessory.getSysInfo().device_on){
      this.tpLinkAccessory.setColor(this.tpLinkAccessory.getSysInfo().hue, Math.round(value as number)).then((result) => {
        if(result){
          this.tpLinkAccessory.getSysInfo().saturation = Math.round(value as number);
          this.platform.log.debug('Set Characteristic Saturation ->', Math.round(value as number));
          this.platform.log.debug('With Characteristic Hue ->', this.tpLinkAccessory.getSysInfo().hue);
  
          // you must call the callback function
          callback(null);
        } else{
          callback(new Error('unreachable'), false);
        }
      });
    } else{
      callback(null);
    }
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getSaturation(callback: CharacteristicGetCallback) {
    this.tpLinkAccessory.getDeviceInfo().then((response) => {
      if(response){
        let saturation = response.saturation;

        this.platform.log.debug('Get Characteristic Saturation ->', saturation);
        //Tapo only returns the saturation value when a color has been set. So we need to hanle the cases when an color is not set
        if(!saturation){
          saturation = 0;
        }
        // you must call the callback function
        // the first argument should be null if there were no errors
        // the second argument should be the value to return
        // you must call the callback function
        callback(null, saturation);
      } else{
        callback(new Error('unreachable'), 0);
      }
    }).catch(() => {
      callback(new Error('unreachable'), 0);
    });
  }

  private updateConsumption(){
    this.tpLinkAccessory.getEnergyUsage().then((response) => {
      if (response && response.power_usage) {
        if(this.lastMeasurement){
          this.platform.log.debug('Get Characteristic Power consumption ->', JSON.stringify(response));
          if (this.fakeGatoHistoryService ) {
            this.fakeGatoHistoryService.addEntry({
              time: new Date().getTime() / 1000,
              power: response.power_usage.today > 0 ? response.power_usage.today - this.lastMeasurement > 0 ? 
                response.power_usage.today - this.lastMeasurement : 0 : 0, 
            });
          }
        }
        this.lastMeasurement = response.power_usage.today;
      }
    });

    setTimeout(()=>{
      this.updateConsumption();
    }, 300000);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   *
   */
  getCurrentConsumption(callback: CharacteristicGetCallback) {
    const consumption = this.tpLinkAccessory.getPowerConsumption();

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    callback(null, consumption.current);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   *
   */
  getTotalConsumption(callback: CharacteristicGetCallback) {
    const consumption = this.tpLinkAccessory.getPowerConsumption();

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    callback(null, consumption.total);
  }

  /**
   * Handle the "SET" requests from HomeKit
   *
   */
  resetConsumption(value: CharacteristicValue, callback: CharacteristicGetCallback) {
    const now = Math.round(new Date().valueOf() / 1000);
    const epoch = Math.round(new Date('2001-01-01T00:00:00Z').valueOf() / 1000);

    this.service.updateCharacteristic(this.platform.customCharacteristics.ResetConsumptionCharacteristic, now - epoch);

    this.service.updateCharacteristic(this.platform.customCharacteristics.TotalConsumptionCharacteristic, 0);
    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    // you must call the callback function
    callback(null);
  }

  protected updateState(interval:number){
    this.tpLinkAccessory.getDeviceInfo().then((response) => {
      if(response){
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
          interval += 300000;
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
      }

      setTimeout(()=>{
        this.updateState(interval);
      }, interval);
    }).catch(()=>{
      this.setNoResponse();
      setTimeout(()=>{
        this.updateState(interval + 300000);
      }, interval);
    });

   
  }
}