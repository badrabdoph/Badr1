import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Image, 
  Package, 
  MessageSquare, 
  Upload,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Home,
  Monitor,
  Link2,
  Clock,
  Copy,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
  Undo2,
  Redo2,
  Pencil,
  ShieldCheck,
  Phone,
  Camera,
  Heart,
  Receipt,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
} from "lucide-react";
import { Link } from "wouter";
import {
  sessionPackages,
  sessionPackagesWithPrints,
  weddingPackages,
  additionalServices,
} from "@/config/siteConfig";
import { useEditHistory, type EditAction } from "@/lib/editHistory";
import { PackageCard } from "@/pages/Services";
import { servicesStyles } from "@/styles/servicesStyles";
import { parseContentValue, serializeContentValue } from "@/lib/contentMeta";
import { buildContentCatalog } from "@/lib/contentCatalog";
import { useTestimonialsData } from "@/hooks/useSiteData";

export default function Admin() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.adminAccess.status.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const loginMutation = trpc.adminAccess.login.useMutation({
    onSuccess: () => {
      utils.adminAccess.status.invalidate();
      toast.success("تم تسجيل الدخول");
    },
    onError: (error) => toast.error(error.message),
  });
  const logoutMutation = trpc.adminAccess.logout.useMutation({
    onSuccess: () => {
      utils.adminAccess.status.invalidate();
      toast.success("تم تسجيل الخروج");
    },
    onError: (error) => toast.error(error.message),
  });

  if (statusQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!statusQuery.data?.authenticated) {
    return (
      <AdminLogin
        isLoading={loginMutation.isPending}
        loginDisabled={statusQuery.data?.loginDisabled}
        envIssues={statusQuery.data?.envIssues}
        onSubmit={(username, password) => {
          loginMutation.mutate({ username, password });
        }}
      />
    );
  }

  return (
    <AdminDashboard
      onLogout={() => logoutMutation.mutate()}
      logoutPending={logoutMutation.isPending}
    />
  );
}

function AdminDashboard({
  onLogout,
  logoutPending,
}: {
  onLogout: () => void;
  logoutPending: boolean;
}) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">لوحة التحكم</h1>
            <span className="text-sm text-muted-foreground">مرحباً، المدير</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 ml-2" />
                الموقع
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              disabled={logoutPending}
            >
              {logoutPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <LogOut className="w-4 h-4 ml-2" />
              )}
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <LiveEditor />
      </main>
    </div>
  );
}

function AdminLogin({
  onSubmit,
  isLoading,
  loginDisabled,
  envIssues,
}: {
  onSubmit: (username: string, password: string) => void;
  isLoading: boolean;
  loginDisabled?: boolean;
  envIssues?: string[];
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showEnvDetails, setShowEnvDetails] = useState(false);
  const canSubmit = username.trim().length > 0 && password.length > 0;
  const showLockNotice = Boolean(loginDisabled);

  return (
    <div
      className="min-h-screen bg-background relative overflow-hidden"
      dir="rtl"
    >
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-200/20 via-amber-100/10 to-transparent blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-[-120px] h-[360px] w-[360px] rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-300/10 to-transparent blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-2">
              <Sparkles className="w-3 h-3" />
              بوابة آمنة
            </Badge>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                لوحة تحكم الموقع
                <span className="block text-muted-foreground text-lg md:text-xl font-normal mt-2">
                  دخول مُخصّص للإدارة فقط مع حماية للجلسة.
                </span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                عشان نضمن إن أي تعديلات على المحتوى تتم بأمان، محتاجين تسجيل
                دخول سريع قبل المتابعة.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  جلسة محمية
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  الجلسة بتنتهي تلقائياً عشان الأمان، وتقدر تعمل خروج بضغطة واحدة.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="w-4 h-4" />
                  دخول سريع
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  محتاج اسم مستخدم وكلمة مرور فقط بدون أي خطوات إضافية.
                </p>
              </div>
            </div>
          </div>

          <Card className="w-full max-w-md mx-auto border-border/70 bg-card/70 shadow-xl shadow-black/10 backdrop-blur">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                تسجيل الدخول
              </CardTitle>
              <CardDescription>
                أدخل بيانات الدخول للوصول إلى لوحة التحكم.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showLockNotice && (
                <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-destructive">
                      تسجيل الأدمن متوقف مؤقتًا
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowEnvDetails((prev) => !prev)}
                    >
                      {showEnvDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    لازم تضبط متغيرات البيئة في السيرفر علشان صفحة الأدمن تفتح.
                  </p>
                  {showEnvDetails && (
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <div className="font-semibold text-foreground/80">النواقص الحالية:</div>
                      <ul className="list-disc pr-4 space-y-1">
                        {(envIssues?.length ? envIssues : ["ADMIN_USER/ADMIN_PASS", "JWT_SECRET"]).map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                      <div className="font-semibold text-foreground/80">المطلوب ضبطه:</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                          ADMIN_USER
                        </span>
                        <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                          ADMIN_PASS
                        </span>
                        <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                          JWT_SECRET
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmit(username.trim(), password);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="admin-user">اسم المستخدم</Label>
                  <Input
                    id="admin-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-pass">كلمة المرور</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    autoComplete="current-password"
                  />
                </div>
                <Separator />
                <Button
                  className="w-full"
                  type="submit"
                  disabled={!canSubmit || isLoading || showLockNotice}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Lock className="w-4 h-4 ml-2" />
                  )}
                  دخول
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Portfolio Manager Component
// ============================================
type ManagerProps = {
  onRefresh?: () => void;
};

type ConfirmState = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm?: () => void;
};

function useConfirmDialog() {
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

type PositionValue = { offsetX: number; offsetY: number };

function toOffset(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function PositionControls({
  value,
  onChange,
  onSave,
  disabled,
  step = 10,
}: {
  value: PositionValue;
  onChange: (next: PositionValue) => void;
  onSave: () => void;
  disabled?: boolean;
  step?: number;
}) {
  const applyDelta = (dx: number, dy: number) => {
    onChange({ offsetX: value.offsetX + dx, offsetY: value.offsetY + dy });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Move className="w-3 h-3" />
          الموضع (px)
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value.offsetX}
            onChange={(e) => onChange({ offsetX: Number(e.target.value) || 0, offsetY: value.offsetY })}
            className="h-8 w-20 text-xs"
            dir="ltr"
            placeholder="X"
          />
          <Input
            type="number"
            value={value.offsetY}
            onChange={(e) => onChange({ offsetX: value.offsetX, offsetY: Number(e.target.value) || 0 })}
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
            disabled={disabled}
            onClick={() => applyDelta(0, -step)}
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => applyDelta(step, 0)}
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => applyDelta(-step, 0)}
          >
            <ArrowLeft className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => applyDelta(0, step)}
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" type="button" onClick={onSave} disabled={disabled}>
          حفظ الموضع
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => onChange({ offsetX: 0, offsetY: 0 })}
          disabled={disabled}
        >
          تصفير الموضع
        </Button>
      </div>
    </div>
  );
}

function PortfolioManager({ onRefresh }: ManagerProps) {
  const { data: images, refetch, isLoading } = trpc.portfolio.getAll.useQuery();
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const createMutation = trpc.portfolio.upload.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الصورة بنجاح");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.portfolio.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصورة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.portfolio.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الصورة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [newImage, setNewImage] = useState({ title: "", category: "wedding", file: null as File | null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        title: string;
        category: string;
        url: string;
        visible: boolean;
        sortOrder: number;
        offsetX: number;
        offsetY: number;
      }
    >
  >({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage({ ...newImage, file });
    }
  };

  const handleUpload = async () => {
    if (!newImage.file || !newImage.title) {
      toast.error("يرجى إدخال العنوان واختيار صورة");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await createMutation.mutateAsync({
        title: newImage.title,
        base64,
        mimeType: newImage.file!.type,
        category: newImage.category,
      });
      setNewImage({ title: "", category: "wedding", file: null });
    };
    reader.readAsDataURL(newImage.file);
  };

  const openEdit = (image: any) => {
    setEditingId(image.id);
    setDrafts((prev) => ({
      ...prev,
      [image.id]: {
        title: image.title ?? "",
        category: image.category ?? "wedding",
        url: image.url ?? "",
        visible: image.visible !== false,
        sortOrder: Number.isFinite(image.sortOrder) ? Number(image.sortOrder) : 0,
        offsetX: toOffset(image.offsetX),
        offsetY: toOffset(image.offsetY),
      },
    }));
  };

  const closeEdit = () => setEditingId(null);

  const handleUpdate = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.title || !draft.url) {
      toast.error("يرجى إدخال العنوان والرابط");
      return;
    }
    await updateMutation.mutateAsync({
      id,
      title: draft.title,
      category: draft.category,
      url: draft.url,
      visible: draft.visible,
      sortOrder: draft.sortOrder,
      offsetX: draft.offsetX,
      offsetY: draft.offsetY,
    });
    closeEdit();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const visibleImages = (images ?? []).filter((img) => img.visible !== false);
  const hiddenImages = (images ?? []).filter((img) => img.visible === false);

  const toggleImageVisibility = async (id: number, visible: boolean) => {
    await updateMutation.mutateAsync({ id, visible });
  };

  const renderImageCard = (image: any) => {
    const draft = drafts[image.id];
    const isEditing = editingId === image.id;
    const isVisible = image.visible !== false;
    return (
      <div key={image.id} className="border border-white/10 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-4">
            <img
              src={image.url}
              alt={image.title}
              className="w-16 h-16 rounded-md object-cover border border-white/10"
            />
            <div>
              <div className="font-semibold">{image.title}</div>
              <div className="text-xs text-muted-foreground">
                {image.category} • ترتيب {image.sortOrder ?? 0}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isVisible ? "secondary" : "outline"}>
              {isVisible ? "ظاهر" : "مخفي"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleImageVisibility(image.id, !isVisible)}
              disabled={updateMutation.isPending}
            >
              {isVisible ? "إخفاء" : "استعادة"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => (isEditing ? closeEdit() : openEdit(image))}>
              {isEditing ? "إغلاق" : "تعديل"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: image.id })}
            >
              حذف
            </Button>
          </div>
        </div>

        {isEditing && draft ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>عنوان الصورة</Label>
              <Input
                value={draft.title}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, title: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>تصنيف الصورة</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.category}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, category: e.target.value },
                  }))
                }
              >
                <option value="wedding">زفاف</option>
                <option value="engagement">خطوبة</option>
                <option value="outdoor">جلسات خارجية</option>
                <option value="portrait">بورتريه</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>رابط الصورة</Label>
              <Input
                value={draft.url}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, url: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>ترتيب الظهور</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, sortOrder: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <span className="text-sm">إظهار الصورة</span>
              <Switch
                checked={draft.visible}
                onCheckedChange={(value) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, visible: Boolean(value) },
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <PositionControls
                value={{ offsetX: draft.offsetX, offsetY: draft.offsetY }}
                onChange={(next) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, offsetX: next.offsetX, offsetY: next.offsetY },
                  }))
                }
                onSave={() => {
                  requestConfirm({
                    title: "تأكيد حفظ الموضع",
                    description: `حفظ موضع الصورة "${draft.title}"؟`,
                    onConfirm: async () => {
                      await updateMutation.mutateAsync({
                        id: image.id,
                        offsetX: draft.offsetX,
                        offsetY: draft.offsetY,
                      });
                    },
                  });
                }}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button onClick={() => handleUpdate(image.id)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={closeEdit}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style>{servicesStyles}</style>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة صورة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="عنوان الصورة"
              value={newImage.title}
              onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newImage.category}
              onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
            >
              <option value="wedding">زفاف</option>
              <option value="engagement">خطوبة</option>
              <option value="outdoor">جلسات خارجية</option>
              <option value="portrait">بورتريه</option>
            </select>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <Button onClick={handleUpload} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
            رفع الصورة
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            قائمة الأعمال
          </CardTitle>
          <CardDescription>عدّل عنوان الصورة، التصنيف، الرابط، والترتيب بسهولة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleImages.map(renderImageCard)}

          {visibleImages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد صور في المعرض بعد</p>
              <p className="text-sm">قم بإضافة صور جديدة من الأعلى</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            الصور المخفية
          </CardTitle>
          <CardDescription>استعد أي صورة مخفية بضغطة واحدة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hiddenImages.length > 0 ? (
            hiddenImages.map(renderImageCard)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <EyeOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد صور مخفية</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// About Manager Component
// ============================================
function AboutManager({ onRefresh }: ManagerProps) {
  const { data: content, refetch, isLoading } = trpc.siteContent.getAll.useQuery();
  const { data: images, refetch: refetchImages } = trpc.siteImages.getAll.useQuery();
  const upsertContentMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التعديلات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const upsertImageMutation = trpc.siteImages.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الصورة");
      refetchImages();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();

  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [editingMeta, setEditingMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingImages, setEditingImages] = useState<Record<string, string>>({});
  const [editingPositions, setEditingPositions] = useState<Record<string, PositionValue>>({});
  const [editingImagePositions, setEditingImagePositions] = useState<Record<string, PositionValue>>({});

  useEffect(() => {
    if (content) {
      const map: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      const positions: Record<string, PositionValue> = {};
      content.forEach((item) => {
        const parsed = parseContentValue(item.value);
        map[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      setEditingContent(map);
      setEditingMeta(meta);
      setEditingPositions(positions);
    }
  }, [content]);

  useEffect(() => {
    if (images) {
      const map: Record<string, string> = {};
      const positions: Record<string, PositionValue> = {};
      images.forEach((item) => {
        map[item.key] = item.url;
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      setEditingImages(map);
      setEditingImagePositions(positions);
    }
  }, [images]);

  const handleSave = async (key: string, label: string) => {
    const pos = editingPositions[key] ?? { offsetX: 0, offsetY: 0 };
    await upsertContentMutation.mutateAsync({
      key,
      value: serializeContentValue({
        text: editingContent[key] || "",
        hidden: editingMeta[key]?.hidden,
        scale: editingMeta[key]?.scale,
      }),
      category: "about",
      label,
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
  };

  const handleSaveImage = async (key: string, label: string) => {
    const pos = editingImagePositions[key] ?? { offsetX: 0, offsetY: 0 };
    await upsertImageMutation.mutateAsync({
      key,
      url: editingImages[key] || "",
      alt: label,
      category: "about",
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
  };

  const groups = [
    {
      title: "الهيدر",
      items: [
        { key: "about_kicker", label: "الشريط العلوي", multiline: false },
        { key: "about_title", label: "العنوان الرئيسي", multiline: false },
        { key: "about_description", label: "الوصف الرئيسي", multiline: true },
        { key: "about_cta_primary", label: "زر احجز الآن", multiline: false },
        { key: "about_cta_secondary", label: "زر الأسعار والباقات", multiline: false },
      ],
    },
    {
      title: "قسم القصة",
      items: [
        { key: "about_subtitle", label: "العنوان الفرعي", multiline: false },
        { key: "about_story_title", label: "عنوان القصة", multiline: false },
        { key: "about_story_description", label: "وصف القصة", multiline: true },
      ],
    },
    {
      title: "الإحصائيات",
      items: [
        { key: "about_stat_1_number", label: "رقم الإحصائية 1", multiline: false },
        { key: "about_stat_1_label", label: "عنوان الإحصائية 1", multiline: false },
        { key: "about_stat_2_number", label: "رقم الإحصائية 2", multiline: false },
        { key: "about_stat_2_label", label: "عنوان الإحصائية 2", multiline: false },
        { key: "about_stat_3_number", label: "رقم الإحصائية 3", multiline: false },
        { key: "about_stat_3_label", label: "عنوان الإحصائية 3", multiline: false },
      ],
    },
    {
      title: "زر المعرض",
      items: [{ key: "about_portfolio_link", label: "نص زر المعرض", multiline: false }],
    },
    {
      title: "قسم المميزات",
      items: [
        { key: "about_features_kicker", label: "العنوان الصغير", multiline: false },
        { key: "about_features_title", label: "العنوان الرئيسي", multiline: false },
        { key: "about_features_desc", label: "الوصف", multiline: true },
        { key: "about_feature_1_title", label: "ميزة 1 - عنوان", multiline: false },
        { key: "about_feature_1_desc", label: "ميزة 1 - وصف", multiline: true },
        { key: "about_feature_2_title", label: "ميزة 2 - عنوان", multiline: false },
        { key: "about_feature_2_desc", label: "ميزة 2 - وصف", multiline: true },
        { key: "about_feature_3_title", label: "ميزة 3 - عنوان", multiline: false },
        { key: "about_feature_3_desc", label: "ميزة 3 - وصف", multiline: true },
      ],
    },
    {
      title: "آراء العملاء",
      items: [
        { key: "about_testimonials_kicker", label: "العنوان الصغير", multiline: false },
        { key: "about_testimonials_title", label: "العنوان الرئيسي", multiline: false },
        { key: "about_testimonial_1_quote", label: "رأي 1 - النص", multiline: true },
        { key: "about_testimonial_1_name", label: "رأي 1 - الاسم", multiline: false },
        { key: "about_testimonial_2_quote", label: "رأي 2 - النص", multiline: true },
        { key: "about_testimonial_2_name", label: "رأي 2 - الاسم", multiline: false },
      ],
    },
    {
      title: "دعوة للتواصل",
      items: [
        { key: "about_cta_title", label: "العنوان", multiline: true },
        { key: "about_cta_desc", label: "الوصف", multiline: true },
        { key: "about_cta_primary_contact", label: "زر تواصل الآن", multiline: false },
        { key: "about_cta_secondary_packages", label: "زر شوف الباقات", multiline: false },
      ],
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>صفحة من أنا</CardTitle>
          <CardDescription>تعديل محتوى صفحة من أنا بالكامل من هنا.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>صورة من أنا</Label>
            <div className="flex gap-2">
              <Input
                value={editingImages.aboutImage || ""}
                onChange={(e) => setEditingImages({ ...editingImages, aboutImage: e.target.value })}
                placeholder="رابط الصورة"
                dir="ltr"
              />
              <Button
                size="icon"
                onClick={() => handleSaveImage("aboutImage", "صورة من أنا")}
                disabled={upsertImageMutation.isPending}
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
            <PositionControls
              value={editingImagePositions.aboutImage ?? { offsetX: 0, offsetY: 0 }}
              onChange={(next) =>
                setEditingImagePositions((prev) => ({ ...prev, aboutImage: next }))
              }
              onSave={() =>
                requestConfirm({
                  title: "تأكيد حفظ الموضع",
                  description: "حفظ موضع صورة من أنا؟",
                  onConfirm: () => handleSaveImage("aboutImage", "صورة من أنا"),
                })
              }
              disabled={upsertImageMutation.isPending}
            />
          </div>

          {groups.map((group, idx) => (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold">{group.title}</h4>
                {idx > 0 ? <Separator className="flex-1" /> : null}
              </div>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <div className="flex gap-2">
                      {item.multiline ? (
                        <Textarea
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                          rows={2}
                        />
                      ) : (
                        <Input
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                        />
                      )}
                      <Button
                        size="icon"
                        onClick={() => handleSave(item.key, item.label)}
                        disabled={upsertContentMutation.isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <PositionControls
                      value={editingPositions[item.key] ?? { offsetX: 0, offsetY: 0 }}
                      onChange={(next) =>
                        setEditingPositions((prev) => ({ ...prev, [item.key]: next }))
                      }
                      onSave={() =>
                        requestConfirm({
                          title: "تأكيد حفظ الموضع",
                          description: `حفظ موضع "${item.label}"؟`,
                          onConfirm: () => handleSave(item.key, item.label),
                        })
                      }
                      disabled={upsertContentMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Content Manager Component
// ============================================
function ContentManager({ onRefresh }: ManagerProps) {
  const { data: content, refetch, isLoading } = trpc.siteContent.getAll.useQuery();
  const { data: packagesData } = trpc.packages.getAll.useQuery();
  const testimonials = useTestimonialsData();
  const upsertMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();

  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [editingMeta, setEditingMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingPositions, setEditingPositions] = useState<Record<string, PositionValue>>({});

  const fallbackPackages = useMemo(
    () => [
      ...sessionPackages.map((pkg) => ({ ...pkg, category: "session" })),
      ...sessionPackagesWithPrints.map((pkg) => ({ ...pkg, category: "prints" })),
      ...weddingPackages.map((pkg) => ({ ...pkg, category: "wedding" })),
      ...additionalServices.map((pkg) => ({ ...pkg, category: "addon" })),
    ],
    []
  );

  const packageList = useMemo(() => {
    if (packagesData && packagesData.length) return packagesData as any[];
    return fallbackPackages;
  }, [packagesData, fallbackPackages]);

  const catalog = useMemo(
    () => buildContentCatalog({ packages: packageList, testimonials }),
    [packageList, testimonials]
  );

  useEffect(() => {
    if (content) {
      const contentMap: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      const positions: Record<string, PositionValue> = {};
      content.forEach((item) => {
        const parsed = parseContentValue(item.value);
        contentMap[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      const mergedContent = { ...catalog.fallbackMap, ...contentMap };
      setEditingContent(mergedContent);
      setEditingMeta(meta);
      setEditingPositions(positions);
    }
  }, [content, catalog.fallbackMap]);

  const handleSave = async (key: string, category: string, label?: string) => {
    const pos = editingPositions[key] ?? { offsetX: 0, offsetY: 0 };
    await upsertMutation.mutateAsync({
      key,
      value: serializeContentValue({
        text: editingContent[key] || "",
        hidden: editingMeta[key]?.hidden,
        scale: editingMeta[key]?.scale,
      }),
      category,
      label,
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
  };

  const [searchTerm, setSearchTerm] = useState("");

  const categoryOrder = [
    "home",
    "services",
    "about",
    "contact",
    "portfolio",
    "share",
    "cta",
    "nav",
    "footer",
    "shared",
  ];
  const categoryLabels: Record<string, string> = {
    home: "الصفحة الرئيسية",
    services: "صفحة الخدمات",
    about: "صفحة من أنا",
    contact: "صفحة التواصل",
    portfolio: "صفحة الأعمال",
    share: "صفحة المشاركة",
    cta: "الدعوة للتواصل",
    nav: "القائمة العلوية",
    footer: "التذييل",
    shared: "نصوص عامة",
  };

  const items = useMemo(() => {
    const contentList = content ?? [];
    const metaByKey = new Map<string, { label?: string; category?: string }>();
    contentList.forEach((item: any) => {
      metaByKey.set(item.key, { label: item.label, category: item.category });
    });

    const catalogItems = catalog.items;
    const catalogKeys = new Set(catalogItems.map((item) => item.key));
    const extraItems = contentList
      .filter((item: any) => !catalogKeys.has(item.key))
      .map((item: any) => ({
        key: item.key,
        label: item.label ?? item.key,
        category: item.category ?? "shared",
      }));

    return [...catalogItems, ...extraItems].map((item) => {
      const meta = metaByKey.get(item.key);
      return {
        key: item.key,
        label: meta?.label ?? item.label ?? item.key,
        category: meta?.category ?? item.category ?? "shared",
      };
    });
  }, [content, catalog.items]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedSearch) return true;
    return (
      item.key.toLowerCase().includes(normalizedSearch) ||
      item.label.toLowerCase().includes(normalizedSearch)
    );
  });

  const groupedItems = useMemo(() => {
    const buckets: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item) => {
      if (!buckets[item.category]) buckets[item.category] = [];
      buckets[item.category].push(item);
    });
    const extra = Object.keys(buckets).filter((key) => !categoryOrder.includes(key)).sort();
    const ordered = [...categoryOrder, ...extra];
    return ordered
      .filter((key) => buckets[key]?.length)
      .map((key) => ({
        key,
        label: categoryLabels[key] ?? key,
        items: buckets[key].sort((a, b) => a.label.localeCompare(b.label, "ar")),
      }));
  }, [filteredItems, categoryOrder, categoryLabels]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تعديل النصوص</CardTitle>
          <CardDescription>كل نصوص الموقع المسجلة في خانات قابلة للتعديل والحفظ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو المفتاح..."
              className="max-w-sm"
            />
            <Badge variant="secondary" className="text-xs">
              {filteredItems.length} نص
            </Badge>
          </div>

          {groupedItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              لا توجد نصوص مطابقة للبحث الحالي.
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.key} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold">{group.label}</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.key} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Label>{item.label}</Label>
                        <span className="text-xs text-muted-foreground">{item.key}</span>
                        {editingMeta[item.key]?.hidden ? (
                          <Badge variant="outline" className="text-[10px]">
                            مخفي
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Textarea
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                          placeholder={item.label}
                          rows={2}
                        />
                        <Button
                          size="icon"
                          onClick={() => handleSave(item.key, item.category, item.label)}
                          disabled={upsertMutation.isPending}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                      <PositionControls
                        value={editingPositions[item.key] ?? { offsetX: 0, offsetY: 0 }}
                        onChange={(next) =>
                          setEditingPositions((prev) => ({ ...prev, [item.key]: next }))
                        }
                        onSave={() =>
                          requestConfirm({
                            title: "تأكيد حفظ الموضع",
                            description: `حفظ موضع "${item.label}"؟`,
                            onConfirm: () => handleSave(item.key, item.category, item.label),
                          })
                        }
                        disabled={upsertMutation.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Packages Manager Component
// ============================================
function PackagesManager({ onRefresh }: ManagerProps) {
  const { data: packages, refetch, isLoading } = trpc.packages.getAll.useQuery();
  const { data: content } = trpc.siteContent.getAll.useQuery();
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const createMutation = trpc.packages.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الباقة");
      refetch();
      onRefresh?.();
      setNewPackage({ name: "", price: "", description: "", category: "session", features: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.packages.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الباقة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.packages.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الباقة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [newPackage, setNewPackage] = useState({
    name: "",
    price: "",
    description: "",
    category: "session",
    features: "",
  });
  const [seedBusy, setSeedBusy] = useState(false);
  const seedAttempted = useRef(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        name: string;
        price: string;
        description: string;
        category: string;
        features: string;
        popular: boolean;
        visible: boolean;
        sortOrder: number;
        offsetX: number;
        offsetY: number;
      }
    >
  >({});

  const handleCreate = async () => {
    if (!newPackage.name || !newPackage.price) {
      toast.error("يرجى إدخال اسم الباقة والسعر");
      return;
    }
    await createMutation.mutateAsync({
      name: newPackage.name,
      price: newPackage.price,
      description: newPackage.description,
      category: newPackage.category,
      features: newPackage.features.split("\n").filter(Boolean),
    });
  };

  const seedDefaults = async () => {
    if (seedBusy) return;
    setSeedBusy(true);
    try {
      const defaults = [
        ...sessionPackages.map((p) => ({ ...p, category: "session" })),
        ...sessionPackagesWithPrints.map((p) => ({ ...p, category: "prints" })),
        ...weddingPackages.map((p) => ({ ...p, category: "wedding" })),
        ...additionalServices.map((p) => ({ ...p, category: "addon" })),
      ];
      let order = 1;
      for (const pkg of defaults) {
        await createMutation.mutateAsync({
          name: pkg.name,
          price: String(pkg.price ?? ""),
          description: pkg.description ?? "",
          features: Array.isArray(pkg.features) ? pkg.features : [],
          category: pkg.category as string,
          popular: Boolean(pkg.popular),
          visible: true,
          sortOrder: order,
        });
        order += 1;
      }
      toast.success("تم تجهيز الباقات الافتراضية");
      refetch();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message ?? "تعذر تجهيز الباقات");
    } finally {
      setSeedBusy(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (seedAttempted.current) return;
    if ((packages ?? []).length === 0) {
      seedAttempted.current = true;
      seedDefaults();
    }
  }, [isLoading, packages]);

  const openEdit = (pkg: any) => {
    setEditingId(pkg.id);
    setDrafts((prev) => ({
      ...prev,
      [pkg.id]: {
        name: pkg.name ?? "",
        price: pkg.price ?? "",
        description: pkg.description ?? "",
        category: pkg.category ?? "session",
        features: Array.isArray(pkg.features) ? pkg.features.join("\n") : "",
        popular: Boolean(pkg.popular),
        visible: pkg.visible !== false,
        sortOrder: Number.isFinite(pkg.sortOrder) ? Number(pkg.sortOrder) : 0,
        offsetX: toOffset(pkg.offsetX),
        offsetY: toOffset(pkg.offsetY),
      },
    }));
  };

  const closeEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.name || !draft.price) {
      toast.error("يرجى إدخال اسم الباقة والسعر");
      return;
    }
    await updateMutation.mutateAsync({
      id,
      name: draft.name,
      price: draft.price,
      description: draft.description,
      category: draft.category,
      features: draft.features.split("\n").filter(Boolean),
      popular: draft.popular,
      visible: draft.visible,
      sortOrder: draft.sortOrder,
      offsetX: draft.offsetX,
      offsetY: draft.offsetY,
    });
    closeEdit();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const contentMap = (content ?? []).reduce<Record<string, string>>((acc, item: any) => {
    const parsed = parseContentValue(item.value);
    acc[item.key] = parsed.hidden ? "" : parsed.text;
    return acc;
  }, {});
  const categoryLabel: Record<string, string> = {
    session: contentMap.services_sessions_title || "جلسات التصوير",
    prints: contentMap.services_prints_title || "المطبوعات",
    wedding: contentMap.services_wedding_title || "Full Day",
    addon: contentMap.services_addons_title || "إضافات",
  };
  const visiblePackages = (packages ?? []).filter((pkg) => pkg.visible !== false);
  const hiddenPackages = (packages ?? []).filter((pkg) => pkg.visible === false);
  const sortByOrder = (list: any[]) =>
    [...list].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
  const categoryOrder = [
    { id: "session", label: categoryLabel.session },
    { id: "wedding", label: categoryLabel.wedding },
    { id: "addon", label: categoryLabel.addon },
    { id: "prints", label: categoryLabel.prints },
  ];
  const visibleByCategory = {
    session: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "session")),
    wedding: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "wedding")),
    addon: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "addon")),
    prints: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "prints")),
  };
  const hiddenByCategory = {
    session: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "session")),
    wedding: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "wedding")),
    addon: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "addon")),
    prints: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "prints")),
  };

  const togglePackageVisibility = async (pkgId: number, visible: boolean) => {
    await updateMutation.mutateAsync({ id: pkgId, visible });
  };

  const changePackageOrder = async (pkg: any, delta: number) => {
    const current = Number.isFinite(pkg.sortOrder) ? Number(pkg.sortOrder) : 0;
    const next = Math.max(0, current + delta);
    await updateMutation.mutateAsync({ id: pkg.id, sortOrder: next });
  };

  const renderPackageCard = (pkg: any) => {
    const draft = drafts[pkg.id];
    const isEditing = editingId === pkg.id;
    const isVisible = pkg.visible !== false;
    const previewKind =
      pkg.category === "wedding"
        ? "wedding"
        : pkg.category === "prints"
        ? "prints"
        : pkg.category === "addon"
        ? "addon"
        : "session";
    return (
      <div key={pkg.id} className="border border-white/10 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{pkg.name}</div>
            <div className="text-sm text-muted-foreground">
              {pkg.price} • {categoryLabel[pkg.category ?? "session"]} • ترتيب #{pkg.sortOrder ?? 0}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => changePackageOrder(pkg, -1)}
              disabled={updateMutation.isPending}
              title="تقديم"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => changePackageOrder(pkg, 1)}
              disabled={updateMutation.isPending}
              title="تأخير"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Badge variant={isVisible ? "secondary" : "outline"}>
              {isVisible ? "ظاهر" : "مخفي"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => togglePackageVisibility(pkg.id, !isVisible)}
              disabled={updateMutation.isPending}
            >
              {isVisible ? "إخفاء" : "استعادة"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => (isEditing ? closeEdit() : openEdit(pkg))}
            >
              {isEditing ? "إغلاق" : "تعديل"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: pkg.id })}
            >
              حذف
            </Button>
          </div>
        </div>

        {!isEditing ? (
          <div className="admin-package-preview">
            <PackageCard
              pkg={pkg as any}
              kind={previewKind as any}
              whatsappNumber={undefined}
              contentMap={contentMap}
            />
          </div>
        ) : null}

        {isEditing && draft ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الباقة</Label>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, name: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>السعر</Label>
              <Input
                value={draft.price}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, price: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <select
                value={draft.category}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, category: e.target.value },
                  }))
                }
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="session">جلسات التصوير</option>
                <option value="prints">المطبوعات</option>
                <option value="wedding">Full Day</option>
                <option value="addon">إضافات</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>ترتيب الظهور</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, sortOrder: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={draft.description}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, description: e.target.value },
                  }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>المميزات (كل ميزة في سطر)</Label>
              <Textarea
                value={draft.features}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, features: e.target.value },
                  }))
                }
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pkg.id]: {
                        ...draft,
                        features: draft.features ? `${draft.features}\n` : "",
                      },
                    }))
                  }
                >
                  إضافة سطر
                </Button>
                <span className="text-xs text-muted-foreground">
                  كل سطر يظهر كبند داخل الكارت بنفس التصميم.
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm">مميزة (Popular)</span>
                <Switch
                  checked={draft.popular}
                  onCheckedChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pkg.id]: { ...draft, popular: Boolean(value) },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm">إظهار الباقة</span>
                <Switch
                  checked={draft.visible}
                  onCheckedChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pkg.id]: { ...draft, visible: Boolean(value) },
                    }))
                  }
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <PositionControls
                value={{ offsetX: draft.offsetX, offsetY: draft.offsetY }}
                onChange={(next) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, offsetX: next.offsetX, offsetY: next.offsetY },
                  }))
                }
                onSave={() =>
                  requestConfirm({
                    title: "تأكيد حفظ الموضع",
                    description: `حفظ موضع الباقة "${draft.name}"؟`,
                    onConfirm: async () => {
                      await updateMutation.mutateAsync({
                        id: pkg.id,
                        offsetX: draft.offsetX,
                        offsetY: draft.offsetY,
                      });
                    },
                  })
                }
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                onClick={() => handleUpdate(pkg.id)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={closeEdit}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة باقة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="اسم الباقة"
              value={newPackage.name}
              onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
            />
            <Input
              placeholder="السعر (مثال: $500)"
              value={newPackage.price}
              onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تصنيف الباقة</Label>
              <select
                value={newPackage.category}
                onChange={(e) => setNewPackage({ ...newPackage, category: e.target.value })}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="session">جلسات التصوير</option>
                <option value="prints">المطبوعات</option>
                <option value="wedding">Full Day</option>
                <option value="addon">إضافات</option>
              </select>
            </div>
          </div>
          <Textarea
            placeholder="وصف الباقة"
            value={newPackage.description}
            onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
          />
          <Textarea
            placeholder="المميزات (كل ميزة في سطر جديد)"
            value={newPackage.features}
            onChange={(e) => setNewPackage({ ...newPackage, features: e.target.value })}
            rows={4}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() =>
                setNewPackage((prev) => ({
                  ...prev,
                  features: prev.features ? `${prev.features}\n` : "",
                }))
              }
            >
              إضافة سطر
            </Button>
            <span className="text-xs text-muted-foreground">
              كل سطر يظهر كبند داخل الكارت بنفس التصميم.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={seedDefaults}
              disabled={seedBusy}
            >
              {seedBusy ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Package className="w-4 h-4 ml-2" />}
              تجهيز الباقات الافتراضية
            </Button>
            <span className="text-xs text-muted-foreground">
              لو القائمة فاضية، الزر ده يضيف الباقات الافتراضية تلقائياً.
            </span>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
            إضافة الباقة
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            قائمة الباقات
          </CardTitle>
          <CardDescription>عدّل الباقات مباشرة، أو غيّر الترتيب والظهور.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {categoryOrder.map((category) => {
            const list = (visibleByCategory as any)[category.id] ?? [];
            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold">{category.label}</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                  {list.length > 0 ? (
                    list.map(renderPackageCard)
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      لا توجد باقات في هذا القسم حالياً.
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {visiblePackages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد باقات بعد</p>
              <p className="text-xs mt-2">سيتم تجهيز الباقات الافتراضية تلقائياً.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            الباقات المخفية
          </CardTitle>
          <CardDescription>يمكنك استعادة أي باقة مخفية بضغطة واحدة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {categoryOrder.map((category) => {
            const list = (hiddenByCategory as any)[category.id] ?? [];
            if (!list.length) return null;
            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold">{category.label}</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">{list.map(renderPackageCard)}</div>
              </div>
            );
          })}

          {hiddenPackages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <EyeOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد باقات مخفية</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Testimonials Manager Component
// ============================================
function TestimonialsManager({ onRefresh, compact }: ManagerProps & { compact?: boolean }) {
  const { data: testimonials, refetch, isLoading } = trpc.testimonials.getAll.useQuery();
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const createMutation = trpc.testimonials.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الرأي");
      refetch();
      onRefresh?.();
      setNewTestimonial({ name: "", quote: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.testimonials.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الرأي");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.testimonials.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الرأي");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [newTestimonial, setNewTestimonial] = useState({ name: "", quote: "" });
  const [positionDrafts, setPositionDrafts] = useState<Record<number, PositionValue>>({});

  useEffect(() => {
    if (testimonials) {
      const next: Record<number, PositionValue> = {};
      testimonials.forEach((item: any) => {
        next[item.id] = {
          offsetX: toOffset(item.offsetX),
          offsetY: toOffset(item.offsetY),
        };
      });
      setPositionDrafts(next);
    }
  }, [testimonials]);

  const handleCreate = async () => {
    if (!newTestimonial.name || !newTestimonial.quote) {
      toast.error("يرجى إدخال الاسم والرأي");
      return;
    }
    await createMutation.mutateAsync(newTestimonial);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const visibleTestimonials = (testimonials ?? []).filter((t) => t.visible !== false);
  const hiddenTestimonials = (testimonials ?? []).filter((t) => t.visible === false);

  const toggleTestimonialVisibility = async (id: number, visible: boolean) => {
    await updateMutation.mutateAsync({ id, visible });
  };

  const renderTestimonial = (testimonial: any) => {
    const isVisible = testimonial.visible !== false;
    if (compact) {
      return (
        <div key={testimonial.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm italic text-muted-foreground">"{testimonial.quote}"</p>
              <p className="mt-2 text-sm font-semibold">- {testimonial.name}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toggleTestimonialVisibility(testimonial.id, !isVisible)}
              >
                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate({ id: testimonial.id })}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Card key={testimonial.id}>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <p className="text-lg italic mb-4">"{testimonial.quote}"</p>
              <p className="font-semibold">- {testimonial.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleTestimonialVisibility(testimonial.id, !isVisible)}
              >
                {isVisible ? "إخفاء" : "استعادة"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate({ id: testimonial.id })}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <PositionControls
              value={positionDrafts[testimonial.id] ?? { offsetX: 0, offsetY: 0 }}
              onChange={(next) =>
                setPositionDrafts((prev) => ({ ...prev, [testimonial.id]: next }))
              }
              onSave={() =>
                requestConfirm({
                  title: "تأكيد حفظ الموضع",
                  description: `حفظ موضع رأي "${testimonial.name}"؟`,
                  onConfirm: async () => {
                    const pos = positionDrafts[testimonial.id] ?? { offsetX: 0, offsetY: 0 };
                    await updateMutation.mutateAsync({
                      id: testimonial.id,
                      offsetX: pos.offsetX,
                      offsetY: pos.offsetY,
                    });
                  },
                })
              }
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const addForm = (
    <div className="space-y-4">
      <Input
        placeholder="اسم العميل"
        value={newTestimonial.name}
        onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
      />
      <Textarea
        placeholder="رأي العميل"
        value={newTestimonial.quote}
        onChange={(e) => setNewTestimonial({ ...newTestimonial, quote: e.target.value })}
        rows={3}
      />
      <Button onClick={handleCreate} disabled={createMutation.isPending} className={compact ? "w-full" : ""}>
        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
        إضافة الرأي
      </Button>
    </div>
  );

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {compact ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Plus className="w-4 h-4" />
            إضافة رأي عميل
          </div>
          {addForm}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إضافة رأي عميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addForm}
          </CardContent>
        </Card>
      )}

      <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        {visibleTestimonials.map(renderTestimonial)}
      </div>

      {visibleTestimonials.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد آراء عملاء بعد</p>
        </div>
      )}

      {hiddenTestimonials.length > 0 ? (
        <div className={compact ? "flex items-center gap-2 text-xs text-muted-foreground" : "flex items-center gap-2 text-sm text-muted-foreground"}>
          <EyeOff className="w-4 h-4" />
          آراء مخفية (يمكن الاستعادة)
        </div>
      ) : null}

      <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        {hiddenTestimonials.map(renderTestimonial)}
      </div>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Contact Manager Component
// ============================================
function ContactManager({ onRefresh }: ManagerProps) {
  const { data: contactInfo, refetch, isLoading } = trpc.contactInfo.getAll.useQuery();
  const { data: content, refetch: refetchContent } = trpc.siteContent.getAll.useQuery();
  const contactInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const upsertContactMutation = trpc.contactInfo.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const upsertContentMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ النصوص");
      refetchContent();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [editingContact, setEditingContact] = useState<Record<string, string>>({});
  const [editingContactMeta, setEditingContactMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [editingMeta, setEditingMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingPositions, setEditingPositions] = useState<Record<string, PositionValue>>({});

  useEffect(() => {
    if (contactInfo) {
      const contactMap: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      contactInfo.forEach((item) => {
        const parsed = parseContentValue(item.value);
        contactMap[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
      });
      setEditingContact(contactMap);
      setEditingContactMeta(meta);
    }
  }, [contactInfo]);

  useEffect(() => {
    if (content) {
      const contentMap: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      const positions: Record<string, PositionValue> = {};
      content.forEach((item) => {
        const parsed = parseContentValue(item.value);
        contentMap[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      setEditingContent(contentMap);
      setEditingMeta(meta);
      setEditingPositions(positions);
    }
  }, [content]);

  const handleSaveContact = async (key: string, label: string) => {
    await upsertContactMutation.mutateAsync({
      key,
      value: serializeContentValue({
        text: editingContact[key] || "",
        hidden: editingContactMeta[key]?.hidden,
        scale: editingContactMeta[key]?.scale,
      }),
      label,
    });
  };

  const handleSaveContent = async (key: string, label: string) => {
    const pos = editingPositions[key] ?? { offsetX: 0, offsetY: 0 };
    await upsertContentMutation.mutateAsync({
      key,
      value: serializeContentValue({
        text: editingContent[key] || "",
        hidden: editingMeta[key]?.hidden,
        scale: editingMeta[key]?.scale,
      }),
      category: "contact",
      label,
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
  };

  const focusContactField = (key: string) => {
    const el = contactInputRefs.current[key];
    if (!el) return;
    el.focus();
    el.select();
  };

  const contactFields = [
    { key: "phone", label: "رقم الهاتف" },
    { key: "whatsapp", label: "رقم الواتساب" },
    { key: "email", label: "البريد الإلكتروني" },
    { key: "location", label: "الموقع" },
    { key: "instagram", label: "رابط إنستجرام" },
    { key: "facebook", label: "رابط فيسبوك" },
    { key: "tiktok", label: "رابط تيك توك" },
  ];

  const textGroups = [
    {
      title: "الهيدر",
      items: [
        { key: "contact_kicker", label: "الشريط العلوي", multiline: false },
        { key: "contact_title", label: "العنوان الرئيسي", multiline: false },
        { key: "contact_subtitle", label: "الوصف", multiline: true },
      ],
    },
    {
      title: "الأزرار السريعة",
      items: [
        { key: "contact_quick_whatsapp", label: "زر واتساب سريع", multiline: false },
        { key: "contact_quick_call", label: "زر مكالمة سريع", multiline: false },
      ],
    },
    {
      title: "نموذج التواصل",
      items: [
        { key: "contact_form_title", label: "عنوان النموذج", multiline: false },
        { key: "contact_label_name", label: "تسمية الاسم", multiline: false },
        { key: "contact_placeholder_name", label: "Placeholder الاسم", multiline: false },
        { key: "contact_label_date", label: "تسمية التاريخ", multiline: false },
        { key: "contact_label_package", label: "تسمية الباقة", multiline: false },
        { key: "contact_placeholder_package", label: "Placeholder الباقة", multiline: false },
        { key: "contact_label_phone", label: "تسمية الهاتف", multiline: false },
        { key: "contact_placeholder_phone", label: "Placeholder الهاتف", multiline: false },
        { key: "contact_label_price", label: "تسمية السعر", multiline: false },
        { key: "contact_placeholder_price", label: "Placeholder السعر", multiline: false },
        { key: "contact_label_addons", label: "تسمية الإضافات", multiline: false },
        { key: "contact_addons_placeholder", label: "Placeholder الإضافات", multiline: false },
        { key: "contact_addons_empty", label: "نص الإضافات الفارغ", multiline: false },
        { key: "contact_label_prints", label: "تسمية المطبوعات", multiline: false },
        { key: "contact_prints_placeholder", label: "Placeholder المطبوعات", multiline: false },
        { key: "contact_prints_empty", label: "نص المطبوعات الفارغ", multiline: false },
        { key: "contact_reset_button", label: "زر إلغاء الاختيارات", multiline: false },
      ],
    },
    {
      title: "تنبيهات الحجز",
      items: [
        { key: "services_vip_line_1", label: "تنبيه حجز اليوم", multiline: true },
        { key: "services_vip_line_2", label: "تنبيه الأسعار النهائية", multiline: true },
      ],
    },
    {
      title: "الإيصال",
      items: [
        { key: "contact_receipt_title", label: "عنوان الإيصال", multiline: false },
        { key: "contact_receipt_heading", label: "عنوان قسم الإيصال", multiline: false },
        { key: "contact_receipt_copy", label: "زر نسخ الإيصال", multiline: false },
        { key: "contact_receipt_label_name", label: "حقل الاسم", multiline: false },
        { key: "contact_receipt_label_phone", label: "حقل الهاتف", multiline: false },
        { key: "contact_receipt_label_date", label: "حقل التاريخ", multiline: false },
        { key: "contact_receipt_label_package", label: "حقل الباقة", multiline: false },
        { key: "contact_receipt_label_addons", label: "حقل الإضافات", multiline: false },
        { key: "contact_receipt_label_prints", label: "حقل المطبوعات", multiline: false },
        { key: "contact_receipt_label_total", label: "حقل الإجمالي", multiline: false },
        { key: "contact_receipt_empty", label: "قيمة فارغة", multiline: false },
        { key: "contact_submit_button", label: "زر تأكيد الحجز", multiline: false },
        { key: "contact_submit_helper", label: "تنبيه تأكيد الحجز", multiline: true },
      ],
    },
    {
      title: "معلومات التواصل",
      items: [
        { key: "contact_info_title", label: "عنوان معلومات التواصل", multiline: false },
        { key: "contact_info_desc", label: "وصف معلومات التواصل", multiline: true },
        { key: "contact_info_phone_label", label: "عنوان الهاتف", multiline: false },
        { key: "contact_info_whatsapp_label", label: "عنوان واتساب", multiline: false },
        { key: "contact_info_email_label", label: "عنوان البريد", multiline: false },
        { key: "contact_info_location_label", label: "عنوان الموقع", multiline: false },
      ],
    },
    {
      title: "السوشيال",
      items: [
        { key: "contact_follow_title", label: "عنوان تابعنا", multiline: false },
        { key: "contact_floating_label", label: "زر واتساب العائم", multiline: false },
      ],
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>معلومات التواصل</CardTitle>
          <CardDescription>قم بتحديث معلومات التواصل وروابط السوشيال ميديا</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contactFields.map((field) => (
            <div key={field.key} className="flex gap-2 items-center">
              <Label className="w-32 shrink-0">{field.label}</Label>
              <Input
                value={editingContact[field.key] || ""}
                onChange={(e) => setEditingContact({ ...editingContact, [field.key]: e.target.value })}
                placeholder={field.label}
                dir="ltr"
                ref={(el) => {
                  contactInputRefs.current[field.key] = el;
                }}
              />
              <Button
                size="icon"
                variant="secondary"
                onClick={() => focusContactField(field.key)}
                aria-label={`تعديل ${field.label}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => handleSaveContact(field.key, field.label)}
                disabled={upsertContactMutation.isPending}
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>نصوص صفحة تواصل معي</CardTitle>
          <CardDescription>تعديل جميع النصوص والعناوين داخل صفحة التواصل.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {textGroups.map((group, idx) => (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold">{group.title}</h4>
                {idx > 0 ? <Separator className="flex-1" /> : null}
              </div>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <div className="flex gap-2">
                      {item.multiline ? (
                        <Textarea
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                          rows={2}
                        />
                      ) : (
                        <Input
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                        />
                      )}
                      <Button
                        size="icon"
                        onClick={() => handleSaveContent(item.key, item.label)}
                        disabled={upsertContentMutation.isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <PositionControls
                      value={editingPositions[item.key] ?? { offsetX: 0, offsetY: 0 }}
                      onChange={(next) =>
                        setEditingPositions((prev) => ({ ...prev, [item.key]: next }))
                      }
                      onSave={() =>
                        requestConfirm({
                          title: "تأكيد حفظ الموضع",
                          description: `حفظ موضع "${item.label}"؟`,
                          onConfirm: () => handleSaveContent(item.key, item.label),
                        })
                      }
                      disabled={upsertContentMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Sections Manager Component
// ============================================
function SectionsManager({ onRefresh }: ManagerProps) {
  const { data: sections, refetch, isLoading } = trpc.sections.getAll.useQuery();
  const upsertMutation = trpc.sections.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const toggleMutation = trpc.sections.toggleVisibility.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  // Initialize default sections if empty
  useEffect(() => {
    if (sections && sections.length === 0) {
      const defaultSections = [
        { key: "hero", name: "القسم الرئيسي (Hero)", page: "home", sortOrder: 1 },
        { key: "about_preview", name: "قسم من أنا", page: "home", sortOrder: 2 },
        { key: "portfolio_preview", name: "معرض الأعمال", page: "home", sortOrder: 3 },
        { key: "services_preview", name: "الخدمات", page: "home", sortOrder: 4 },
        { key: "testimonials", name: "آراء العملاء", page: "home", sortOrder: 5 },
        { key: "cta", name: "قسم الدعوة للتواصل", page: "home", sortOrder: 6 },
      ];
      defaultSections.forEach((section) => {
        upsertMutation.mutate({ ...section, visible: true });
      });
    }
  }, [sections]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const defaultSections = [
    { key: "hero", name: "القسم الرئيسي (Hero)", page: "home" },
    { key: "about_preview", name: "قسم من أنا", page: "home" },
    { key: "portfolio_preview", name: "معرض الأعمال", page: "home" },
    { key: "services_preview", name: "الخدمات", page: "home" },
    { key: "testimonials", name: "آراء العملاء", page: "home" },
    { key: "cta", name: "قسم الدعوة للتواصل", page: "home" },
  ];

  const getSectionVisibility = (key: string) => {
    const section = sections?.find((s) => s.key === key);
    return section?.visible ?? true;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إدارة الأقسام</CardTitle>
          <CardDescription>تحكم في إظهار أو إخفاء أقسام الموقع</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {defaultSections.map((section) => (
            <div key={section.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{section.name}</p>
                <p className="text-sm text-muted-foreground">الصفحة: {section.page === "home" ? "الرئيسية" : section.page}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={section.key} className="text-sm">
                  {getSectionVisibility(section.key) ? "ظاهر" : "مخفي"}
                </Label>
                <Switch
                  id={section.key}
                  checked={getSectionVisibility(section.key)}
                  onCheckedChange={(checked) => {
                    toggleMutation.mutate({ key: section.key, visible: checked });
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Share Links Manager Component
// ============================================
type ShareLinkItem = {
  code: string;
  expiresAt: string | null;
  createdAt: string;
  note?: string | null;
  revokedAt?: string | null;
};

function formatShareDate(value: string | null | undefined) {
  if (!value) return "دائم";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ShareLinksManager({ onRefresh }: ManagerProps) {
  const utils = trpc.useUtils();
  const [ttlHours, setTtlHours] = useState(24);
  const [isPermanent, setIsPermanent] = useState(false);
  const [note, setNote] = useState("");
  const [latestLinkUrl, setLatestLinkUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const cacheKey = "admin_share_links_cache";
  const [cachedLinks, setCachedLinks] = useState<ShareLinkItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as ShareLinkItem[]) : [];
    } catch {
      return [];
    }
  });
  const updateCache = (updater: (prev: ShareLinkItem[]) => ShareLinkItem[]) => {
    setCachedLinks((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(next));
      }
      return next;
    });
  };
  const listQuery = trpc.shareLinks.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!listQuery.data) return;
    setCachedLinks((prev) => {
      const next =
        listQuery.data.length === 0 && prev.length > 0 ? prev : listQuery.data;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(next));
      }
      return next;
    });
  }, [listQuery.data, cacheKey]);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel: string;
    onConfirm?: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "تأكيد",
  });
  const links =
    listQuery.data && listQuery.data.length > 0 ? listQuery.data : cachedLinks;
  const isLoading = listQuery.isLoading && cachedLinks.length === 0;

  const buildShareUrl = (code: string) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/s/${code}/services`;
  };

  const createMutation = trpc.shareLinks.create.useMutation({
    onSuccess: (data) => {
      setNote("");
      setIsPermanent(false);
      if (data?.code) {
        const url = buildShareUrl(data.code);
        if (url) setLatestLinkUrl(url);
        const createdAt = new Date().toISOString();
        updateCache((prev) => {
          const next: ShareLinkItem = {
            code: data.code,
            note: data.note ?? null,
            expiresAt: data.expiresAt,
            createdAt,
            revokedAt: null,
          };
          return [next, ...prev.filter((item) => item.code !== data.code)];
        });
      }
      toast.success(isPermanent ? "تم إنشاء الرابط الدائم" : "تم إنشاء الرابط المؤقت");
      utils.shareLinks.list.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const extendMutation = trpc.shareLinks.extend.useMutation({
    onSuccess: (data, variables) => {
      toast.success("تم تمديد الرابط");
      if (data?.expiresAt) {
        updateCache((prev) =>
          prev.map((item) =>
            item.code === variables.code
              ? { ...item, expiresAt: data.expiresAt }
              : item
          )
        );
      }
      utils.shareLinks.list.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeMutation = trpc.shareLinks.revoke.useMutation({
    onSuccess: () => {
      toast.success("تم تعطيل الرابط");
      utils.shareLinks.list.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreate = () => {
    if (!isPermanent && (!Number.isFinite(ttlHours) || ttlHours < 1)) {
      toast.error("يرجى إدخال مدة صحيحة بالساعات");
      return;
    }
    const hoursLabel = ttlHours === 1 ? "ساعة واحدة" : `${ttlHours} ساعة`;
    const payloadNote = note.trim() || undefined;
    setConfirmState({
      open: true,
      title: "تأكيد إنشاء الرابط",
      description: isPermanent
        ? "هل تريد إنشاء رابط دائم؟"
        : `هل تريد إنشاء رابط مؤقت لمدة ${hoursLabel}؟`,
      confirmLabel: "إنشاء",
      onConfirm: () => {
        createMutation.mutate(
          isPermanent
            ? { permanent: true, note: payloadNote }
            : { ttlHours, note: payloadNote }
        );
      },
    });
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  };

  const handleRemove = (code: string) => {
    setConfirmState({
      open: true,
      title: "تعطيل الرابط",
      description: "هل تريد تعطيل هذا الرابط المؤقت؟",
      confirmLabel: "تعطيل",
      onConfirm: () => {
        updateCache((prev) =>
          prev.map((item) =>
            item.code === code
              ? { ...item, revokedAt: new Date().toISOString() }
              : item
          )
        );
        revokeMutation.mutate({ code });
      },
    });
  };


  const now = Date.now();
  const sortedLinks = [...links].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredLinks = sortedLinks.filter((link) => {
    const expiresAtMs = link.expiresAt ? new Date(link.expiresAt).getTime() : null;
    const isExpired = expiresAtMs ? expiresAtMs <= now : false;
    const isRevoked = Boolean(link.revokedAt);
    const status = isRevoked ? "revoked" : isExpired ? "expired" : "active";
    const matchesStatus = statusFilter === "all" || statusFilter === status;
    if (!normalizedSearch) return matchesStatus;
    const haystack = `${link.code} ${link.note ?? ""}`.toLowerCase();
    return matchesStatus && haystack.includes(normalizedSearch);
  });

  return (
    <div className="space-y-6">
      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState((prev) => ({ ...prev, open: false, onConfirm: undefined }));
          }
        }}
      >
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            {confirmState.description ? (
              <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirmState.onConfirm;
                setConfirmState((prev) => ({ ...prev, open: false, onConfirm: undefined }));
                action?.();
              }}
            >
              {confirmState.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            إنشاء رابط مؤقت
          </CardTitle>
          <CardDescription>
            أنشئ رابط مشاركة ينتهي تلقائياً بعد مدة محددة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="share-ttl">المدة (بالساعات)</Label>
              <Input
                id="share-ttl"
                type="number"
                min={1}
                max={168}
                value={ttlHours}
                onChange={(e) => {
                  setIsPermanent(false);
                  setTtlHours(Number(e.target.value));
                }}
                disabled={isPermanent}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-note">ملاحظة (اختياري)</Label>
              <Input
                id="share-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: لينك لمعاينة جلسة جديدة"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(1);
              }}
            >
              ساعة واحدة
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(3);
              }}
            >
              3 ساعات
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(5);
              }}
            >
              5 ساعات
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(24);
              }}
            >
              24 ساعة
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(72);
              }}
            >
              3 أيام
            </Button>
            <Button
              type="button"
              variant={isPermanent ? "default" : "secondary"}
              size="sm"
              onClick={() => setIsPermanent(true)}
            >
              دائم
            </Button>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Link2 className="w-4 h-4 ml-2" />
            )}
            إنشاء الرابط
          </Button>

          {latestLinkUrl && (
            <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
              <Label>آخر رابط تم إنشاؤه</Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={latestLinkUrl}
                  readOnly
                  className="dir-ltr text-xs sm:text-sm w-full"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(latestLinkUrl)}
                >
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            الروابط التي أنشأتها
          </CardTitle>
          <CardDescription>
            هذه القائمة محفوظة على السيرفر ويمكن التحكم بها من أي جهاز.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {sortedLinks.length === 0 && (
            <div className="text-sm text-muted-foreground">
              لم يتم إنشاء أي روابط بعد.
            </div>
          )}

          {sortedLinks.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالكود أو الملاحظة..."
                className="sm:max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="فلترة الحالة" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">سارية</SelectItem>
                    <SelectItem value="expired">منتهية</SelectItem>
                    <SelectItem value="revoked">ملغية</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-xs">
                  {filteredLinks.length} نتيجة
                </Badge>
              </div>
            </div>
          )}

          {sortedLinks.length > 0 && filteredLinks.length === 0 && (
            <div className="text-sm text-muted-foreground">
              لا توجد روابط مطابقة لبحثك.
            </div>
          )}

          {filteredLinks.map((link) => {
            const expiresAtMs = link.expiresAt
              ? new Date(link.expiresAt).getTime()
              : Number.NaN;
            const isExpired = Number.isNaN(expiresAtMs)
              ? false
              : expiresAtMs <= now;
            const isRevoked = Boolean(link.revokedAt);
            const url = buildShareUrl(link.code);

            return (
              <div
                key={link.code}
                className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isRevoked || isExpired ? "destructive" : "secondary"}>
                {isRevoked ? "ملغي" : isExpired ? "منتهي" : "ساري"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ينتهي في {formatShareDate(link.expiresAt)}
              </span>
            </div>
                  <div className="text-xs text-muted-foreground">
                    {formatShareDate(link.createdAt)}
                  </div>
                </div>

                {link.note && (
                  <div className="text-sm text-muted-foreground">{link.note}</div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">الرابط</Label>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      value={url}
                      readOnly
                      className="dir-ltr text-xs sm:text-sm w-full"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopy(url)}
                        disabled={isRevoked}
                      >
                        <Copy className="w-4 h-4 ml-2" />
                        نسخ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(link.code)}
                        disabled={revokeMutation.isPending || isRevoked}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        تعطيل
                      </Button>
                    </div>
                  </div>
                </div>

                {link.expiresAt ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">تمديد سريع:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 1 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +1 ساعة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 3 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +3 ساعات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 5 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +5 ساعات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 24 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +24 ساعة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 72 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +3 أيام
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Live Editor Component
// ============================================
function LiveEditor() {
  const [activeSection, setActiveSection] = useState("links");
  const [historyBusy, setHistoryBusy] = useState(false);
  const utils = trpc.useUtils();
  const {
    canUndo,
    canRedo,
    takeUndo,
    takeRedo,
    restoreUndo,
    restoreRedo,
  } = useEditHistory();

  const contentMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => utils.siteContent.getAll.invalidate(),
  });
  const contactMutation = trpc.contactInfo.upsert.useMutation({
    onSuccess: () => utils.contactInfo.getAll.invalidate(),
  });
  const imageMutation = trpc.siteImages.upsert.useMutation({
    onSuccess: () => utils.siteImages.getAll.invalidate(),
  });

  const refreshPreview = () => {
    if (typeof window === "undefined") return;
    const stamp = String(Date.now());
    window.localStorage.setItem("siteContentUpdatedAt", stamp);
    window.localStorage.setItem("siteImagesUpdatedAt", stamp);
    window.localStorage.setItem("sitePackagesUpdatedAt", stamp);
    window.localStorage.setItem("siteContactUpdatedAt", stamp);
    window.localStorage.setItem("siteTestimonialsUpdatedAt", stamp);
    window.localStorage.setItem("sitePortfolioUpdatedAt", stamp);
  };

  const applyAction = async (action: EditAction, direction: "undo" | "redo") => {
    if (action.kind === "siteContent") {
      const value = direction === "undo" ? action.prev : action.next;
      await contentMutation.mutateAsync({
        key: action.key,
        value,
        category: action.category,
        label: action.label,
      });
      return;
    }
    if (action.kind === "contactInfo") {
      const value = direction === "undo" ? action.prev : action.next;
      await contactMutation.mutateAsync({
        key: action.key,
        value,
        label: action.label,
      });
      return;
    }
    if (action.kind === "siteImage") {
      const url = direction === "undo" ? action.prevUrl : action.nextUrl;
      await imageMutation.mutateAsync({
        key: action.key,
        url,
        alt: action.alt,
        category: action.category,
      });
    }
  };

  const handleUndo = async () => {
    if (historyBusy) return;
    const action = takeUndo();
    if (!action) return;
    setHistoryBusy(true);
    try {
      await applyAction(action, "undo");
      refreshPreview();
      toast.success("تم الرجوع عن آخر تعديل");
    } catch (error: any) {
      restoreUndo(action);
      toast.error(error?.message ?? "تعذر الرجوع عن التعديل");
    } finally {
      setHistoryBusy(false);
    }
  };

  const handleRedo = async () => {
    if (historyBusy) return;
    const action = takeRedo();
    if (!action) return;
    setHistoryBusy(true);
    try {
      await applyAction(action, "redo");
      refreshPreview();
      toast.success("تم التقدم في التعديل");
    } catch (error: any) {
      restoreRedo(action);
      toast.error(error?.message ?? "تعذر التقدم في التعديل");
    } finally {
      setHistoryBusy(false);
    }
  };

  const sections = [
    {
      id: "links",
      title: "الروابط المؤقتة",
      description: "إنشاء روابط معاينة مؤقتة وإدارتها.",
      icon: Link2,
      render: () => <ShareLinksManager onRefresh={refreshPreview} />,
    },
    {
      id: "content",
      title: "تعديل النصوص",
      description: "كل نصوص الموقع في خانات قابلة للتعديل والحفظ.",
      icon: Pencil,
      render: () => <ContentManager onRefresh={refreshPreview} />,
    },
    {
      id: "packages",
      title: "الباقات",
      description: "إضافة الباقات وتعديل تفاصيلها وترتيبها.",
      icon: Package,
      render: () => <PackagesManager onRefresh={refreshPreview} />,
    },
    {
      id: "contact",
      title: "بيانات التواصل",
      description: "أرقام التواصل وروابط السوشيال.",
      icon: Phone,
      render: () => <ContactManager onRefresh={refreshPreview} />,
    },
    {
      id: "testimonials",
      title: "آراء العملاء",
      description: "إضافة وحذف الآراء والتحكم في ظهورها.",
      icon: MessageSquare,
      render: () => <TestimonialsManager onRefresh={refreshPreview} />,
    },
  ];

  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{active.title}</h2>
          <p className="text-sm text-muted-foreground">{active.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo || historyBusy}
          >
            <Undo2 className="w-4 h-4 ml-2" />
            رجوع
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo || historyBusy}
          >
            <Redo2 className="w-4 h-4 ml-2" />
            تقدم
          </Button>
          <Button variant="secondary" size="sm" onClick={refreshPreview}>
            <Monitor className="w-4 h-4 ml-2" />
            تحديث المزامنة
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/?adminPreview=1" target="_blank" rel="noreferrer">
              صفحة التعديلات
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              القوائم
            </CardTitle>
            <CardDescription>اختر القسم الذي تريد تعديله.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === active.id;
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </Button>
              );
            })}
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <a href="/?adminPreview=1" target="_blank" rel="noreferrer">
                <Monitor className="w-4 h-4" />
                صفحة التعديلات
              </a>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {active.render()}
        </div>
      </div>
    </div>
  );
}
