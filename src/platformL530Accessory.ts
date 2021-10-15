import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Logger, 
  AdaptiveLightingController } from 'homebridge';
import TapoPlatform from './platform';
import L530 from './utils/l530';

/**
 * L530 Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class L530Accessory {
  private service: Service;
  private adaptiveLightingController!: AdaptiveLightingController;
  private l530: L530;
  private fakeGatoHistoryService?;
  private lastMeasurement: number | null = null;

  constructor(
    public readonly log: Logger,
    private readonly platform: TapoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.log.debug('Start adding accessory: ' + accessory.context.device.host);
    this.l530 = new L530(this.log, accessory.context.device.host, platform.config.username, platform.config.password);

    this.fakeGatoHistoryService = new this.platform.FakeGatoHistoryService('energy', accessory, {
      log: this.log,
      size:4096, 
      storage:'fs',     
    });

    this.l530.handshake().then(() => {
      this.l530.login().then(() => {
        this.l530.getDeviceInfo().then((sysInfo) => {
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
              minValue: 154,
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

          // Setup the adaptive lighting controller if available
          if (
            this.platform.api.versionGreaterOrEqual &&
          this.platform.api.versionGreaterOrEqual('1.3.0-beta.23')
          ) {
            this.adaptiveLightingController = new platform.api.hap.AdaptiveLightingController(
              this.service,
            );
            this.accessory.configureController(this.adaptiveLightingController);
          }

          this.updateConsumption();
        }).catch(() => {
          this.log.error('Get Device Info failed');
        });
      }).catch(() => {
        this.log.error('Login failed');
      });
    }).catch(() => {
      this.log.error('Handshake failed');
    });
    
    // get the Outlet service if it exists, otherwise create a new Outlet service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.l530.setPowerState(value as boolean).then(() => {
      this.platform.log.debug('Set Characteristic On ->', value);
      this.l530.getSysInfo().device_on = value as boolean;

      // you must call the callback function
      callback(null);
    });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory.
   * 
   */
  getOn(callback: CharacteristicGetCallback) {
    // implement your own code to check if the device is on
    this.l530.getDeviceInfo().then((response) => {
      const isOn = response.device_on;

      this.platform.log.debug('Get Characteristic On ->', isOn);

      // you must call the callback function
      // the first argument should be null if there were no errors
      // the second argument should be the value to return
      // you must call the callback function
      callback(null, isOn);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.l530.getSysInfo().device_on){
      this.l530.setBrightness(value as number).then(() => {
        this.platform.log.debug('Set Characteristic Brightness ->', value);
        this.l530.getSysInfo().brightness = value as number;

        // you must call the callback function
        callback(null);
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
    this.l530.getDeviceInfo().then((response) => {
      const brightness = response.brightness;

      this.platform.log.debug('Get Characteristic Brightness ->', brightness);

      // you must call the callback function
      // the first argument should be null if there were no errors
      // the second argument should be the value to return
      // you must call the callback function
      callback(null, brightness);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setColorTemp(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.log.debug('Color Temp Homekit :' + value);
    if(this.l530.getSysInfo().device_on){
      this.l530.setColorTemp(value as number).then(() => {
        this.l530.getSysInfo().color_temp = value as number;
        this.platform.log.debug('Set Characteristic Color Temperature ->', value);
  
        // you must call the callback function
        callback(null);
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
    this.l530.getColorTemp().then((response) => {
      const color_temp = response;

      this.platform.log.debug('Get Characteristic Color Temperature ->', color_temp);

      // you must call the callback function
      // the first argument should be null if there were no errors
      // the second argument should be the value to return
      // you must call the callback function
      callback(null, color_temp);
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.l530.getSysInfo().device_on){
      this.l530.setColor(value as number, this.l530.getSysInfo().saturation).then(() => {
        this.l530.getSysInfo().hue = value as number;
        this.platform.log.debug('Set Characteristic Hue ->', value);
        this.platform.log.debug('With Characteristic Saturation ->', this.l530.getSysInfo().saturation);

        // you must call the callback function
        callback(null);
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
    this.l530.getDeviceInfo().then((response) => {
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
    });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory.
   */
  setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if(this.l530.getSysInfo().device_on){
      this.l530.setColor(this.l530.getSysInfo().hue, value as number).then(() => {
        this.l530.getSysInfo().saturation = value as number;
        this.platform.log.debug('Set Characteristic Saturation ->', value);
        this.platform.log.debug('With Characteristic Hue ->', this.l530.getSysInfo().hue);

        // you must call the callback function
        callback(null);
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
    this.l530.getDeviceInfo().then((response) => {
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
    });
  }

  async updateConsumption(){
    this.l530.getEnergyUsage().then((response) => {
      if(this.lastMeasurement === null){
        const now = new Date();
        if(response.time_usage.today > 0){
          let time = response.time_usage.today;
          const power = response.power_usage.today / time;
          while(time > 0){
            now.setHours(now.getHours()-1, 0, 0, 0);
            this.fakeGatoHistoryService.addEntry({
              time: now.getTime() / 1000,
              power: power,
            });
            time--;
          }
        }
        this.lastMeasurement = response.power_usage.today;
      } else{
        this.platform.log.debug('Get Characteristic Power consumption ->', JSON.stringify(response));
        if (this.fakeGatoHistoryService && response && response.power_usage) {
          this.fakeGatoHistoryService.addEntry({
            time: new Date().getTime() / 1000,
            power: response.power_usage.today - this.lastMeasurement, //this.power
          });
        }
      }
    });

    setTimeout(()=>{
      this.updateConsumption();
    }, 300000);
  }
}