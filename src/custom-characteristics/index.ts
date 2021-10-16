import type {
    Characteristic as CharacteristicClass,
    WithUUID,
} from 'homebridge';

import DefaultCharacteristicImport from './default-characteristic';
import CurrentConsumptionCharacteristicImport from './currentConsumptionCharacteristic';
import TotalConsumptionCharacteristicImport from './totalConsumptionCharacteristic';

export default function characteristic(
    Characteristic: typeof CharacteristicClass
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