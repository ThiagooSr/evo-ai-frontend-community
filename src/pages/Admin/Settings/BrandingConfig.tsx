import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Label, Button, Card, CardContent, CardHeader, CardTitle } from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { api } from '@/services/core';
import { refreshGlobalConfig } from '@/contexts/GlobalConfigContext';
import { extractData, extractError } from '@/utils/apiHelpers';
import { ClearConfigButton } from '@/components/admin/ClearConfigButton';
import type { AdminConfigData } from '@/types/admin/adminConfig';

interface BrandingFormData {
  BRAND_NAME: string;
  BRAND_PRIMARY_COLOR: string;
  BRAND_LOGO_URL: string;
  BRAND_FAVICON_URL: string;
}

const EMPTY: BrandingFormData = {
  BRAND_NAME: '',
  BRAND_PRIMARY_COLOR: '',
  BRAND_LOGO_URL: '',
  BRAND_FAVICON_URL: '',
};

const DEFAULT_COLOR = '#22c55e'; // shown in the swatch when no color is set yet

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('attachment', file);
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const { file_url: url } = extractData<{ file_url: string }>(response);
  if (!url) throw new Error('Upload response missing file_url');
  return url;
}

export default function BrandingConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'logo' | 'favicon' | null>(null);
  const [form, setForm] = useState<BrandingFormData>(EMPTY);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminConfigService.getConfig('branding');
      setForm({
        BRAND_NAME: (data.BRAND_NAME as string) || '',
        BRAND_PRIMARY_COLOR: (data.BRAND_PRIMARY_COLOR as string) || '',
        BRAND_LOGO_URL: (data.BRAND_LOGO_URL as string) || '',
        BRAND_FAVICON_URL: (data.BRAND_FAVICON_URL as string) || '',
      });
    } catch {
      toast.error(t('branding.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleFileSelect = async (field: 'logo' | 'favicon', file: File | undefined) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const url = await uploadImage(file);
      setForm(prev => ({
        ...prev,
        [field === 'logo' ? 'BRAND_LOGO_URL' : 'BRAND_FAVICON_URL']: url,
      }));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('branding.messages.uploadError'), { description: errorInfo.message });
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await adminConfigService.saveConfig('branding', { ...form } as AdminConfigData);
      setForm({
        BRAND_NAME: (saved.BRAND_NAME as string) || '',
        BRAND_PRIMARY_COLOR: (saved.BRAND_PRIMARY_COLOR as string) || '',
        BRAND_LOGO_URL: (saved.BRAND_LOGO_URL as string) || '',
        BRAND_FAVICON_URL: (saved.BRAND_FAVICON_URL as string) || '',
      });
      // Applies the new name/color/logo/favicon immediately, for this admin,
      // without a page reload (GlobalConfigProvider re-fetches and re-runs
      // applyBranding on every subsequent load too).
      await refreshGlobalConfig();
      toast.success(t('branding.messages.saveSuccess'));
    } catch (error) {
      const errorInfo = extractError(error);
      toast.error(t('branding.messages.saveError'), { description: errorInfo.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCleared = () => {
    // ClearConfigButton already calls refreshGlobalConfig() itself.
    setForm(EMPTY);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderImageField = (
    field: 'logo' | 'favicon',
    label: string,
    help: string,
    value: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted/30 overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-sidebar-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="hidden"
            onChange={e => handleFileSelect(field, e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingField === field}
              onClick={() => inputRef.current?.click()}
            >
              {uploadingField === field && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {uploadingField === field ? t('branding.uploading') : t(`branding.upload.${field}`)}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm(prev => ({
                    ...prev,
                    [field === 'logo' ? 'BRAND_LOGO_URL' : 'BRAND_FAVICON_URL']: '',
                  }))
                }
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-xs text-sidebar-foreground/60">{help}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-sidebar-foreground">{t('branding.title')}</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('branding.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('branding.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="BRAND_NAME">{t('branding.fields.name')}</Label>
              <Input
                id="BRAND_NAME"
                value={form.BRAND_NAME}
                placeholder={t('branding.placeholders.name')}
                onChange={e => setForm(prev => ({ ...prev, BRAND_NAME: e.target.value }))}
              />
              <p className="text-xs text-sidebar-foreground/60">{t('branding.help.name')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="BRAND_PRIMARY_COLOR">{t('branding.fields.primaryColor')}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="BRAND_PRIMARY_COLOR"
                  value={form.BRAND_PRIMARY_COLOR || DEFAULT_COLOR}
                  onChange={e => setForm(prev => ({ ...prev, BRAND_PRIMARY_COLOR: e.target.value }))}
                  className="w-10 h-10 border border-border rounded cursor-pointer shrink-0"
                />
                <Input
                  value={form.BRAND_PRIMARY_COLOR}
                  placeholder={DEFAULT_COLOR}
                  onChange={e => setForm(prev => ({ ...prev, BRAND_PRIMARY_COLOR: e.target.value }))}
                  className="max-w-40"
                />
                {form.BRAND_PRIMARY_COLOR && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm(prev => ({ ...prev, BRAND_PRIMARY_COLOR: '' }))}
                  >
                    {t('branding.resetColor')}
                  </Button>
                )}
              </div>
              <p className="text-xs text-sidebar-foreground/60">{t('branding.help.primaryColor')}</p>
            </div>

            {renderImageField(
              'logo',
              t('branding.fields.logo'),
              t('branding.help.logo'),
              form.BRAND_LOGO_URL,
              logoInputRef,
            )}

            {renderImageField(
              'favicon',
              t('branding.fields.favicon'),
              t('branding.help.favicon'),
              form.BRAND_FAVICON_URL,
              faviconInputRef,
            )}

            <div className="pt-2 flex gap-3">
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? t('branding.saving') : t('branding.save')}
              </Button>
              <ClearConfigButton configType="branding" configLabel={t('branding.title')} onCleared={handleCleared} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
