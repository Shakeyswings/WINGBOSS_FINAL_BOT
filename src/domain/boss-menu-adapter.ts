import {
  getCurrentMenuGroupOptions,
  getCurrentMenuIndex,
  getCurrentMenuItemEntry,
  getCurrentMenuItemsByCategoryCode,
  type CurrentMenuOptionEntry
} from "../menu/current-menu.ts";

export type BossFlavorOption = {
  id: string;
  label: string;
  price_minor: number;
};

export type BossFinisherOption = {
  id: string;
  label: string;
  price_minor: number;
  kind: "dry_rub" | "drizzle";
};

export type BossHeatChargeRecord = {
  heatLevel: string;
  heatChargeMinor: number;
  heatChargeRecordId: string;
  applicationStage: "HEAT_APPLICATION";
  applicationMethod: string;
  quantityScalingRule: "order_level_fixed";
  label: string;
};

function toFlavorOption(option: CurrentMenuOptionEntry): BossFlavorOption {
  return {
    id: option.id,
    label: option.label,
    price_minor: option.price_minor ?? 0
  };
}

function toFinisherOption(option: CurrentMenuOptionEntry, kind: BossFinisherOption["kind"]): BossFinisherOption {
  return {
    id: option.id,
    label: option.label,
    price_minor: option.price_minor ?? 0,
    kind
  };
}

export function getBossPrimaryFlavorOptions(): BossFlavorOption[] {
  return getCurrentMenuGroupOptions("modifier_group_primary_flavor").map(toFlavorOption);
}

export function getBossFinishFlavorOptions(): BossFlavorOption[] {
  return getBossPrimaryFlavorOptions();
}

export function getBossDryRubFinisherOptions(): BossFinisherOption[] {
  return getCurrentMenuGroupOptions("modifier_group_additional_dry_rub").map((option) => toFinisherOption(option, "dry_rub"));
}

export function getBossDrizzleFinisherOptions(): BossFinisherOption[] {
  return getCurrentMenuGroupOptions("modifier_group_additional_drizzle").map((option) => toFinisherOption(option, "drizzle"));
}

export function getBossFinisherOptions(): BossFinisherOption[] {
  return [...getBossDryRubFinisherOptions(), ...getBossDrizzleFinisherOptions()];
}

export function getBossD4PoolOptions(): BossFinisherOption[] {
  return getBossFinisherOptions();
}

export function getBossHeatChargeRecords(): BossHeatChargeRecord[] {
  return getCurrentMenuGroupOptions("modifier_group_spice_level").map((option) => {
    const heatLevel = option.id.replace(/^x_spice_/, "");
    return {
      heatLevel,
      heatChargeMinor: option.price_minor ?? 0,
      heatChargeRecordId: option.id,
      applicationStage: "HEAT_APPLICATION",
      applicationMethod: "current-menu-spice-level",
      quantityScalingRule: "order_level_fixed",
      label: getCurrentMenuItemEntry(option.id)?.label ?? option.label
    };
  });
}

export function resolveBossMenuLabel(id: string): string {
  return getCurrentMenuItemEntry(id)?.label ?? getCurrentMenuIndex().optionsById.get(id)?.label ?? id;
}

export function getBossPrimaryFlavorChargeMinor(id: string): number | null {
  return getCurrentMenuGroupOptions("modifier_group_primary_flavor").find((option) => option.id === id)?.price_minor ?? null;
}

export function getBossPaidDryRubChargeMinor(id: string): number | null {
  return getCurrentMenuGroupOptions("modifier_group_additional_dry_rub").find((option) => option.id === id)?.price_minor ?? null;
}

export function getBossPaidDrizzleChargeMinor(id: string): number | null {
  return getCurrentMenuGroupOptions("modifier_group_additional_drizzle").find((option) => option.id === id)?.price_minor ?? null;
}

export function getBossHeatChargeMinor(heatLevel: string): number | null {
  return getBossHeatChargeRecords().find((record) => record.heatLevel === heatLevel)?.heatChargeMinor ?? null;
}

export function getBossD4ChargeMinor(): number | null {
  return getCurrentMenuGroupOptions("modifier_group_triple_drizz")[0]?.price_minor ?? null;
}

export function getBossD4PoolKind(id: string): BossFinisherOption["kind"] | null {
  return getBossDryRubFinisherOptions().some((option) => option.id === id)
    ? "dry_rub"
    : getBossDrizzleFinisherOptions().some((option) => option.id === id)
      ? "drizzle"
      : null;
}

export function getBossKnownFlavorIds(): string[] {
  return getBossPrimaryFlavorOptions().map((option) => option.id);
}

export function getBossKnownFinisherIds(): string[] {
  return getBossFinisherOptions().map((option) => option.id);
}

export function getBossKnownHeatLevels(): string[] {
  return getBossHeatChargeRecords().map((record) => record.heatLevel);
}

export function getBossKnownHeatChargeMap(): Record<string, number> {
  return Object.fromEntries(getBossHeatChargeRecords().map((record) => [record.heatLevel, record.heatChargeMinor]));
}

export function getBossD4PoolIdSet(): Set<string> {
  return new Set(getBossD4PoolOptions().map((option) => option.id));
}
