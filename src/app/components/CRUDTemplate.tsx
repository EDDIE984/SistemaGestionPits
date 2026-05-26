import { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface CRUDTemplateProps<T> {
  title: string;
  description: string;
  data: T[];
  columns: Column<T>[];
  onAdd: (item: Omit<T, 'id'>) => void;
  onEdit: (id: string | number, item: Partial<T>) => void;
  onDelete: (id: string | number) => void;
  renderForm: (
    item: Partial<T> | null,
    onChange: (field: keyof T, value: any) => void
  ) => React.ReactNode;
  getItemId: (item: T) => string | number;
}

export function CRUDTemplate<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  renderForm,
  getItemId,
}: CRUDTemplateProps<T>) {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<T> | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<Partial<T>>({});

  const handleOpenDialog = (item?: T) => {
    if (item) {
      setCurrentItem(item);
      setFormData(item);
    } else {
      setCurrentItem(null);
      setFormData({});
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentItem(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (currentItem) {
      onEdit(getItemId(currentItem as T), formData);
    } else {
      onAdd(formData as Omit<T, 'id'>);
    }
    handleCloseDialog();
  };

  const handleFieldChange = (field: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteClick = (id: string | number) => {
    setItemToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete !== null) {
      onDelete(itemToDelete);
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/configuracion')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Configuración
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2 text-gray-900">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-700 whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs uppercase tracking-wider text-gray-700 whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No hay datos disponibles
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={String(getItemId(item))} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {column.render
                          ? column.render(item)
                          : String(item[column.key as keyof T] ?? '')}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDialog(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(getItemId(item))}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentItem ? 'Editar' : 'Agregar'} {title}</DialogTitle>
            <DialogDescription>
              {currentItem ? 'Modifica' : 'Ingresa'} los datos del formulario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">{renderForm(currentItem, handleFieldChange)}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {currentItem ? 'Guardar Cambios' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}