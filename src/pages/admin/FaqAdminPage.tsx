import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
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
import { toast } from 'sonner';
import { Plus, Trash2, Save, Loader as Loader2, RefreshCw, CircleHelp as HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface FaqItem {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

type FormData = Omit<FaqItem, 'id' | 'created_at'>;

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
  const [saving, setSaving] = useState<string | null>(null); // id being saved (or 'new')
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

    setSaving(editingId || 'new');
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
      setSaving(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta frecuente? Esta acción no se puede deshacer.')) return;
    try {
      const { error } = await supabase.from('faq_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Pregunta eliminada');
      if (editingId === id) resetForm();
      await fetchItems();
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err?.message || 'desconocido'));
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────────
  const handleToggleActive = async (item: FaqItem) => {
    const next = !item.is_active;
    // Optimistic update
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: next } : i)));
    try {
      const { error } = await supabase
        .from('faq_items')
        .update({ is_active: next })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(next ? 'Pregunta activada' : 'Pregunta desactivada');
    } catch (err: any) {
      // Revert on failure
      setItems(prev => prev.map(i => (i.id === item.id ? { ...i, is_active: !next } : i)));
      toast.error('Error al cambiar el estado: ' + (err?.message || 'desconocido'));
    }
  };

  // ── Inline edit ──────────────────────────────────────────────────────────────
  const handleInlineChange = (
    id: string,
    field: 'question' | 'answer' | 'sort_order',
    value: string,
  ) => {
    setItems(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, [field]: field === 'sort_order' ? Number(value) || 0 : value }
          : i,
      ),
    );
  };

  const handleInlineSave = async (item: FaqItem) => {
    setSaving(item.id);
    try {
      const { error } = await supabase
        .from('faq_items')
        .update({
          question: item.question,
          answer: item.answer,
          sort_order: item.sort_order,
        })
        .eq('id', item.id);
      if (error) throw error;
      toast.success('Cambios guardados');
      await fetchItems();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err?.message || 'desconocido'));
    } finally {
      setSaving(null);
    }
  };

  // ── Move (reorder) ───────────────────────────────────────────────────────────
  const handleMove = async (item: FaqItem, dir: -1 | 1) => {
    const index = items.findIndex(i => i.id === item.id);
    const target = index + dir;
    if (target < 0 || target >= items.length) return;

    const a = items[index];
    const b = items[target];
    const newOrderA = b.sort_order;
    const newOrderB = a.sort_order;

    // Optimistic reorder
    setItems(prev =>
      prev
        .map(i => {
          if (i.id === a.id) return { ...i, sort_order: newOrderA };
          if (i.id === b.id) return { ...i, sort_order: newOrderB };
          return i;
        })
        .sort((x, y) => x.sort_order - y.sort_order),
    );

    try {
      const updates = [
        supabase.from('faq_items').update({ sort_order: newOrderA }).eq('id', a.id),
        supabase.from('faq_items').update({ sort_order: newOrderB }).eq('id', b.id),
      ];
      const results = await Promise.all(updates);
      for (const r of results) if (r.error) throw r.error;
      toast.success('Orden actualizado');
    } catch (err: any) {
      toast.error('Error al reordenar: ' + (err?.message || 'desconocido'));
      await fetchItems();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
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

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {editingId ? (
                <><Save className="w-5 h-5" /> Editar pregunta</>
              ) : (
                <><Plus className="w-5 h-5" /> Nueva pregunta</>
              )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sort order */}
              <div className="space-y-2">
                <Label htmlFor="sort_order">Orden</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e =>
                    setForm(f => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                  }
                />
              </div>

              {/* Active */}
              <div className="flex items-end gap-3 pb-2">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  {form.is_active ? 'Activa' : 'Inactiva'}
                </Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={resetForm} disabled={!!saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!!saving}>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Preguntas configuradas</span>
            <span className="text-sm font-normal text-muted-foreground">
              {items.length} {items.length === 1 ? 'pregunta' : 'preguntas'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              Cargando preguntas...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay preguntas frecuentes configuradas.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={startAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Crear la primera pregunta
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex flex-col lg:flex-row lg:items-start gap-3 p-4 rounded-lg border transition-colors ${
                    item.is_active
                      ? 'bg-card hover:bg-accent/30'
                      : 'bg-muted/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Reorder controls */}
                  <div className="flex items-center gap-1 lg:pt-1">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMove(item, -1)}
                        disabled={idx === 0}
                        title="Subir"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMove(item, 1)}
                        disabled={idx === items.length - 1}
                        title="Bajar"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input
                      value={item.question}
                      onChange={e => handleInlineChange(item.id, 'question', e.target.value)}
                      className="h-9 font-medium"
                      placeholder="Pregunta"
                    />
                    <Textarea
                      value={item.answer}
                      onChange={e => handleInlineChange(item.id, 'answer', e.target.value)}
                      className="text-sm text-muted-foreground min-h-[60px]"
                      placeholder="Respuesta"
                      rows={2}
                    />
                  </div>

                  {/* Sort order */}
                  <div className="flex items-center gap-2 lg:pt-1">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Orden</Label>
                    <Input
                      type="number"
                      value={item.sort_order}
                      onChange={e => handleInlineChange(item.id, 'sort_order', e.target.value)}
                      className="h-8 w-16"
                    />
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-2 lg:pt-2">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                    <span className="text-xs text-muted-foreground w-14">
                      {item.is_active ? (
                        <span className="text-emerald-600">Activa</span>
                      ) : (
                        <span>Inactiva</span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 lg:pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleInlineSave(item)}
                      disabled={saving === item.id}
                      title="Guardar cambios"
                    >
                      {saving === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(item)}
                      title="Editar en el formulario"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
