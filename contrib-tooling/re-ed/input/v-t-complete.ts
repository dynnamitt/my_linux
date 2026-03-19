/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Suggested flat interface for VehicleType
 * Resolved from 5 types in the inheritance chain
 */

// x-scaffold-ref
type SimpleRef = string;

interface My_VehicleType {
  // ── type ──
  // .. TransportType_VersionStructure ..
  name?: TextType[];
  shortName?: TextType[];
  description?: TextType[];
  privateCode?: PrivateCodeStructure;
  transportMode?: AllPublicTransportModesEnumeration;
  deckPlanRef?: SimpleRef; // VersionOfObjectRefStructure;
  euroClass?: string;
  reversingDirection?: boolean;
  selfPropelled?: boolean;
  propulsionTypes?: PropulsionTypeEnumeration[];
  propulsionType?: PropulsionTypeEnumeration;
  fuelTypes?: FuelTypeEnumeration[];
  maximumRange?: number;
  maximumVelocity?: number;
  fuelType?: FuelTypeEnumeration;
  typeOfFuel?: FuelTypeEnumeration;
  passengerCapacity?: PassengerCapacityStructure; // NOTE: also RelStruct below

  // ── core ──
  // .. EntityStructure ..
  //nameOfClass?: NameOfClass;
  id?: string;

  // .. VehicleType_VersionStructure ──
  includedIn?: SimpleRef; // VersionOfObjectRefStructure;
  classifiedAsRef?: SimpleRef; //VersionOfObjectRefStructure;
  facilities?: SimpleRef; // serviceFacilitySets_RelStructure; NOTE: Either<Ref,Complex> picked Ref for now..
  //capacities?: passengerCapacities_RelStructure; // NOTE: pri is simpler version in TransportType
  monitored?: boolean;
  lowFloor?: boolean;
  hasLiftOrRamp?: boolean;
  hasHoist?: boolean;
  hoistOperatingRadius?: number;
  boardingHeight?: number;
  gapToPlatform?: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  firstAxleHeight?: number;
  canCarry?: SimpleRef; // passengerCarryingRequirements_RelStructure; NOTE: Either<Ref,Complex>
  canManoeuvre?: VehicleManoeuvringRequirements_STUB; // fast-track, NOTE: also Either<Ref,Complex>
  satisfiesFacilityRequirements?: SimpleRef; // facilityRequirements_RelStructure; NOTE: Either<Ref,Complex>

  // .. EntityInVersionStructure ..
  /*
  alternativeTexts?: alternativeTexts_RelStructure;
  validityConditions?: validityConditions_RelStructure;
  validBetween?: ValidBetween_VersionStructure[];
  dataSourceRef?: string;
  created?: string; // date-time 
  changed?: string; // date-time 
  modification?: ModificationEnumeration;
  version?: string;
  status?: StatusEnumeration;
  derivedFromVersionRef?: string;
  compatibleWithVersionFrameVersionRef?: string;
  derivedFromObjectRef?: string;
  */

  // ── extra ──
  // .. DataManagedObjectStructure ..
  keyList?: KeyValueStructure[];
  privateCodes?: PrivateCodeStructure[];
  //extensions?: any;
  brandingRef?: SimpleRef; // VersionOfObjectRefStructure;
  responsibilitySetRef?: SimpleRef;
}

interface KeyValueStructure {
  key?: string;
  value?: string;
  typeOfKey?: string;
}

interface PrivateCodeStructure {
  value?: string;
  type?: string;
}

interface TextType {
  value?: string;
  lang?: string;
  textIdType?: string;
}
type AllPublicTransportModesEnumeration =
  | "all"
  | "unknown"
  | "bus"
  | "trolleyBus"
  | "tram"
  | "coach"
  | "rail"
  | "intercityRail"
  | "urbanRail"
  | "metro"
  | "air"
  | "water"
  | "cableway"
  | "funicular"
  | "snowAndIce"
  | "taxi"
  | "ferry"
  | "lift"
  | "selfDrive"
  | "anyMode"
  | "other";

type PropulsionTypeEnumeration =
  | "combustion"
  | "electric"
  | "electricAssist"
  | "hybrid"
  | "human"
  | "other"
  | "combustion"
  | "electric"
  | "electricAssist"
  | "hybrid"
  | "human"
  | "other";

type FuelTypeEnumeration =
  | "battery"
  | "biodiesel"
  | "diesel"
  | "dieselBatteryHybrid"
  | "electricContact"
  | "electricity"
  | "ethanol"
  | "hydrogen"
  | "liquidGas"
  | "tpg"
  | "methane"
  | "naturalGas"
  | "petrol"
  | "petrolBatteryHybrid"
  | "petrolLeaded"
  | "petrolUnleaded"
  | "none"
  | "other";

interface PassengerCapacityStructure {
  fareClass?:
    | "unknown"
    | "firstClass"
    | "secondClass"
    | "thirdClass"
    | "preferente"
    | "premiumClass"
    | "businessClass"
    | "standardClass"
    | "turista"
    | "economyClass"
    | "any";
  totalCapacity?: number;
  seatingCapacity?: number;
  standingCapacity?: number;
  specialPlaceCapacity?: number;
  pushchairCapacity?: number;
  wheelchairPlaceCapacity?: number;
  pramPlaceCapacity?: number;
  bicycleRackCapacity?: number;
}

interface VehicleManoeuvringRequirements_STUB {
  reversible?: boolean;
  minimumTurningCircle?: number;
  minimumOvertakingWidth?: number;
  minimumLength?: number;
}
