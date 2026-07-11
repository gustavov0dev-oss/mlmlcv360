import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/backend/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { toast } from 'sonner';
import { Plus, Trash2, Save, GripVertical, Loader as Loader2, RefreshCw, CircleHelp as HelpCircle, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
interface FaqItem {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

type FormData = {
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
};

const emptyForm = (): FormData => ({
  question: '',
  answer: '',
  is_active: true,
  sort_order: 0,
});

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FaqAdminPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Drag-and-drop state
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('faq_items')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setItems((data as FaqItem[]) || []);
    } catch (err: any) {
      toast.error('Error al cargar las preguntas frecuentes: ' + (err?.message || 'desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const total = items.length;
  const activeCount = items.filter(i => i.is_active).length;
  const inactiveCount = total - activeCount;

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm());
    setShowForm(false);
    setEditingId(null);
  };

  const startAdd = () => {
    setForm({ ...emptyForm(), sort_order: items.length });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (item: FaqItem) => {
    setForm({
      question: item.question,
      answer: item.answer,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setEditingId(item.id);
    setShowForm(true);
    // Scroll to form on mobile
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Save (create or update) ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.question.trim()) {
      toast.error('La pregunta es obligatoria');
      return;
    }
    if (!form.answer.trim()) {
      toast.error('La respuesta es obligatoria');
      return;
    }

    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('faq_items')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Pregunta actualizada correctamente');
      } else {
        const { error } = await supabase.from('faq_items').insert(payload);
        if (error) throw error;
        toast.success('Pregunta creada correctamente');
      }
      resetForm();
      await fetchItems();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err?.message || 'desconocido'));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await supabase.from('faq_items').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Pregunta eliminada');
      if (editingId === deleteTarget.id) resetForm();
      await fetchItems();
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err?.message || 'desconocido'));
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // ── Toggle active inline (no need to enter edit mode) ──────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (item: FaqItem) => {
    setTogglingId(item.id);
    try {
      const { data, error } = await supabase
        .from('faq_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)
        .select('id,is_active')
        .single();
      if (error) throw error;
      if (!data) { toast.error('Sin permisos: verifica tu rol de administrador'); return; }
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, is_active: !item.is_active } : it));
      toast.success(item.is_active ? 'Pregunta desactivada' : 'Pregunta activada');
    } catch (err: any) {
      const msg = err?.message || 'Error al actualizar';
      toast.error(msg.includes('row-level') ? 'Sin permisos de administrador' : msg);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Drag and drop reorder ────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragIndex.current = index;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex.current !== null && dragIndex.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent<HTMLDivElement>, index: number) => {
    // Only clear if leaving the row entirely (not entering a child)
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndex.current;
    setDragOverIndex(null);
    setIsDragging(false);
    dragIndex.current = null;

    if (fromIndex === null || fromIndex === dropIndex) return;

    // Reorder array locally
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Reassign sort_order 0..n
    const withNewOrder = reordered.map((it, i) => ({ ...it, sort_order: i }));
    setItems(withNewOrder);

    // Persist new sort_order for all items
    setReordering(true);
    try {
      const updates = withNewOrder.map(it =>
        supabase.from('faq_items').update({ sort_order: it.sort_order }).eq('id', it.id),
      );
      const results = await Promise.all(updates);
      for (const r of results) if (r.error) throw r.error;
      toast.success('Orden actualizado correctamente');
    } catch (err: any) {
      toast.error('Error al reordenar: ' + (err?.message || 'desconocido'));
      await fetchItems();
    } finally {
      setReordering(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <HelpCircle className="w-6 h-6 text-primary" />
            Preguntas Frecuentes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las preguntas y respuestas que aparecen en la página de inicio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={startAdd} disabled={showForm && !editingId}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva pregunta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Total
            </div>
            <div className="text-2xl font-bold text-foreground mt-1">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Activas
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
              {activeCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Inactivas
            </div>
            <div className="text-2xl font-bold text-muted-foreground mt-1">
              {inactiveCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2 text-foreground">
                {editingId ? (
                  <><Pencil className="w-5 h-5" /> Editar pregunta</>
                ) : (
                  <><Plus className="w-5 h-5" /> Nueva pregunta</>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={resetForm}
                disabled={saving}
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Question */}
            <div className="space-y-2">
              <Label htmlFor="question">
                Pregunta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="question"
                placeholder="Ej. ¿Cómo puedo registrarme en la plataforma?"
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              />
            </div>

            {/* Answer */}
            <div className="space-y-2">
              <Label htmlFor="answer">
                Respuesta <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="answer"
                placeholder="Escribe aquí la respuesta detallada..."
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                {form.is_active ? 'Activa' : 'Inactiva'}
              </Label>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingId ? 'Guardar cambios' : 'Crear pregunta'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[0,1,2].map(i => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                <Skeleton className="h-5 w-5 rounded mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-0.5">Sin preguntas frecuentes</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Crea la primera pregunta.</p>
            <Button variant="outline" size="sm" onClick={startAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Crear pregunta
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/50">Arrastra para reordenar</p>
              {reordering && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin ml-auto" />}
            </div>
            <div className="divide-y divide-border/50">
              {items.map((item, idx) => {
                const isDragged = isDragging && dragIndex.current === idx;
                const isDropTarget = dragOverIndex === idx;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDragLeave={e => handleDragLeave(e, idx)}
                    onDrop={e => handleDrop(e, idx)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3.5 transition-all group select-none',
                      isDropTarget ? 'border-t-2 border-primary bg-primary/5' : 'hover:bg-muted/30',
                      isDragged && 'opacity-40',
                      !item.is_active && 'opacity-70',
                    )}
                  >
                    {/* Drag handle */}
                    <div
                      className="flex items-center justify-center pt-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0"
                      title="Arrastra para reordenar"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-foreground truncate">
                        {item.question || 'Pregunta sin título'}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.answer || 'Sin respuesta'}
                      </p>
                    </div>

                    {/* Active toggle — inline, no need to enter edit mode */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                      <div className="w-9 h-5 flex items-center">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleActive(item)}
                          disabled={togglingId === item.id}
                          aria-label="Activar/desactivar"
                          className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                        />
                      </div>
                      <span className={cn('text-[10px] font-medium', item.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/50')}>
                        {item.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(item)} disabled={saving || reordering} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(item)} disabled={saving || reordering || deletingId === item.id} title="Eliminar">
                        {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar pregunta frecuente"
        description={<>Se eliminará permanentemente la pregunta <strong>{deleteTarget?.question}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
