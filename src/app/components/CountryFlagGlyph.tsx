import type { JSX, SVGAttributes } from "react";
import {
  AE,
  AU,
  BD,
  BE,
  BH,
  CA,
  CH,
  DE,
  DK,
  DZ,
  EG,
  ES,
  FI,
  FR,
  GB,
  ID,
  IN,
  IQ,
  IT,
  JO,
  KE,
  KW,
  LB,
  LY,
  MA,
  MY,
  NG,
  NL,
  NO,
  NZ,
  OM,
  PH,
  PK,
  PL,
  PS,
  QA,
  SA,
  SD,
  SE,
  SG,
  SY,
  TN,
  TR,
  US,
  YE,
  ZA,
} from "country-flag-icons/react/3x2";
import { cn } from "./ui/utils";

type SvgFlagProps = SVGAttributes<SVGElement>;
type FlagComponent = (props: SvgFlagProps) => JSX.Element;

const FLAG_MAP: Record<string, FlagComponent> = {
  AE,
  AU,
  BD,
  BE,
  BH,
  CA,
  CH,
  DE,
  DK,
  DZ,
  EG,
  ES,
  FI,
  FR,
  GB,
  ID,
  IN,
  IQ,
  IT,
  JO,
  KE,
  KW,
  LB,
  LY,
  MA,
  MY,
  NG,
  NL,
  NO,
  NZ,
  OM,
  PH,
  PK,
  PL,
  PS,
  QA,
  SA,
  SD,
  SE,
  SG,
  SY,
  TN,
  TR,
  US,
  YE,
  ZA,
};

type CountryFlagGlyphProps = {
  iso2: string;
  className?: string;
};

/** SVG flags — regional-indicator emoji often renders as "JO" on Windows without color fonts. */
export function CountryFlagGlyph({ iso2, className }: CountryFlagGlyphProps) {
  const key = iso2.toUpperCase();
  const Flag = FLAG_MAP[key];
  if (!Flag) {
    return (
      <span
        className={cn(
          "inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-sm border border-border bg-muted text-[9px] font-semibold uppercase tracking-tight text-muted-foreground",
          className,
        )}
        aria-hidden
      >
        {key.slice(0, 2)}
      </span>
    );
  }
  return (
    <Flag
      aria-hidden
      className={cn(
        "h-4 w-6 shrink-0 overflow-hidden rounded-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
        className,
      )}
    />
  );
}
