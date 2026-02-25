import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  Pencil,
  Trash2,
  EyeOff,
  X,
  Image as ImageIcon,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
} from "lucide-react";
import { pushEdit } from "@/lib/editHistory";

type ConfirmState = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm?: () => void;
};

function useInlineConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "تأكيد الحفظ",
    description: "هل تريد حفظ التعديل الآن؟",
    confirmLabel: "حفظ",
    cancelLabel: "إلغاء",
  });

  const requestConfirm = (options: {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }) => {
    setState({
      open: true,
      title: options.title ?? "تأكيد الحفظ",
      description: options.description ?? "هل تريد حفظ التعديل الآن؟",
      confirmLabel: options.confirmLabel ?? "حفظ",
      cancelLabel: options.cancelLabel ?? "إلغاء",
      onConfirm: options.onConfirm,
    });
  };

  const closeDialog = () => {
    setState((prev) => ({ ...prev, open: false, onConfirm: undefined }));
  };

  const ConfirmDialog = () => (
    <AlertDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
      }}
    >
      <AlertDialogContent dir="rtl" className="text-right">
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description ? (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-start">
          <AlertDialogCancel>{state.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const action = state.onConfirm;
              closeDialog();
              action?.();
            }}
          >
            {state.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestConfirm, ConfirmDialog };
}

type EditableTextProps = {
  value?: string | null;
  fallback?: string;
  fallbackNode?: ReactNode;
  placeholder?: string;
  fieldKey: string;
  category: string;
  label: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
  editorClassName?: string;
  as?: ElementType;
};

export function useInlineEditMode() {
  const [isPreview, setIsPreview] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const hasPreviewParam = params.get("adminPreview") === "1";
    const storageKey = "adminPreviewMode";
    if (hasPreviewParam) {
      window.sessionStorage.setItem(storageKey, "1");
      return true;
    }
    return window.sessionStorage.getItem(storageKey) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = "adminPreviewMode";
    const params = new URLSearchParams(window.location.search);
    const hasPreviewParam = params.get("adminPreview") === "1";
    if (hasPreviewParam) {
      window.sessionStorage.setItem(storageKey, "1");
      setIsPreview(true);
      return;
    }
    const stored = window.sessionStorage.getItem(storageKey) === "1";
    setIsPreview(stored);
  }, []);

  const statusQuery = trpc.adminAccess.status.useQuery(undefined, {
    enabled: isPreview,
    staleTime: 60_000,
  });

  return {
    enabled: isPreview && Boolean(statusQuery.data?.authenticated),
    loading: isPreview && statusQuery.isLoading,
  };
}

function useContentPositions() {
  const { data } = trpc.siteContent.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  return useMemo(() => {
    const out: Record<string, { offsetX: number; offsetY: number }> = {};
    (data ?? []).forEach((item: any) => {
      out[item.key] = {
        offsetX: typeof item.offsetX === "number" ? item.offsetX : 0,
        offsetY: typeof item.offsetY === "number" ? item.offsetY : 0,
      };
    });
    return out;
  }, [data]);
}

function useSiteImagePositions() {
  const { data } = trpc.siteImages.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  return useMemo(() => {
    const out: Record<string, { offsetX: number; offsetY: number }> = {};
    (data ?? []).forEach((item: any) => {
      out[item.key] = {
        offsetX: typeof item.offsetX === "number" ? item.offsetX : 0,
        offsetY: typeof item.offsetY === "number" ? item.offsetY : 0,
      };
    });
    return out;
  }, [data]);
}

export function EditableText({
  value,
  fallback,
  fallbackNode,
  placeholder,
  fieldKey,
  category,
  label,
  multiline = false,
  className,
  displayClassName,
  editorClassName,
  as = "span",
}: EditableTextProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [textTouched, setTextTouched] = useState(false);
  const [offsetDraft, setOffsetDraft] = useState({ offsetX: 0, offsetY: 0 });
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();
  const contentPositions = useContentPositions();
  const position = contentPositions[fieldKey];
  const hasOffset = Boolean(position?.offsetX || position?.offsetY);
  const positionStyle = hasOffset
    ? {
        transform: `translate(${position?.offsetX ?? 0}px, ${position?.offsetY ?? 0}px)`,
      }
    : undefined;

  const hasValue = value !== undefined && value !== null;
  const normalizedValue = hasValue ? value : "";
  const displayValue = hasValue ? normalizedValue : fallback || "";
  const showPlaceholder = !hasValue && !displayValue && !!placeholder;
  const isEmptyValue = displayValue === "";

  useEffect(() => {
    if (isEditing) return;
    setDraft(normalizedValue);
    setOffsetDraft({
      offsetX: position?.offsetX ?? 0,
      offsetY: position?.offsetY ?? 0,
    });
  }, [normalizedValue, position, isEditing]);

  const upsertMutation = trpc.siteContent.upsert.useMutation({
    onMutate: (input) => {
      const prev = normalizedValue ?? "";
      return {
        action: {
          kind: "siteContent" as const,
          key: input.key,
          prev,
          next: input.value,
          category: input.category,
          label: input.label ?? label,
        },
      };
    },
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prev !== ctx.action.next) {
        pushEdit(ctx.action);
      }
      toast.success("تم حفظ النص");
      utils.siteContent.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("siteContentUpdatedAt", String(Date.now()));
      }
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.siteContent.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف التعديل");
      utils.siteContent.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const startEditing = () => {
    if (!enabled) return;
    setDraft(hasValue ? normalizedValue : fallback || "");
    setTextTouched(false);
    setOffsetDraft({
      offsetX: position?.offsetX ?? 0,
      offsetY: position?.offsetY ?? 0,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!enabled || upsertMutation.isPending) return;
    const textChanged = textTouched && draft !== normalizedValue;
    const offsetChanged =
      offsetDraft.offsetX !== (position?.offsetX ?? 0) ||
      offsetDraft.offsetY !== (position?.offsetY ?? 0);
    if (!textChanged && !offsetChanged) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: textChanged ? draft : normalizedValue,
          category,
          label,
          offsetX: offsetDraft.offsetX,
          offsetY: offsetDraft.offsetY,
        });
      },
    });
  };

  const handleCancel = () => {
    setDraft(normalizedValue);
    setTextTouched(false);
    setOffsetDraft({
      offsetX: position?.offsetX ?? 0,
      offsetY: position?.offsetY ?? 0,
    });
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      handleSave();
      return;
    }
    if (multiline && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  const handleHide = () => {
    if (!enabled || upsertMutation.isPending) return;
    requestConfirm({
      title: "إخفاء النص",
      description: "سيتم إخفاء النص من الموقع حتى تعيد إظهاره.",
      confirmLabel: "إخفاء",
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: "",
          category,
          label,
          offsetX: position?.offsetX ?? 0,
          offsetY: position?.offsetY ?? 0,
        });
      },
    });
  };

  const handleReset = () => {
    if (!enabled || deleteMutation.isPending) return;
    requestConfirm({
      title: "حذف التعديل",
      description: "سيتم الرجوع للنص الافتراضي.",
      confirmLabel: "حذف التعديل",
      onConfirm: () => {
        deleteMutation.mutate({ key: fieldKey });
      },
    });
  };

  const Tag = as ?? "span";

  return (
    <Tag
      className={cn(
        "relative",
        enabled
          ? "group rounded-md outline outline-1 outline-dashed outline-transparent transition hover:outline-primary/40"
          : "",
        className
      )}
      style={positionStyle}
    >
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setTextTouched(true);
              }}
              onKeyDown={handleKeyDown}
              className={cn("min-h-[110px]", editorClassName)}
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setTextTouched(true);
              }}
              onKeyDown={handleKeyDown}
              className={editorClassName}
              autoFocus
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
          <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Move className="w-3 h-3" />
                الموضع (px)
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={offsetDraft.offsetX}
                  onChange={(e) =>
                    setOffsetDraft({
                      offsetX: Number(e.target.value) || 0,
                      offsetY: offsetDraft.offsetY,
                    })
                  }
                  className="h-8 w-20 text-xs"
                  dir="ltr"
                  placeholder="X"
                />
                <Input
                  type="number"
                  value={offsetDraft.offsetY}
                  onChange={(e) =>
                    setOffsetDraft({
                      offsetX: offsetDraft.offsetX,
                      offsetY: Number(e.target.value) || 0,
                    })
                  }
                  className="h-8 w-20 text-xs"
                  dir="ltr"
                  placeholder="Y"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setOffsetDraft({
                      offsetX: offsetDraft.offsetX,
                      offsetY: offsetDraft.offsetY - 10,
                    })
                  }
                >
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setOffsetDraft({
                      offsetX: offsetDraft.offsetX + 10,
                      offsetY: offsetDraft.offsetY,
                    })
                  }
                >
                  <ArrowRight className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setOffsetDraft({
                      offsetX: offsetDraft.offsetX - 10,
                      offsetY: offsetDraft.offsetY,
                    })
                  }
                >
                  <ArrowLeft className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setOffsetDraft({
                      offsetX: offsetDraft.offsetX,
                      offsetY: offsetDraft.offsetY + 10,
                    })
                  }
                >
                  <ArrowDown className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setOffsetDraft({ offsetX: 0, offsetY: 0 })}
              >
                تصفير الموضع
              </Button>
            </div>
          </div>
          {multiline && (
            <div className="text-xs text-muted-foreground">
              للحفظ اضغط Ctrl + Enter
            </div>
          )}
        </div>
      ) : (
        <>
          <span
            className={cn(
              showPlaceholder ? "text-muted-foreground" : "text-inherit",
              displayClassName
            )}
          >
            {normalizedValue ? (
              <span className="whitespace-pre-line">{normalizedValue}</span>
            ) : fallbackNode ? (
              fallbackNode
            ) : displayValue ? (
              <span className="whitespace-pre-line">{displayValue}</span>
            ) : (
              placeholder ?? ""
            )}
          </span>
          {enabled && (
            <div className="absolute -top-7 right-0 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  startEditing();
                }}
                title="تعديل"
                aria-label={`تعديل ${label}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  startEditing();
                }}
                title="تحريك"
                aria-label={`تحريك ${label}`}
              >
                <Move className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleHide();
                }}
                title="إخفاء"
                aria-label={`إخفاء ${label}`}
              >
                <EyeOff className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleReset();
                }}
                title="حذف التعديل"
                aria-label={`حذف تعديل ${label}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          {enabled && isEmptyValue ? (
            <span className="absolute -bottom-6 right-0 rounded-full border border-dashed border-primary/40 px-2 py-0.5 text-[10px] text-primary/80">
              مخفي
            </span>
          ) : null}
        </>
      )}
      <ConfirmDialog />
    </Tag>
  );
}

type EditableContactTextProps = {
  value?: string | null;
  fallback?: string;
  placeholder?: string;
  fieldKey: string;
  label: string;
  className?: string;
  displayClassName?: string;
  multiline?: boolean;
};

export function EditableContactText({
  value,
  fallback,
  placeholder,
  fieldKey,
  label,
  className,
  displayClassName,
  multiline = false,
}: EditableContactTextProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();

  const hasValue = value !== undefined && value !== null;
  const normalizedValue = hasValue ? value : "";
  const displayValue = hasValue ? normalizedValue : fallback || "";
  const showPlaceholder = !hasValue && !displayValue && !!placeholder;

  useEffect(() => {
    if (isEditing) return;
    setDraft(normalizedValue);
  }, [normalizedValue, isEditing]);

  const upsertMutation = trpc.contactInfo.upsert.useMutation({
    onMutate: (input) => {
      const prev = normalizedValue ?? "";
      return {
        action: {
          kind: "contactInfo" as const,
          key: input.key,
          prev,
          next: input.value,
          label: input.label ?? label,
        },
      };
    },
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prev !== ctx.action.next) {
        pushEdit(ctx.action);
      }
      toast.success("تم حفظ البيانات");
      utils.contactInfo.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleHide = () => {
    if (!enabled || upsertMutation.isPending) return;
    requestConfirm({
      title: "إخفاء النص",
      description: "سيتم إخفاء النص من الموقع حتى تعيد إظهاره.",
      confirmLabel: "إخفاء",
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: "",
          label,
        });
      },
    });
  };

  const handleSave = () => {
    if (!enabled || upsertMutation.isPending) return;
    if (draft === normalizedValue) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: draft,
          label,
        });
      },
    });
  };

  const handleCancel = () => {
    setDraft(normalizedValue);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }
    if (multiline && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <span
      className={cn(
        "relative",
        enabled
          ? "group rounded-md outline outline-1 outline-dashed outline-transparent transition hover:outline-primary/40"
          : "",
        className
      )}
    >
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[110px]"
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <>
          <span
            className={cn(
              showPlaceholder ? "text-muted-foreground" : "text-inherit",
              displayClassName
            )}
          >
            {displayValue || placeholder || ""}
          </span>
          {enabled && (
            <div className="absolute -top-7 right-0 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsEditing(true);
                  setDraft(hasValue ? normalizedValue : fallback || "");
                }}
                title="تعديل"
                aria-label={`تعديل ${label}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleHide();
                }}
                title="إخفاء"
                aria-label={`إخفاء ${label}`}
              >
                <EyeOff className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
      <ConfirmDialog />
    </span>
  );
}

type EditableLinkIconProps = {
  value?: string | null;
  fallback?: string;
  placeholder?: string;
  fieldKey: string;
  label: string;
  ariaLabel?: string;
  className?: string;
  linkClassName?: string;
  editorClassName?: string;
  formatHref?: (value: string) => string;
  target?: string;
  rel?: string;
  showEditButton?: boolean;
  editButtonClassName?: string;
  hideWhenDisabled?: boolean;
  allowEdit?: boolean;
  children: ReactNode;
};

export function EditableLinkIcon({
  value,
  fallback,
  placeholder,
  fieldKey,
  label,
  ariaLabel,
  className,
  linkClassName,
  editorClassName,
  formatHref,
  target,
  rel,
  showEditButton = false,
  editButtonClassName,
  hideWhenDisabled = false,
  allowEdit = true,
  children,
}: EditableLinkIconProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();

  const normalizedValue = value ?? "";
  const displayValue = normalizedValue || fallback || "";

  useEffect(() => {
    if (isEditing) return;
    setDraft(normalizedValue);
  }, [normalizedValue, isEditing]);

  const upsertMutation = trpc.contactInfo.upsert.useMutation({
    onMutate: (input) => {
      const prev = normalizedValue ?? "";
      return {
        action: {
          kind: "contactInfo" as const,
          key: input.key,
          prev,
          next: input.value,
          label: input.label ?? label,
        },
      };
    },
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prev !== ctx.action.next) {
        pushEdit(ctx.action);
      }
      toast.success("تم تحديث الرابط");
      utils.contactInfo.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!enabled || upsertMutation.isPending) return;
    if (draft === normalizedValue) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: draft,
          label,
        });
      },
    });
  };

  const handleCancel = () => {
    setDraft(normalizedValue);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }
  };

  const canEdit = enabled && allowEdit;

  if ((!enabled && hideWhenDisabled) || (!enabled && !displayValue)) return null;

  const hrefValue = displayValue ? (formatHref ? formatHref(displayValue) : displayValue) : "#";
  const linkTarget = target ?? "_blank";
  const linkRel = rel ?? (linkTarget === "_blank" ? "noreferrer" : undefined);

  return (
    <div className={cn("relative inline-flex items-center gap-2 group", className)}>
      <a
        href={hrefValue}
        target={linkTarget}
        rel={linkRel}
        aria-label={ariaLabel}
        className={linkClassName}
        onClick={(event) => {
          if (!canEdit) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {children}
      </a>
      {canEdit && !showEditButton && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsEditing(true);
            setDraft(displayValue);
          }}
          className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
          aria-label={`تعديل ${label}`}
        >
          <Pencil className="w-3 h-3" />
          تعديل
        </button>
      )}
      {canEdit && showEditButton && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsEditing(true);
            setDraft(displayValue);
          }}
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-white/20 bg-black/60 text-white text-[11px] px-2 py-1 hover:bg-black/70 transition",
            editButtonClassName
          )}
          aria-label={`تعديل ${label}`}
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {canEdit && isEditing && (
        <div className="absolute top-full right-0 mt-2 z-30 w-64 rounded-xl border border-white/15 bg-background p-3 text-right shadow-xl">
          <div className="text-xs font-semibold mb-2">{label}</div>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "الرابط"}
            className={cn("mb-2", editorClassName)}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

type EditableImageProps = {
  src: string;
  alt?: string;
  fieldKey: string;
  label: string;
  category: string;
  className?: string;
  imgClassName?: string;
  overlayClassName?: string;
};

export function EditableImage({
  src,
  alt = "",
  fieldKey,
  label,
  category,
  className,
  imgClassName,
  overlayClassName,
}: EditableImageProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(src);
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();
  const imagePositions = useSiteImagePositions();
  const position = imagePositions[fieldKey];
  const hasOffset = Boolean(position?.offsetX || position?.offsetY);
  const positionStyle = hasOffset
    ? {
        transform: `translate(${position?.offsetX ?? 0}px, ${position?.offsetY ?? 0}px)`,
      }
    : undefined;
  const [offsetDraft, setOffsetDraft] = useState({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (isEditing) return;
    setDraftUrl(src);
    setOffsetDraft({
      offsetX: position?.offsetX ?? 0,
      offsetY: position?.offsetY ?? 0,
    });
  }, [src, position, isEditing]);

  const upsertMutation = trpc.siteImages.upsert.useMutation({
    onMutate: (input) => ({
      action: {
        kind: "siteImage" as const,
        key: input.key,
        prevUrl: src,
        nextUrl: input.url,
        alt: input.alt,
        category: input.category,
        label,
      },
    }),
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prevUrl !== ctx.action.nextUrl) {
        pushEdit(ctx.action);
      }
      toast.success("تم تحديث الصورة");
      utils.siteImages.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadMutation = trpc.siteImages.upload.useMutation({
    onSuccess: (data) => {
      const nextUrl = data?.url ?? src;
      if (nextUrl && nextUrl !== src) {
        pushEdit({
          kind: "siteImage",
          key: fieldKey,
          prevUrl: src,
          nextUrl,
          alt,
          category,
          label,
        });
      }
      toast.success("تم رفع الصورة");
      utils.siteImages.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.siteImages.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف تعديل الصورة");
      utils.siteImages.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSaveUrl = () => {
    if (!enabled || upsertMutation.isPending) return;
    const urlChanged = draftUrl !== src;
    const offsetChanged =
      offsetDraft.offsetX !== (position?.offsetX ?? 0) ||
      offsetDraft.offsetY !== (position?.offsetY ?? 0);
    if (!urlChanged && !offsetChanged) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          url: draftUrl,
          alt,
          category,
          offsetX: offsetDraft.offsetX,
          offsetY: offsetDraft.offsetY,
        });
      },
    });
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    requestConfirm({
      title: "تأكيد رفع الصورة",
      description: "هل تريد رفع الصورة وحفظ التعديل الآن؟",
      confirmLabel: "رفع وحفظ",
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1] ?? "";
          if (!base64) {
            toast.error("تعذر قراءة الصورة");
            return;
          }
          uploadMutation.mutate({
            key: fieldKey,
            base64,
            mimeType: file.type,
            alt,
            category,
            offsetX: offsetDraft.offsetX,
            offsetY: offsetDraft.offsetY,
          });
        };
        reader.readAsDataURL(file);
      },
    });
  };

  const handleResetImage = () => {
    if (!enabled || deleteMutation.isPending) return;
    requestConfirm({
      title: "حذف تعديل الصورة",
      description: "سيتم الرجوع للصورة الافتراضية.",
      confirmLabel: "حذف التعديل",
      onConfirm: () => {
        deleteMutation.mutate({ key: fieldKey });
      },
    });
  };

  return (
    <div className={cn("relative group", className)} style={positionStyle}>
      <img src={src} alt={alt} className={imgClassName} />
      {enabled && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsEditing((prev) => !prev);
            }}
            className={cn("inline-flex items-center gap-1", overlayClassName)}
            title="استبدال الصورة"
            aria-label={`استبدال ${label}`}
          >
            <ImageIcon className="w-3 h-3" />
            استبدال
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleResetImage();
            }}
            className="inline-flex items-center gap-1 hover:text-primary"
            title="حذف التعديل"
            aria-label={`حذف تعديل ${label}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {enabled && isEditing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-background p-4 text-right shadow-xl">
            <div className="text-sm font-semibold mb-2">{label}</div>
            <Input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="رابط الصورة"
              className="mb-3"
            />
            <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  الموضع (px)
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={offsetDraft.offsetX}
                    onChange={(e) =>
                      setOffsetDraft({
                        offsetX: Number(e.target.value) || 0,
                        offsetY: offsetDraft.offsetY,
                      })
                    }
                    className="h-8 w-20 text-xs"
                    dir="ltr"
                    placeholder="X"
                  />
                  <Input
                    type="number"
                    value={offsetDraft.offsetY}
                    onChange={(e) =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX,
                        offsetY: Number(e.target.value) || 0,
                      })
                    }
                    className="h-8 w-20 text-xs"
                    dir="ltr"
                    placeholder="Y"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX,
                        offsetY: offsetDraft.offsetY - 10,
                      })
                    }
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX + 10,
                        offsetY: offsetDraft.offsetY,
                      })
                    }
                  >
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX - 10,
                        offsetY: offsetDraft.offsetY,
                      })
                    }
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX,
                        offsetY: offsetDraft.offsetY + 10,
                      })
                    }
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setOffsetDraft({ offsetX: 0, offsetY: 0 })}
                >
                  تصفير الموضع
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Upload className="w-3 h-3" />
                رفع صورة جديدة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveUrl}
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                  حفظ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="w-4 h-4 ml-2" />
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
