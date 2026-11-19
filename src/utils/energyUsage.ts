/** `get_energy_usage` result of a P110 (only the fields this plugin uses). */
export class EnergyUsage{
  /** Instantaneous power in mW. */
  current_power!: number;
  /** Energy used since local midnight, in Wh. */
  today_energy!: number;
}
