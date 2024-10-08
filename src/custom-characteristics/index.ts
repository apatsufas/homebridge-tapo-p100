import type {
  Characteristic as CharacteristicClass,
  WithUUID,
} from 'homebridge';

import DefaultCharacteristicImport from './default-characteristic.js';
import CurrentConsumptionCharacteristicImport from './currentConsumptionCharacteristic.js';
import TotalConsumptionCharacteristicImport from './totalConsumptionCharacteristic.js';

export default function characteristic(
  Characteristic: typeof CharacteristicClass,
): Record<
    | 'CurrentConsumptionCharacteristic'
    | 'TotalConsumptionCharacteristic',
    WithUUID<new () => CharacteristicClass>
    > {
  const DefaultCharacteristic = DefaultCharacteristicImport(Characteristic);

  return {
    CurrentConsumptionCharacteristic: CurrentConsumptionCharacteristicImport(DefaultCharacteristic),
    TotalConsumptionCharacteristic: TotalConsumptionCharacteristicImport(DefaultCharacteristic),
  };
}