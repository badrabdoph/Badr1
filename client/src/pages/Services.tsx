import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Check,
  Sparkles,
  Camera,
  Heart,
  Receipt,
  PlusCircle,
  ArrowLeft,
  Phone,
  Gift,
  ArrowDown,
  Gem,
} from "lucide-react";
import {
  pageTexts,
  ctaTexts,
  customPrintGroups,
} from "@/config/siteConfig";
import { useContactData, usePackagesData, useContentData } from "@/hooks/useSiteData";
import { EditableText } from "@/components/InlineEdit";

type Pkg = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  featured?: boolean;
  badge?: string;
  priceNote?: string;
};
type AddonPkg = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  emoji?: string;
  priceNote?: string;
};

function CoupleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8.5" r="2.2" />
      <path d="M4 20c.5-3 2.2-4.8 4-4.8s3.5 1.8 4 4.8" />
      <path d="M12.5 20c.4-2.2 1.8-3.8 3.5-3.8 1.6 0 3 1.6 3.4 3.8" />
      <path d="M4.8 6.2l3.2-3.2 3.2 3.2" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.46 0 .1 5.36.1 11.96c0 2.1.56 4.15 1.62 5.96L0 24l6.2-1.62a11.95 11.95 0 0 0 5.86 1.5h.01c6.6 0 11.96-5.36 11.96-11.96 0-3.2-1.25-6.2-3.51-8.44ZM12.07 21.9h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.68.96.98-3.58-.24-.37a9.9 9.9 0 0 1-1.56-5.36C2.16 6.5 6.6 2.06 12.06 2.06c2.64 0 5.12 1.03 6.98 2.89a9.8 9.8 0 0 1 2.9 6.98c0 5.46-4.44 9.97-9.87 9.97Zm5.77-7.48c-.31-.16-1.82-.9-2.1-1-.28-.1-.48-.16-.68.16-.2.31-.78 1-.96 1.2-.18.2-.35.24-.66.08-.31-.16-1.3-.48-2.47-1.54-.92-.82-1.54-1.84-1.72-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.35.47-.52.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.68-1.65-.93-2.27-.24-.58-.49-.5-.68-.5h-.58c-.2 0-.52.08-.8.39-.28.31-1.06 1.03-1.06 2.5 0 1.47 1.08 2.9 1.23 3.1.16.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.82-.74 2.08-1.45.26-.7.26-1.3.18-1.45-.08-.14-.28-.23-.58-.39Z"
        fill="currentColor"
      />
    </svg>
  );
}

function buildWhatsAppHref(text: string, whatsappNumber: string | undefined) {
  const phone = (whatsappNumber ?? "").replace(/[^\d]/g, "");
  if (!phone) return "";
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

function buildContactHref({
  packageId,
  printIds,
}: {
  packageId?: string;
  printIds?: string[];
}) {
  const params = new URLSearchParams();
  if (packageId) params.set("package", packageId);
  if (printIds?.length) params.set("prints", printIds.join(","));
  const query = params.toString();
  return query ? `/contact?${query}` : "/contact";
}

function parsePriceValue(raw?: string) {
  if (!raw) return null;
  let v = raw;
  v = v.replace(/٬/g, "").replace(/٫/g, ".");
  const cleaned = v.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/,/g, "");
  } else if (!hasDot && hasComma) {
    if (/\d+,\d{3}/.test(normalized)) {
      normalized = normalized.replace(/,/g, "");
    } else {
      normalized = normalized.replace(/,/g, ".");
    }
  }
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function formatPriceNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

const customPrintItems = customPrintGroups.flatMap((group) => group.items);
const customPrintIdSet = new Set(customPrintItems.map((item) => item.id));
const PRINTS_STORAGE_KEY = "prefill_print_ids";

function readStoredPrintIds() {
  try {
    const raw = sessionStorage.getItem(PRINTS_STORAGE_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((id) => typeof id === "string" && customPrintIdSet.has(id));
  } catch {
    return [] as string[];
  }
}

function persistPrintIds(ids: string[]) {
  try {
    if (!ids.length) {
      sessionStorage.removeItem(PRINTS_STORAGE_KEY);
    } else {
      sessionStorage.setItem(PRINTS_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore storage errors
  }
}


function getNavOffsetPx() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--nav-offset").trim();
  const n = parseInt(v.replace("px", ""), 10);
  return Number.isFinite(n) ? n : 96;
}

function getSectionScrollMarginPx() {
  return getNavOffsetPx() + 78;
}

function SectionHeader({
  title,
  subtitle,
  icon,
  subtitleClassName,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  subtitleClassName?: string;
}) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
      <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 bg-black/20 backdrop-blur-md mt-3 mb-0">
        {icon}
        <span className={["text-xs md:text-sm text-foreground/80", subtitleClassName ?? ""].join(" ")}>
          {subtitle ?? "تفاصيل واضحة • جودة ثابتة • ستايل فاخر"}
        </span>
      </div>
      <div className="mt-3 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}

function PrimaryCTA({ whatsappNumber, label }: { whatsappNumber: string | undefined; label: React.ReactNode }) {
  void whatsappNumber;
  return (
    <Link href="/contact">
      <Button
        size="lg"
        variant="outline"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none w-full sm:w-auto cta-glow cta-size"
      >
        {label}
      </Button>
    </Link>
  );
}

function PackageCard({
  pkg,
  kind,
  whatsappNumber,
  contentMap,
  preselectedPrintIds,
  onPreselectedPrintIdsChange,
}: {
  pkg: Pkg;
  kind: "session" | "prints" | "wedding" | "addon";
  whatsappNumber: string | undefined;
  contentMap: Record<string, string>;
  preselectedPrintIds?: string[];
  onPreselectedPrintIdsChange?: (ids: string[]) => void;
}) {
  if (!pkg) return null;
  const isVipPlus = (p: any) => p?.id === "full-day-vip-plus" || p?.featured === true;
  const isWedding = kind === "wedding";
  const isAddon = kind === "addon";
  const vip = isWedding && isVipPlus(pkg);
  const isCustom = pkg.id === "special-montage-design";
  const isSessionCard = kind === "session" && !isCustom;
  const weddingTone = isWedding;
  const popular = !!pkg.popular;
  const isPro = pkg.id === "session-2";
  const featureList = pkg.features ?? [];
  const isCollapsible = (isWedding && featureList.length > 6) || (isAddon && featureList.length > 2);
  const baseKey = `package_${pkg.id}`;
  const getValue = (key: string, fallback = "") => (contentMap[key] as string | undefined) ?? fallback;
  const customDescription = getValue(`${baseKey}_description`, pkg.description ?? "").trim();
  const [localCustomIds, setLocalCustomIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(!isCollapsible);
  const sharedPrintIds = useMemo(
    () => (preselectedPrintIds ?? []).filter((id) => customPrintIdSet.has(id)),
    [preselectedPrintIds]
  );
  const selectedCustomIds = isCustom ? sharedPrintIds : [];
  const setSelectedCustomIds = (next: string[]) => {
    if (!isCustom) return;
    const safeNext = next.filter((id) => customPrintIdSet.has(id));
    if (onPreselectedPrintIdsChange) {
      onPreselectedPrintIdsChange(safeNext);
    } else {
      setLocalCustomIds(safeNext);
    }
    persistPrintIds(safeNext);
  };
  const effectiveCustomIds = isCustom ? (preselectedPrintIds ? selectedCustomIds : localCustomIds) : [];
  const customTotal = useMemo(() => {
    return effectiveCustomIds.reduce((sum, id) => {
      const item = customPrintItems.find((entry) => entry.id === id);
      const price = parsePriceValue(item?.price);
      return price ? sum + price : sum;
    }, 0);
  }, [effectiveCustomIds]);
  const proNoteText = isPro
    ? getValue("services_pro_note_text", "MEDIA COVERAGE REELS & TIKTOK").trim()
    : "";
  const contactHref = isCustom
    ? buildContactHref({ printIds: effectiveCustomIds })
    : buildContactHref({ packageId: pkg.id, printIds: sharedPrintIds });

  const featureItems = featureList.map((feature, index) => {
    const fieldKey = `${baseKey}_feature_${index + 1}`;
    const value = contentMap[fieldKey] ?? feature;
    return { index, feature, fieldKey, value, isSynthetic: false };
  });

  const orderedFeatures = (() => {
    if (!isPro) return featureItems;
    const items = [...featureItems];
    const isMediaLine = (text: string) =>
      /media/i.test(text) || text.includes("ريلز") || text.includes("تيك");

    const moveItem = (predicate: (text: string) => boolean, toIndex: number) => {
      const fromIndex = items.findIndex((item) => predicate(item.value));
      if (fromIndex === -1) return;
      const [item] = items.splice(fromIndex, 1);
      items.splice(Math.min(toIndex, items.length), 0, item);
    };

    moveItem((text) => text.includes("عدد غير محدود"), 0);

    const mediaIndex = items.findIndex((item) => isMediaLine(item.value));
    if (mediaIndex !== -1) {
      moveItem((text) => isMediaLine(text), 1);
    } else if (proNoteText) {
      items.splice(Math.min(1, items.length), 0, {
        index: -1,
        feature: proNoteText,
        fieldKey: "services_pro_note_text",
        value: proNoteText,
        isSynthetic: true,
      });
    }

    return items;
  })();

  const Icon =
    isCustom ? (
      <Receipt className="w-9 h-9 text-primary" />
    ) : kind === "wedding" || kind === "prints" ? (
      <CoupleIcon className="w-9 h-9 text-primary" />
    ) : kind === "addon" ? (
      <PlusCircle className="w-9 h-9 text-primary" />
    ) : (
      <Camera className="w-9 h-9 text-primary" />
    );

  const waInquiryText = getValue("services_whatsapp_inquiry_text", "حابب استفسر ❤️");
  const waInquiryHref = buildWhatsAppHref(waInquiryText, whatsappNumber);
  const handleCardClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!isCollapsible || isExpanded) return;
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded(true);
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isCollapsible || isExpanded) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsExpanded(true);
    }
  };

  return (
    <div
      role={isCollapsible ? "button" : undefined}
      tabIndex={isCollapsible ? 0 : undefined}
      aria-expanded={isCollapsible ? isExpanded : undefined}
      onClickCapture={handleCardClickCapture}
      onKeyDown={handleCardKeyDown}
      className={[
        "relative overflow-hidden bg-card border transition-all duration-300 group premium-border services-card",
        isSessionCard ? "p-6 md:p-7" : "p-7 md:p-8",
        isCustom ? "custom-package md:col-span-2" : "",
        isCollapsible && !isExpanded ? "full-day-collapsed" : "",
        weddingTone
          ? "border-primary/45 shadow-[0_0_70px_rgba(255,200,80,0.12)] hover:shadow-[0_0_95px_rgba(255,200,80,0.18)] hover:-translate-y-2"
          : popular || isPro
          ? "border-primary/30 shadow-lg shadow-primary/15 hover:-translate-y-2"
          : "border-white/10 hover:border-primary/35 hover:-translate-y-2 hover:shadow-[0_25px_80px_rgba(0,0,0,0.55)]",
      ].join(" ")}
    >
      {isSessionCard ? (
        <div className="price-corner">
          <EditableText
            value={contentMap[`${baseKey}_price`]}
            fallback={pkg.price}
            fieldKey={`${baseKey}_price`}
            category="services"
            label={`سعر الباقة ${pkg.name}`}
          />
          {(contentMap[`${baseKey}_price_note`] ?? pkg.priceNote) ? (
            <span className="price-corner-note">
              <EditableText
                value={contentMap[`${baseKey}_price_note`]}
                fallback={pkg.priceNote ?? ""}
                fieldKey={`${baseKey}_price_note`}
                category="services"
                label={`ملاحظة السعر ${pkg.name}`}
                multiline
              />
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={[
          "absolute inset-0 pointer-events-none transition-opacity duration-300",
          weddingTone || popular || isPro ? "opacity-40" : "opacity-0 group-hover:opacity-100",
          "bg-[radial-gradient(circle_at_30%_20%,rgba(255,200,80,0.14),transparent_60%)]",
        ].join(" ")}
      />

      <div className={["relative z-10", isCustom ? "custom-body" : ""].join(" ")}>
        <div
          className={[
            isSessionCard ? "flex flex-col gap-3 mb-4" : "flex flex-col gap-4 mb-6",
            isCustom
              ? "items-start text-right sm:flex-row sm:items-start sm:justify-between"
              : "sm:flex-row sm:items-start sm:justify-between",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border border-white/10 bg-black/15 backdrop-blur-md flex items-center justify-center">
              {Icon}
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-2">
                <div className="flex flex-col items-start gap-2">
                  <h3
                    className={[
                      "text-xl md:text-2xl font-bold leading-tight",
                      vip ? "text-primary" : "",
                      isCustom ? "custom-title" : "",
                    ].join(" ")}
                  >
                    <EditableText
                      value={contentMap[`${baseKey}_name`]}
                      fallback={isCustom ? "خصص باقتك علي زوقك" : pkg.name}
                      fieldKey={`${baseKey}_name`}
                      category="services"
                      label={`اسم الباقة ${pkg.name}`}
                    />
                  </h3>
                  {isCustom ? (
                    <div className="custom-line custom-line--compact">
                      <EditableText
                        value={contentMap[`${baseKey}_price`]}
                        fallback={pkg.price}
                        fieldKey={`${baseKey}_price`}
                        category="services"
                        label={`سعر الباقة ${pkg.name}`}
                        className="custom-note-text"
                      />
                    </div>
                  ) : null}
                  {isCustom && customDescription ? (
                    <div className="custom-line custom-line--compact">
                      <EditableText
                        value={contentMap[`${baseKey}_description`]}
                        fallback={isCustom ? "خصص باقتك علي زوقك" : customDescription}
                        fieldKey={`${baseKey}_description`}
                        category="services"
                        label={`وصف الباقة ${pkg.name}`}
                        multiline
                        className="custom-description"
                      />
                    </div>
                  ) : null}
                </div>
                {vip && (
                  <span className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] md:text-xs font-semibold tracking-wide rounded-full border border-amber-300/50 text-amber-100/90 bg-[linear-gradient(135deg,rgba(255,215,140,0.22),rgba(255,180,60,0.12))] shadow-[0_10px_28px_rgba(255,200,80,0.18)] backdrop-blur-sm relative md:-translate-y-[1px]">
                    <EditableText
                      value={contentMap[`${baseKey}_vip_label`]}
                      fallback="VIP PLUS"
                      fieldKey={`${baseKey}_vip_label`}
                      category="services"
                      label={`شارة VIP - ${pkg.name}`}
                    />
                  </span>
                )}
                {(contentMap[`${baseKey}_badge`] ?? pkg.badge) && !vip ? (
                  <span className="pro-badge">
                    <EditableText
                      value={contentMap[`${baseKey}_badge`]}
                      fallback={pkg.badge ?? ""}
                      fieldKey={`${baseKey}_badge`}
                      category="services"
                      label={`شارة الباقة ${pkg.name}`}
                    />
                  </span>
                ) : null}
                {popular && !vip && !(contentMap[`${baseKey}_badge`] ?? pkg.badge) ? (
                  <span className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] md:text-xs font-semibold rounded-full border border-white/15 text-foreground/90 bg-white/5 shadow-[0_10px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm relative md:-translate-y-[1px]">
                    <EditableText
                      value={contentMap[`${baseKey}_popular_label`]}
                      fallback="الأكثر طلباً"
                      fieldKey={`${baseKey}_popular_label`}
                      category="services"
                      label={`شارة الأكثر طلباً - ${pkg.name}`}
                    />
                  </span>
                ) : null}
              </div>
              {!isCustom ? (
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  <EditableText
                    value={contentMap[`${baseKey}_description`]}
                    fallback={pkg.description}
                    fieldKey={`${baseKey}_description`}
                    category="services"
                    label={`وصف الباقة ${pkg.name}`}
                    multiline
                  />
                </p>
              ) : null}
          </div>
          </div>
        </div>

        <div
          className={[
            "full-day-body",
            isCollapsible ? "full-day-body--collapsible" : "",
            isCollapsible && !isExpanded ? "full-day-body--collapsed" : "",
            isAddon ? "addon-body" : "",
          ].join(" ")}
        >
          <div className="text-right sm:text-left">
            {isCustom ? (
              <div className="custom-line custom-line--compact">
                <EditableText
                  value={contentMap.services_custom_prints_note}
                  fallback="المطبوعات ليست اجباري يمكن الاستغناء عنها والحجز بدونها"
                  fieldKey="services_custom_prints_note"
                  category="services"
                  label="تنبيه المطبوعات - خصص باقتك"
                  multiline
                  className="custom-note-text"
                />
              </div>
            ) : !isSessionCard ? (
              <>
                <div className="text-primary font-bold text-2xl md:text-3xl leading-none">
                  <EditableText
                    value={contentMap[`${baseKey}_price`]}
                    fallback={pkg.price}
                    fieldKey={`${baseKey}_price`}
                    category="services"
                    label={`سعر الباقة ${pkg.name}`}
                  />
                </div>
                {(contentMap[`${baseKey}_price_note`] ?? pkg.priceNote) ? (
                  <div className={["text-xs mt-2", vip ? "text-primary/90" : "text-muted-foreground"].join(" ")}>
                    <EditableText
                      value={contentMap[`${baseKey}_price_note`]}
                      fallback={pkg.priceNote}
                      fieldKey={`${baseKey}_price_note`}
                      category="services"
                      label={`ملاحظة السعر ${pkg.name}`}
                      multiline
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

        {orderedFeatures.length && !isCustom ? (
          <ul className="space-y-3 mb-6 md:mb-7">
            {orderedFeatures.map((item, i) => {
              const featureValue = item.value;
              const showProTag = false;
              const showMediaTag = featureValue.includes("MEDIA COVERAGE REELS");
              const label = item.isSynthetic
                ? "ملاحظة برو"
                : `ميزة ${item.index + 1} - ${pkg.name}`;
              return (
                <li key={item.fieldKey ?? i} className="flex items-start text-sm">
                  <Check size={16} className="text-primary ml-2 mt-1 flex-shrink-0" />
                  <span className="text-gray-300 leading-relaxed">
                    <EditableText
                      value={contentMap[item.fieldKey]}
                      fallback={item.feature}
                      fieldKey={item.fieldKey}
                      category="services"
                      label={label}
                      multiline
                    />
                    {showProTag ? (
                      <span className="pro-note-tag">
                        <EditableText
                          value={contentMap.services_pro_tag}
                          fallback="مصور خاص"
                          fieldKey="services_pro_tag"
                          category="services"
                          label="وسم مصور خاص"
                        />
                      </span>
                    ) : null}
                    {showMediaTag ? (
                      <span className="pro-note-tag media-tag-glow">
                        <EditableText
                          value={contentMap.services_media_tag}
                          fallback="مصور خاص"
                          fieldKey="services_media_tag"
                          category="services"
                          label="وسم مصور خاص (إعلامي)"
                        />
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {isCustom ? (
          <div className="custom-builder">
            <div className="custom-hint">
              علّم على الأيقونة بجانب اختيارك والسعر هيتجمعلك تحت تلقائي
            </div>
            {customPrintGroups.map((group) => (
              <div key={group.id} className="custom-group">
                <div className="custom-group-title">
                  {group.title}
                  {group.id === "vip-bags" ? (
                    <span className="custom-vip-tag">VIP</span>
                  ) : null}
                </div>
                <div className="custom-group-items">
                  {group.items.map((item) => {
                    const checked = effectiveCustomIds.includes(item.id);
                    return (
                      <label key={item.id} className="custom-item">
                        <Checkbox
                          checked={checked}
                          className="custom-checkbox"
                          onCheckedChange={(value) => {
                            const next = new Set(effectiveCustomIds);
                            const isChecked = value === true;
                            if (isChecked) {
                              next.add(item.id);
                            } else {
                              next.delete(item.id);
                            }
                            setSelectedCustomIds(Array.from(next));
                          }}
                        />
                        <span className="custom-item-label">{item.label}</span>
                        <span className="custom-item-price tabular-nums">{item.price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="custom-total-row">
              <div className="custom-total">
                📦 إجمالي السعر = {customTotal ? `${formatPriceNumber(customTotal)}ج` : "—"}
              </div>
              <Button
                type="button"
                variant="outline"
                className="custom-clear"
                onClick={() => setSelectedCustomIds([])}
              >
                إلغاء الاختيارات
              </Button>
            </div>
          </div>
        ) : null}

        {isCustom ? (
          <div className="custom-cta">
            <Link href={contactHref} className="w-full">
              <Button
                variant="outline"
                className="custom-cta-btn border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-none cta-glow cta-size w-full"
              >
                <EditableText
                  value={contentMap.services_custom_cta}
                  fallback="احجز الآن"
                  fieldKey="services_custom_cta"
                  category="services"
                  label="زر احجز الآن (خصص باقتك)"
                />
                <ArrowLeft className="mr-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href={contactHref}>
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none cta-glow cta-size"
                >
                <EditableText
                  value={contentMap.services_primary_cta}
                  fallback={ctaTexts.bookNow ?? "احجز الآن"}
                  fieldKey="services_primary_cta"
                  category="services"
                  label="زر احجز الآن (الباقات)"
                />
              </Button>
            </Link>

            <Link href="/package-details">
              <Button
                variant="outline"
                className="w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-none cta-glow cta-size"
              >
                <EditableText
                  value={contentMap.services_secondary_cta}
                  fallback="اسأل عن التفاصيل"
                  fieldKey="services_secondary_cta"
                  category="services"
                  label="زر اسأل عن التفاصيل"
                />
                <ArrowLeft className="mr-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        {vip && (
          <div className="mt-5 text-xs vip-note">
            <EditableText
              value={contentMap.services_vip_note}
              fallback="* تسعير VIP Plus بيتم تحديده حسب تفاصيل اليوم والمكان وعدد ساعات التغطية."
              fieldKey="services_vip_note"
              category="services"
              label="ملاحظة VIP"
              multiline
            />
          </div>
        )}
        </div>

        {isCollapsible && !isExpanded ? (
          <>
            <div className={["full-day-fade", isAddon ? "addon-fade" : ""].join(" ")} />
            {isAddon ? (
              <div className="addon-hint">اضغط لاظهار باقي التفاصيل</div>
            ) : (
              <div className="full-day-hint">
                <span className="full-day-hint-pill">
                  <ArrowDown className="w-4 h-4" />
                  اضغط لعرض باقي التفاصيل
                </span>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function QuickNav({
  active,
  onJump,
  stuck,
  navRef,
  contentMap,
}: {
  active: string;
  onJump: (id: string) => void;
  stuck: boolean;
  navRef: React.Ref<HTMLDivElement>;
  contentMap: Record<string, string>;
}) {
  const items = [
    { id: "sessions", labelKey: "services_nav_sessions", fallback: "سيشن" },
    { id: "prints", labelKey: "services_nav_prints", fallback: "المطبوعات" },
    { id: "wedding", labelKey: "services_nav_wedding", fallback: "Full Day" },
    { id: "addons", labelKey: "services_nav_addons", fallback: "إضافات" },
  ];

  return (
    <div
      className={["z-40 quicknav-float", stuck ? "quicknav-stuck" : ""].join(" ")}
      style={stuck ? { top: "calc(var(--nav-offset, 96px) - 6px)" } : undefined}
      ref={navRef}
    >
      <div className="container mx-auto px-4 py-2 sm:py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
          {items.map((it) => {
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => onJump(it.id)}
                className={[
                  "shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold transition-all duration-200 rounded-full tap-target border quicknav-btn",
                  isActive ? "quicknav-btn--active" : "quicknav-btn--idle",
                ].join(" ")}
              >
                <EditableText
                  value={contentMap[it.labelKey]}
                  fallback={it.fallback}
                  fieldKey={it.labelKey}
                  category="services"
                  label={`عنوان التنقل ${it.fallback}`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Services() {
  const { contactInfo } = useContactData();
  const content = useContentData();
  const {
    sessionPackages,
    sessionPackagesWithPrints,
    weddingPackages,
    additionalServices,
  } = usePackagesData();
  const customPackage = useMemo(() => {
    const all = [
      ...sessionPackages,
      ...sessionPackagesWithPrints,
      ...weddingPackages,
      ...additionalServices,
    ];
    return all.find((pkg) => pkg.id === "special-montage-design");
  }, [sessionPackages, sessionPackagesWithPrints, weddingPackages, additionalServices]);
  const addonsPackages = useMemo(
    () => additionalServices.filter((pkg) => pkg.id !== "special-montage-design"),
    [additionalServices]
  );
  const hasProSession = useMemo(
    () => sessionPackages.some((pkg: any) => pkg?.id === "session-2"),
    [sessionPackages]
  );
  const contentMap = content.contentMap ?? {};
  const [prefillPrintIds, setPrefillPrintIds] = useState<string[]>(() => readStoredPrintIds());
  const [activeSection, setActiveSection] = useState("sessions");
  const [isNavStuck, setIsNavStuck] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const navAnchorRef = useRef<HTMLDivElement | null>(null);
  const [navHeight, setNavHeight] = useState(0);

  const ids = useMemo(() => ["sessions", "prints", "wedding", "addons"], []);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const offset = getSectionScrollMarginPx();
    const top = el.getBoundingClientRect().top + window.scrollY - offset;

    setActiveSection(id);
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "smooth" });
  };

  useEffect(() => {
    let raf = 0;

    const updateMetrics = () => {
      const navEl = navRef.current;
      if (navEl) setNavHeight(navEl.offsetHeight);
    };

    updateMetrics();

    const computeActiveByScroll = () => {
      const offset = getSectionScrollMarginPx() + 8;
      const y = window.scrollY + offset;

      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop <= y) current = id;
      }
      setActiveSection(current);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        computeActiveByScroll();
        const navEl = navRef.current;
        const anchor = navAnchorRef.current;
        if (navEl && anchor) {
          const offset = getNavOffsetPx() - 2;
          const anchorTop = anchor.getBoundingClientRect().top;
          setIsNavStuck(anchorTop <= offset);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("resize", updateMetrics);
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("resize", updateMetrics);
    };
  }, [ids]);

  const sectionStyle = useMemo(() => {
    return { scrollMarginTop: `${getSectionScrollMarginPx()}px` } as React.CSSProperties;
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div
        className="border-y border-primary/20 bg-[linear-gradient(90deg,rgba(255,200,80,0.16),rgba(255,200,80,0.05),transparent)]"
        style={{ marginTop: "var(--nav-offset, 96px)" }}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm text-foreground/90">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary">
              <Gift className="w-4 h-4" />
              <EditableText
                value={contentMap.services_promo_badge}
                fallback="هديّة"
                fieldKey="services_promo_badge"
                category="services"
                label="شارة العرض"
              />
            </span>
            <span>
              <EditableText
                value={contentMap.services_promo_text}
                fallback="عند الحجز اسأل عن هديتك"
                fieldKey="services_promo_text"
                category="services"
                label="نص العرض"
              />
            </span>
            <ArrowDown className="promo-arrow w-4 h-4 text-primary/70" />
          </div>
        </div>
      </div>

      <header className="pt-10 md:pt-12 pb-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-background/35 to-background" />
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_20%,rgba(255,200,80,0.10),transparent_60%)]" />
        <div className="absolute inset-0 pointer-events-none hero-grain opacity-[0.10]" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 bg-black/20 backdrop-blur-md mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs md:text-sm text-foreground/80">
              <EditableText
                value={contentMap.services_kicker}
                fallback="باقات واضحة • ستايل فاخر • تسليم احترافي"
                fieldKey="services_kicker"
                category="services"
                label="عنوان صغير (الخدمات)"
              />
            </span>
          </div>

          <h1 className="text-4xl md:text-7xl font-bold mb-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <EditableText
              value={contentMap.services_title}
              fallback={pageTexts.services.title}
              fieldKey="services_title"
              category="services"
              label="عنوان صفحة الخدمات"
            />
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed services-subtitle-glow">
            <EditableText
              value={contentMap.services_subtitle}
              fallback={pageTexts.services.subtitle}
              fieldKey="services_subtitle"
              category="services"
              label="وصف صفحة الخدمات"
              multiline
            />
          </p>

        </div>
      </header>

      <div ref={navAnchorRef} className="h-px" aria-hidden="true" />
      {isNavStuck ? <div style={{ height: navHeight }} aria-hidden="true" /> : null}
      <QuickNav
        active={activeSection}
        onJump={jumpTo}
        stuck={isNavStuck}
        navRef={navRef}
        contentMap={contentMap}
      />

      <section id="sessions" className="py-10 md:py-16" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <EditableText
                value={contentMap.services_sessions_title}
                fallback={pageTexts.services.sessionsTitle}
                fieldKey="services_sessions_title"
                category="services"
                label="عنوان قسم السيشن"
              />
            }
            subtitle={
              <EditableText
                value={contentMap.services_sessions_subtitle}
                fallback="اختيار موفق - نفس الجودة"
                fieldKey="services_sessions_subtitle"
                category="services"
                label="وصف قسم السيشن"
              />
            }
            subtitleClassName="section-subtitle-glow"
            icon={<Camera className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {sessionPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg as any}
                kind="session"
                whatsappNumber={contactInfo.whatsappNumber}
                contentMap={contentMap}
                preselectedPrintIds={prefillPrintIds}
                onPreselectedPrintIdsChange={setPrefillPrintIds}
              />
            ))}

          </div>
        </div>
      </section>

      <section id="prints" className="py-10 md:py-16" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <span className="prints-title-wrap">
                <EditableText
                  value={contentMap.services_prints_title}
                  fallback="المطبوعات"
                  fieldKey="services_prints_title"
                  category="services"
                  label="عنوان قسم المطبوعات"
                />
                <span className="prints-optional-tag">(اختياري)</span>
              </span>
            }
            subtitle={
              <EditableText
                value={contentMap.services_prints_subtitle}
                fallback="اختار العناصر اللي تناسبك واتحسب الإجمالي فوراً"
                fieldKey="services_prints_subtitle"
                category="services"
                label="وصف قسم المطبوعات"
              />
            }
            icon={<Receipt className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto">
            {customPackage ? (
              <PackageCard
                pkg={customPackage as any}
                kind="addon"
                whatsappNumber={contactInfo.whatsappNumber}
                contentMap={contentMap}
                preselectedPrintIds={prefillPrintIds}
                onPreselectedPrintIdsChange={setPrefillPrintIds}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section
        id="wedding"
        className="py-10 md:py-16 bg-card border-y border-white/5"
        style={sectionStyle}
      >
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <EditableText
                value={contentMap.services_wedding_title}
                fallback={pageTexts.services.weddingTitle}
                fieldKey="services_wedding_title"
                category="services"
                label="عنوان قسم الزفاف"
              />
            }
            subtitle={
              <EditableText
                value={contentMap.services_wedding_subtitle}
                fallback="تغطية يوم كامل • فريق • تفاصيل • تسليم سريع"
                fieldKey="services_wedding_subtitle"
                category="services"
                label="وصف قسم الزفاف"
              />
            }
            icon={<Heart className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {weddingPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg as any}
                kind="wedding"
                whatsappNumber={contactInfo.whatsappNumber}
                contentMap={contentMap}
                preselectedPrintIds={prefillPrintIds}
                onPreselectedPrintIdsChange={setPrefillPrintIds}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="addons" className="py-10 md:py-16" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <EditableText
                value={contentMap.services_addons_title}
                fallback={pageTexts.services.addonsTitle}
                fieldKey="services_addons_title"
                category="services"
                label="عنوان قسم الإضافات"
              />
            }
            subtitle={
              <EditableText
                value={contentMap.services_addons_subtitle}
                fallback="اختيارات إضافية تزود التجربة جمال"
                fieldKey="services_addons_subtitle"
                category="services"
                label="وصف قسم الإضافات"
              />
            }
            icon={<PlusCircle className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {addonsPackages.map((service) => (
              <div
                key={service.id}
                className="relative bg-card p-7 md:p-8 border border-white/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 premium-border group overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,200,80,0.12),transparent_60%)]" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold flex flex-wrap items-center gap-2">
                      {service.emoji ? <span className="text-base">{service.emoji}</span> : null}
                      <EditableText
                        value={contentMap[`package_${service.id}_name`]}
                        fallback={service.name}
                        fieldKey={`package_${service.id}_name`}
                        category="services"
                        label={`اسم الإضافة ${service.name}`}
                      />
                      {["wedding-party", "media-coverage", "promo-video"].includes(service.id) ? (
                        <span className="addon-special-tag">مصور خاص</span>
                      ) : null}
                    </h3>
                    <span className="text-primary font-bold">
                      <EditableText
                        value={contentMap[`package_${service.id}_price`]}
                        fallback={service.price}
                        fieldKey={`package_${service.id}_price`}
                        category="services"
                        label={`سعر الإضافة ${service.name}`}
                      />
                    </span>
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    <EditableText
                      value={contentMap[`package_${service.id}_description`]}
                      fallback={service.description}
                      fieldKey={`package_${service.id}_description`}
                      category="services"
                      label={`وصف الإضافة ${service.name}`}
                      multiline
                    />
                  </p>
                  <ul className="space-y-3">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <Check size={14} className="text-primary ml-2 mt-1 flex-shrink-0" />
                        <span className="text-gray-300">
                          <EditableText
                            value={contentMap[`package_${service.id}_feature_${i + 1}`]}
                            fallback={feature}
                            fieldKey={`package_${service.id}_feature_${i + 1}`}
                            category="services"
                            label={`ميزة الإضافة ${i + 1} - ${service.name}`}
                            multiline
                          />
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7">
                    <PrimaryCTA
                      whatsappNumber={contactInfo.whatsappNumber}
                      label={
                        <EditableText
                          value={contentMap.services_primary_cta}
                          fallback={ctaTexts.bookNow ?? "احجز الآن"}
                          fieldKey="services_primary_cta"
                          category="services"
                          label="زر احجز الآن (الإضافات)"
                        />
                      }
                    />
                  </div>

                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-muted-foreground mt-10 text-sm leading-relaxed space-y-2">
            <div>
              <EditableText
                value={contentMap.services_note_1}
                fallback="اطمئن التزامي في المواعيد وجودة التسليم جزء من شغلي، مش ميزة إضافية."
                fieldKey="services_note_1"
                category="services"
                label="ملاحظة الخدمات 1"
                multiline
              />
            </div>
            <div>
              <EditableText
                value={contentMap.services_note_2}
                fallback="* الأسعار قد تختلف حسب الموقع والتفاصيل الإضافية. غير شامل رسوم اللوكيشن."
                fieldKey="services_note_2"
                category="services"
                label="ملاحظة الخدمات 2"
                multiline
              />
            </div>
            <div>
              <EditableText
                value={contentMap.services_note_3}
                fallback="حجز اليوم بالأسبقية — Full Day لو اليوم محجوز لعريس تاني قبلك بنعتذر."
                fieldKey="services_note_3"
                category="services"
                label="ملاحظة الخدمات 3"
                multiline
              />
            </div>
            <div>
              <EditableText
                value={contentMap.services_note_4}
                fallback="الحجز يتم بتأكيد على واتساب + ديبوزيت تأكيد."
                fieldKey="services_note_4"
                category="services"
                label="ملاحظة الخدمات 4"
                multiline
              />
            </div>
            <div>
              <EditableText
                value={contentMap.services_note_5}
                fallback="الاستفسار فقط لا يعتبر حجزًا ويتم إلغاؤه تلقائيًا بدون تأكيد."
                fieldKey="services_note_5"
                category="services"
                label="ملاحظة الخدمات 5"
                multiline
              />
            </div>
            <div>
              <EditableText
                value={contentMap.services_note_6}
                fallback="أقدر أساعدك في أي شيء خارج التصوير يوم الزفاف (خدمات ونصائح مجانية)."
                fieldKey="services_note_6"
                category="services"
                label="ملاحظة الخدمات 6"
                multiline
              />
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .hero-grain {
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          mix-blend-mode: overlay;
        }

        .services-card::after {
          content: "";
          position: absolute;
          inset: -40% -10%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.28) 48%, transparent 72%);
          transform: translateX(-120%);
          animation: services-shine 6s ease-in-out infinite;
          opacity: 0.3;
          pointer-events: none;
        }
        .full-day-collapsed {
          cursor: pointer;
        }
        .full-day-body--collapsible {
          position: relative;
          overflow: hidden;
          max-height: 2000px;
          transition: max-height 0.6s ease;
        }
        .full-day-body--collapsed {
          max-height: 360px;
        }
        .full-day-body--collapsed.addon-body {
          max-height: 300px;
        }
        .full-day-fade {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 140px;
          background: linear-gradient(180deg, rgba(8,8,10,0) 0%, rgba(8,8,10,0.65) 55%, rgba(8,8,10,0.95) 100%);
          pointer-events: none;
        }
        .addon-fade {
          height: 110px;
          background: linear-gradient(180deg, rgba(8,8,10,0) 0%, rgba(8,8,10,0.55) 45%, rgba(8,8,10,0.92) 100%);
        }
        .addon-hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 22px;
          text-align: center;
          font-size: 12px;
          letter-spacing: 0.08em;
          color: rgba(255,245,220,0.95);
          text-shadow:
            0 0 12px rgba(255,210,130,0.55),
            0 0 26px rgba(255,210,130,0.35);
          animation: addon-hint-wiggle 2.6s ease-in-out infinite,
            addon-hint-glow 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        .full-day-hint {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 18px;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .full-day-hint-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.45);
          background: rgba(12,12,16,0.65);
          color: rgba(255,245,225,0.95);
          font-size: 12px;
          letter-spacing: 0.04em;
          box-shadow: 0 14px 32px rgba(0,0,0,0.35), 0 0 18px rgba(255,200,80,0.22);
          animation: hint-float 2.6s ease-in-out infinite;
        }
        .full-day-hint-pill svg {
          filter: drop-shadow(0 0 8px rgba(255,200,80,0.45));
          animation: hint-bounce 1.8s ease-in-out infinite;
        }
        @keyframes addon-hint-wiggle {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-3px) rotate(-0.6deg); }
          50% { transform: translateY(1px) rotate(0.6deg); }
          75% { transform: translateY(-2px) rotate(-0.3deg); }
        }
        @keyframes addon-hint-glow {
          0%, 100% {
            text-shadow:
              0 0 10px rgba(255,210,130,0.45),
              0 0 20px rgba(255,210,130,0.25);
          }
          50% {
            text-shadow:
              0 0 18px rgba(255,210,130,0.75),
              0 0 34px rgba(255,210,130,0.45);
          }
        }
        .session-addons {
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .session-addons-title {
          font-size: 12px;
          color: rgba(255,245,220,0.7);
          letter-spacing: 0.06em;
          margin-bottom: 10px;
          text-transform: uppercase;
          text-align: right;
        }
        .session-addons-grid {
          display: grid;
          gap: 10px;
        }
        .session-addons-grid--buttons {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        @media (min-width: 640px) {
          .session-addons-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        .session-addon-chip {
          border: 1px solid rgba(255,210,120,0.35);
          background: rgba(12,12,16,0.55);
          padding: 10px 12px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: right;
          color: rgba(255,255,255,0.92);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.08);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .session-addon-chip:hover {
          transform: translateY(-2px);
          border-color: rgba(255,210,120,0.6);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,210,120,0.18);
        }
        .session-addon-chip-title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
        }
        .session-addon-chip-price {
          font-size: 12px;
          color: rgba(255,220,150,0.95);
          white-space: nowrap;
        }
        @keyframes hint-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
        @keyframes hint-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(3px); opacity: 1; }
        }
        @media (max-width: 640px) {
          .full-day-body--collapsed {
            max-height: 300px;
          }
        }

        .quicknav-float {
          background: transparent;
          border: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          box-shadow: none;
          overflow: visible;
          transform: translateY(0);
          transition: transform 240ms ease, box-shadow 240ms ease, background 240ms ease;
          will-change: transform;
          position: relative;
        }
        .quicknav-float::after {
          content: none;
        }
        .quicknav-stuck {
          position: fixed;
          left: 0;
          right: 0;
          background: transparent;
          border: none;
          box-shadow: none;
          transform: translateY(0);
          animation: nav-float 3.6s ease-in-out infinite;
        }
        .quicknav-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(140deg, rgba(255,210,120,0.1), rgba(10,10,14,0.65) 70%);
          border-color: rgba(255,210,120,0.35);
          color: rgba(255,235,200,0.9);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.1);
        }
        .quicknav-btn::after {
          content: "";
          position: absolute;
          inset: -160% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.5) 46%, transparent 72%);
          transform: translateX(-120%);
          animation: services-shine 6.2s ease-in-out infinite;
          opacity: 0.35;
          pointer-events: none;
        }
        .quicknav-btn:hover {
          border-color: rgba(255,210,120,0.65);
          color: #fff2dc;
          box-shadow: 0 0 18px rgba(255,210,130,0.25);
        }
        .quicknav-btn--active {
          background: linear-gradient(140deg, rgba(255,210,120,0.48), rgba(255,255,255,0.12) 70%);
          border-color: rgba(255,210,120,0.9);
          color: #fff7e4;
          text-shadow: 0 0 16px rgba(255,210,130,0.55);
          box-shadow: 0 0 32px rgba(255,210,130,0.65), 0 0 64px rgba(255,210,130,0.25);
        }
        .quicknav-btn--active::after {
          opacity: 0.9;
          animation-duration: 4.6s;
        }
        @keyframes nav-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .services-subtitle-glow {
          color: rgba(255,245,220,0.9);
          text-shadow: 0 0 16px rgba(255,210,130,0.45);
        }
        .vip-highlight {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.4);
          background:
            linear-gradient(140deg, rgba(255,210,120,0.18), rgba(10,10,14,0.65) 65%),
            radial-gradient(circle at 20% 20%, rgba(255,245,210,0.25), transparent 60%);
          color: rgba(255,245,220,0.95);
          font-size: 13px;
          line-height: 1.6;
          text-shadow: 0 0 18px rgba(255,210,130,0.55);
          box-shadow: 0 12px 30px rgba(0,0,0,0.35), 0 0 22px rgba(255,210,130,0.18);
          overflow: hidden;
          isolation: isolate;
        }
        .vip-highlight::after {
          content: "";
          position: absolute;
          inset: -120% -10%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.6) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 5.5s ease-in-out infinite;
          opacity: 0.55;
          pointer-events: none;
        }
        .vip-highlight-icon {
          color: rgba(255,220,150,0.95);
          filter: drop-shadow(0 0 10px rgba(255,210,130,0.6));
        }
        .section-subtitle-glow {
          color: rgba(255,235,200,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.45);
          letter-spacing: 0.08em;
        }
        .prints-title-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .prints-optional-tag {
          font-size: 0.55em;
          padding: 2px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.45);
          color: rgba(255,240,210,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.55);
          background: linear-gradient(120deg, rgba(255,210,120,0.22), rgba(255,255,255,0.06));
          box-shadow: 0 0 18px rgba(255,210,130,0.25);
          letter-spacing: 0.08em;
          white-space: nowrap;
        }
        .pro-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.6);
          background: linear-gradient(120deg, rgba(255,210,120,0.4), rgba(255,255,255,0.08));
          color: #fff4d5;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          text-shadow: 0 0 14px rgba(255,210,130,0.7);
          box-shadow: 0 10px 30px rgba(255,200,80,0.2);
        }
        .price-corner {
          position: absolute;
          top: 1.25rem;
          left: 1.25rem;
          padding: 0;
          border-radius: 0;
          border: 0;
          background: transparent;
          color: rgba(255,245,220,0.98);
          font-weight: 800;
          font-size: 1.35rem;
          line-height: 1.1;
          letter-spacing: 0.02em;
          text-shadow:
            0 0 12px rgba(255,210,130,0.6),
            0 0 26px rgba(255,210,130,0.35);
          box-shadow: none;
          overflow: hidden;
          z-index: 2;
          pointer-events: none;
          isolation: isolate;
          animation: price-glow 3.6s ease-in-out infinite;
        }
        .price-corner::after {
          content: none;
        }
        .price-corner-note {
          display: block;
          margin-top: 6px;
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,235,200,0.8);
        }
        @keyframes price-glow {
          0%, 100% {
            text-shadow:
              0 0 10px rgba(255,210,130,0.5),
              0 0 20px rgba(255,210,130,0.25);
          }
          50% {
            text-shadow:
              0 0 18px rgba(255,210,130,0.75),
              0 0 34px rgba(255,210,130,0.45);
          }
        }
        .pro-note {
          margin-top: -8px;
          margin-bottom: 18px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,235,200,0.9);
          text-shadow: 0 0 14px rgba(255,210,130,0.45);
        }
        .pro-note-text {
          opacity: 0.9;
        }
        .pro-note-tag {
          display: inline-block;
          margin-right: 8px;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: rgba(255,240,205,0.9);
          text-shadow: 0 0 10px rgba(255,210,130,0.4);
        }
        .media-tag-glow {
          color: rgba(255,248,225,0.98);
          text-shadow: 0 0 12px rgba(255,210,130,0.7), 0 0 22px rgba(255,210,130,0.4);
        }
        .vip-note {
          color: rgba(255,235,200,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.5);
        }
        .price-note-inline {
          margin-right: 8px;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,235,200,0.85);
          text-shadow: 0 0 10px rgba(255,210,130,0.35);
        }
        .addon-special-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.55);
          background:
            linear-gradient(130deg, rgba(255,210,120,0.35), rgba(255,255,255,0.08)),
            radial-gradient(circle at 20% 20%, rgba(255,245,210,0.35), transparent 60%);
          color: rgba(255,245,220,0.98);
          font-size: 10px;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(255,210,130,0.7);
          box-shadow:
            0 6px 18px rgba(0,0,0,0.35),
            0 0 16px rgba(255,210,130,0.35);
          position: relative;
          overflow: hidden;
        }
        .addon-special-tag::after {
          content: "";
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.7) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 5.8s ease-in-out infinite;
          opacity: 0.45;
          pointer-events: none;
        }

        .custom-package {
          background:
            linear-gradient(145deg, rgba(18,18,24,0.9), rgba(8,8,12,0.98)),
            radial-gradient(circle at 20% 15%, rgba(255,210,120,0.12), transparent 55%);
          border-style: dashed;
          border-color: rgba(255,210,120,0.45);
          box-shadow: 0 22px 70px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,210,120,0.25);
          border-radius: 28px;
          aspect-ratio: auto;
          max-width: 520px;
          min-height: 320px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .custom-body {
          text-align: right;
        }
        .custom-cta {
          margin-top: 18px;
          display: flex;
          justify-content: center;
        }
        .custom-cta-btn {
          max-width: 320px;
        }
        .custom-builder {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: right;
        }
        .custom-title {
          font-size: inherit;
          color: #ffffff;
          text-shadow: none;
          letter-spacing: 0;
        }
        .custom-price {
          text-align: right;
        }
        .custom-price-main {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,235,200,0.95);
          text-shadow: 0 0 14px rgba(255,210,130,0.6);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .custom-price-sub {
          margin-top: 6px;
          font-size: 12px;
          color: rgba(255,245,230,0.92);
          text-shadow:
            0 0 14px rgba(255,210,130,0.6),
            0 0 28px rgba(255,210,130,0.45);
        }
        .custom-hint {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          text-shadow: none;
          letter-spacing: 0;
          text-align: right;
          margin: 2px 0 4px;
        }
        .custom-group {
          border: 0;
          border-radius: 16px;
          padding: 4px 6px 6px;
          background: rgba(18,18,26,0.88);
          box-shadow: none;
        }
        .custom-group-title {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,240,210,0.98);
          letter-spacing: 0;
          text-transform: none;
          font-family: "Cairo", sans-serif;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .custom-vip-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.6);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: linear-gradient(120deg, rgba(255,210,120,0.45), rgba(255,255,255,0.12));
          color: #fff5d6;
          text-shadow: 0 0 12px rgba(255,210,130,0.7);
          box-shadow: 0 10px 24px rgba(255,200,80,0.2);
          position: relative;
          overflow: hidden;
        }
        .custom-vip-tag::after {
          content: "";
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.6) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: services-shine 5.8s ease-in-out infinite;
          opacity: 0.5;
          pointer-events: none;
        }
        .custom-group-items {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .custom-item {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: start;
          font-size: 14px;
          color: rgba(255,255,255,0.92);
        }
        .custom-item-label {
          line-height: 1.6;
          min-width: 0;
        }
        .custom-item-price {
          font-size: 13px;
          color: rgba(255,220,150,0.95);
          text-shadow: 0 0 12px rgba(255,210,130,0.55);
          font-variant-numeric: tabular-nums;
        }
        .custom-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 1px solid rgba(255,210,120,0.65);
          background: rgba(10,10,14,0.7);
          box-shadow: 0 0 0 1px rgba(255,210,120,0.3) inset, 0 4px 12px rgba(0,0,0,0.35);
          position: relative;
        }
        .custom-checkbox[data-state="checked"] {
          background: rgba(255,210,120,0.9);
          color: #1b1207;
          border-color: rgba(255,210,120,0.9);
          box-shadow: 0 0 16px rgba(255,210,130,0.55);
        }
        .custom-checkbox[data-state="unchecked"] {
          animation: custom-border-pulse 1.8s ease-in-out infinite;
        }
        @keyframes custom-border-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(255,210,120,0.35) inset,
              0 0 0 0 rgba(255,210,120,0.35);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255,210,120,0.55) inset,
              0 0 12px rgba(255,210,120,0.45);
          }
        }
        .custom-total {
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255,210,120,0.35);
          background: rgba(12,12,16,0.55);
          color: rgba(255,245,220,0.98);
          font-weight: 700;
          text-align: center;
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
        }
        .custom-total-row {
          margin-top: 6px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .custom-clear {
          border-color: rgba(255,210,120,0.45);
          color: rgba(255,235,200,0.95);
          background: rgba(12,12,16,0.35);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.15);
        }
        @media (max-width: 640px) {
          .custom-package {
            border-radius: 22px;
            max-width: 100%;
            min-height: 0;
          }
          .services-card {
            padding: 24px;
          }
        }
        .custom-line {
          margin-top: 8px;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,210,120,0.3);
          background: rgba(12,12,16,0.6);
          color: rgba(255,230,190,0.92);
          font-size: 13px;
          letter-spacing: 0.04em;
          line-height: 1.6;
          box-shadow: 0 10px 28px rgba(0,0,0,0.35);
        }
        .custom-line--compact {
          margin-top: 4px;
          padding: 8px 12px;
        }
        .custom-description {
          display: block;
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: none;
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
          text-shadow: 0 0 14px rgba(255,255,255,0.25);
        }
        .custom-note-text {
          color: rgba(255,245,230,0.98);
          font-weight: 700;
          text-shadow:
            0 0 12px rgba(255,210,130,0.55),
            0 0 24px rgba(255,210,130,0.35);
        }
        .promo-arrow {
          filter: drop-shadow(0 0 10px rgba(255,200,80,0.35));
          animation: promo-float 2.8s ease-in-out infinite;
        }
        @keyframes promo-float {
          0%, 100% { transform: translateY(0); opacity: 0.55; }
          50% { transform: translateY(4px); opacity: 0.9; }
        }
        @keyframes services-shine {
          0% { transform: translateX(-120%); }
          65% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }

      `}</style>

      <Footer />
    </div>
  );
}
