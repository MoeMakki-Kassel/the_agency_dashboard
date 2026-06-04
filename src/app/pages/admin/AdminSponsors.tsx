import React, { useState, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Image as ImageIcon, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useSponsors, useCreateSponsor, useUpdateSponsor, useDeleteSponsor, useUploadSponsorLogo } from '../../../hooks/useSponsors';
import type { Sponsor } from '../../../api/types';
import { useLanguage } from '../../contexts/LanguageContext';
import { AdminRefreshButton } from '../../components/admin/AdminRefreshButton';

export function AdminSponsors() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState({ name: '', logo: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sponsorsData, isLoading, isFetching, refetch } = useSponsors();
  const createSponsor = useCreateSponsor();
  const updateSponsor = useUpdateSponsor();
  const deleteSponsor = useDeleteSponsor();
  const uploadLogo = useUploadSponsorLogo();

  const sponsors = sponsorsData?.data ?? [];

  const filteredSuppliers = sponsors.filter((supplier) =>
    supplier.sponsor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (supplier?: Sponsor) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ name: supplier.sponsor_name, logo: supplier.logo ?? '' });
      setLogoPreview(supplier.logo ?? '');
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', logo: '' });
      setLogoPreview('');
    }
    setLogoFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', logo: '' });
    setLogoFile(null);
    setLogoPreview('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Please enter a sponsor name');
      return;
    }

    if (editingSupplier) {
      // If a new file was selected, upload it first then update name
      if (logoFile) {
        uploadLogo.mutate(
          { id: editingSupplier.id, file: logoFile },
          {
            onSuccess: () => {
              if (formData.name !== editingSupplier.sponsor_name) {
                updateSponsor.mutate(
                  { id: editingSupplier.id, data: { sponsor_name: formData.name } },
                  { onSuccess: handleCloseModal }
                );
              } else {
                handleCloseModal();
              }
              toast.success('Sponsor updated successfully');
            },
            onError: () => toast.error('Failed to upload logo'),
          }
        );
      } else {
        updateSponsor.mutate(
          { id: editingSupplier.id, data: { sponsor_name: formData.name, logo: formData.logo || undefined } },
          {
            onSuccess: () => { handleCloseModal(); toast.success('Sponsor updated successfully'); },
            onError: () => toast.error('Failed to update sponsor'),
          }
        );
      }
    } else {
      // Create sponsor first, then upload logo if a file was selected
      createSponsor.mutate(
        { sponsor_name: formData.name, logo: formData.logo || undefined },
        {
          onSuccess: (created) => {
            if (logoFile) {
              uploadLogo.mutate(
                { id: created.id, file: logoFile },
                {
                  onSuccess: () => { handleCloseModal(); toast.success('Sponsor added successfully'); },
                  onError: () => { handleCloseModal(); toast.warning('Sponsor created but logo upload failed'); },
                }
              );
            } else {
              handleCloseModal();
              toast.success('Sponsor added successfully');
            }
          },
          onError: () => toast.error('Failed to add sponsor'),
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this sponsor?')) {
      deleteSponsor.mutate(id, {
        onSuccess: () => toast.success('Sponsor deleted'),
        onError: () => toast.error('Failed to delete sponsor'),
      });
    }
  };

  const isSaving = createSponsor.isPending || updateSponsor.isPending || uploadLogo.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal'] text-ink-black">{t('admin.sponsors.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('admin.sponsors.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminRefreshButton onClick={() => void refetch()} isFetching={isFetching} />
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('admin.sponsors.add_button')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card p-4 rounded-xl border border-warm-gray/50 shadow-sm">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 start-3" />
          <input
            type="text"
            placeholder={t('admin.sponsors.search_ph')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 ps-10 pe-4 rounded-lg border border-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </div>

      {/* Sponsors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-card rounded-xl border border-warm-gray/50 shadow-sm overflow-hidden animate-pulse">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 rounded-lg bg-muted" />
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                      <div className="w-8 h-8 rounded-lg bg-muted" />
                    </div>
                  </div>
                  <div className="h-5 w-40 bg-muted rounded" />
                </div>
              </div>
            ))}
          </>
        )}

        {!isLoading && filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-card rounded-xl border border-warm-gray/50 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {supplier.logo ? (
                    <img src={supplier.logo} alt={supplier.sponsor_name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(supplier)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title={t('admin.common.edit')}
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('admin.common.delete')}
                    disabled={deleteSponsor.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-lg text-ink-black">{supplier.sponsor_name}</h3>
            </div>
          </div>
        ))}

        {!isLoading && filteredSuppliers.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">{t('admin.sponsors.none')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-secondary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-xl font-['Tajawal'] text-ink-black">
                {editingSupplier ? t('admin.sponsors.edit') : t('admin.sponsors.add_new')}
              </h3>
              <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('admin.sponsors.name_label')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Premium Sound Systems"
                  className="w-full border border-border rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Logo</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-16 object-contain" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload logo</p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">{logoPreview ? 'Click to change' : 'JPG, PNG, WEBP · max 2MB'}</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-3 border-2 border-primary text-foreground font-bold rounded-xl hover:bg-muted transition-colors"
              >
                {t('admin.common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? t('admin.sponsors.saving') : (editingSupplier ? t('admin.sponsors.save_update') : t('admin.sponsors.save_add'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

