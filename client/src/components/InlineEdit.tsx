import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
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
import { Check, Loader2, Pencil, X, Image as ImageIcon, Upload } from "lucide-react";
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
  as?: keyof JSX.IntrinsicElements;
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
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();

  const normalizedValue = value ?? "";
  const displayValue = normalizedValue || fallback || "";
  const showPlaceholder = !normalizedValue && !!placeholder;

  useEffect(() => {
    if (isEditing) return;
    setDraft(normalizedValue);
  }, [normalizedValue, isEditing]);

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
          label: input.label,
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

  const startEditing = () => {
    if (!enabled) return;
    setDraft(normalizedValue || fallback || "");
    setIsEditing(true);
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
          category,
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
      return;
    }
    if (multiline && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  const Tag = as as keyof JSX.IntrinsicElements;

  return (
    <Tag className={cn("relative", className)}>
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn("min-h-[110px]", editorClassName)}
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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
          {multiline && (
            <div className="text-xs text-muted-foreground">
              للحفظ اضغط Ctrl + Enter
            </div>
          )}
        </div>
      ) : (
        <span
          className={cn(
            "inline-block",
            showPlaceholder ? "text-muted-foreground" : "text-inherit",
            enabled
              ? "group cursor-text rounded-md outline outline-1 outline-dashed outline-transparent hover:outline-primary/40 transition"
              : "",
            displayClassName
          )}
          onClick={(event) => {
            if (enabled) {
              event.preventDefault();
              event.stopPropagation();
            }
            startEditing();
          }}
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
          {enabled && (
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
              <Pencil className="w-3 h-3" />
              تعديل
            </span>
          )}
        </span>
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

  const normalizedValue = value ?? "";
  const displayValue = normalizedValue || fallback || "";
  const showPlaceholder = !normalizedValue && !!placeholder;

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
    <span className={cn("relative", className)}>
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
        <span
          className={cn(
            "inline-flex items-center gap-2",
            showPlaceholder ? "text-muted-foreground" : "text-inherit",
            enabled
              ? "group cursor-text rounded-md outline outline-1 outline-dashed outline-transparent hover:outline-primary/40 transition"
              : "",
            displayClassName
          )}
          onClick={(event) => {
            if (enabled) {
              event.preventDefault();
              event.stopPropagation();
            }
            setIsEditing(true);
            setDraft(normalizedValue || fallback || "");
          }}
        >
          {displayValue || placeholder || ""}
          {enabled && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
              <Pencil className="w-3 h-3" />
              تعديل
            </span>
          )}
        </span>
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
          setIsEditing(true);
          setDraft(displayValue);
        }}
      >
        {children}
      </a>
      {canEdit && !showEditButton && (
        <span className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
          <Pencil className="w-3 h-3" />
          تعديل
        </span>
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

  useEffect(() => {
    if (isEditing) return;
    setDraftUrl(src);
  }, [src, isEditing]);

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

  const handleSaveUrl = () => {
    if (!enabled || upsertMutation.isPending) return;
    if (draftUrl === src) {
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
          });
        };
        reader.readAsDataURL(file);
      },
    });
  };

  return (
    <div className={cn("relative group", className)}>
      <img src={src} alt={alt} className={imgClassName} />
      {enabled && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsEditing((prev) => !prev);
          }}
          className={cn(
            "absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100",
            overlayClassName
          )}
        >
          <ImageIcon className="w-3 h-3" />
          تعديل الصورة
        </button>
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
