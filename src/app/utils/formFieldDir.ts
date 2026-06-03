import { cn } from "../components/ui/utils";

/** `text`: RTL field (names, search, message). `latin`: email/tel/number — LTR typing, placeholder aligned to visual start (right in AR). */
export type FormFieldDirKind = "text" | "latin";

export function formFieldDirAttrs(
  isRTL: boolean,
  kind: FormFieldDirKind = "text",
): { dir?: "rtl" | "ltr"; className: string } {
  if (!isRTL) {
    return { className: "text-start" };
  }
  if (kind === "latin") {
    return {
      dir: "ltr",
      className: "text-end placeholder:text-end",
    };
  }
  return {
    dir: "rtl",
    className: "text-start",
  };
}

/** Merge Tailwind classes with direction/placeholder alignment for inputs, textareas, native selects. */
export function formFieldDirProps(
  isRTL: boolean,
  kind: FormFieldDirKind,
  className?: string,
): { dir?: "rtl" | "ltr"; className: string } {
  const a = formFieldDirAttrs(isRTL, kind);
  return { dir: a.dir, className: cn(a.className, className) };
}
