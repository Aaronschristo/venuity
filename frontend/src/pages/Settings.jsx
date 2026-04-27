import { useState, useEffect, memo, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { saveSettings as saveSettingsApi, extractError } from '../lib/api';

function Settings() {
  const { settings, updateSettings } = useSettings();
  const showToast = useToast();

  // Business settings
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [checkinFee, setCheckinFee] = useState(settings.checkin_fee);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol);

  // Branding / White-label settings
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || '#6366f1');
  const [primaryHoverColor, setPrimaryHoverColor] = useState(settings.primary_hover_color || '#4f46e5');
  const [appTitle, setAppTitle] = useState(settings.app_title || 'Venuity');

  const [saving, setSaving] = useState(false);

  // Sync form when settings load from API
  useEffect(() => {
    setBusinessName(settings.business_name);
    setCheckinFee(settings.checkin_fee);
    setCurrencySymbol(settings.currency_symbol);
    setPrimaryColor(settings.primary_color || '#6366f1');
    setPrimaryHoverColor(settings.primary_hover_color || '#4f46e5');
    setAppTitle(settings.app_title || 'Venuity');
  }, [settings]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSaving(true);

      const data = {
        business_name: businessName.trim(),
        checkin_fee: checkinFee.toString().trim(),
        currency_symbol: currencySymbol.trim(),
        primary_color: primaryColor.trim(),
        primary_hover_color: primaryHoverColor.trim(),
        app_title: appTitle.trim(),
      };

      try {
        const { status, body } = await saveSettingsApi(data);
        if (status === 200) {
          updateSettings(data);
          showToast('Settings saved successfully!', 'success');
        } else {
          showToast(extractError(body, 'Failed to save settings'), 'error');
        }
      } catch {
        showToast('System Error', 'error');
      } finally {
        setSaving(false);
      }
    },
    [businessName, checkinFee, currencySymbol, primaryColor, primaryHoverColor, appTitle, updateSettings, showToast]
  );

  return (
    <>
      <div className="flex-header">
        <h2 style={{ margin: 0 }}>Application Settings</h2>
      </div>

      <div className="glass-card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* ─── Business Settings ─── */}
          <h3 style={{ color: 'var(--text-light)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            <i className="bx bx-store" style={{ marginRight: '8px' }} />
            Business Configuration
          </h3>

          <div className="form-group">
            <label htmlFor="business_name">Business Name</label>
            <input
              type="text"
              id="business_name"
              className="form-input"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="checkin_fee">Check-in Fee</label>
            <input
              type="number"
              id="checkin_fee"
              className="form-input"
              step="any"
              min="0"
              required
              value={checkinFee}
              onChange={(e) => setCheckinFee(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency_symbol">Currency Symbol</label>
            <input
              type="text"
              id="currency_symbol"
              className="form-input"
              required
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
            />
          </div>

          {/* ─── Branding / White-label Settings ─── */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '30px 0' }} />

          <h3 style={{ color: 'var(--text-light)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            <i className="bx bx-palette" style={{ marginRight: '8px' }} />
            Branding &amp; White-label
          </h3>

          <div className="form-group">
            <label htmlFor="app_title">Application Title</label>
            <input
              type="text"
              id="app_title"
              className="form-input"
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
            />
            <small style={{ color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
              Shown on the login screen and browser tab.
            </small>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label htmlFor="primary_color">Primary Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="color"
                  id="primary_color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: '48px',
                    height: '48px',
                    padding: '2px',
                    border: '2px solid var(--glass-border)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ fontFamily: 'monospace', flex: 1 }}
                  placeholder="#6366f1"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="primary_hover_color">Hover Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="color"
                  id="primary_hover_color"
                  value={primaryHoverColor}
                  onChange={(e) => setPrimaryHoverColor(e.target.value)}
                  style={{
                    width: '48px',
                    height: '48px',
                    padding: '2px',
                    border: '2px solid var(--glass-border)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={primaryHoverColor}
                  onChange={(e) => setPrimaryHoverColor(e.target.value)}
                  style={{ fontFamily: 'monospace', flex: 1 }}
                  placeholder="#4f46e5"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '36px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryHoverColor})`,
                boxShadow: `0 4px 12px ${primaryColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Preview Gradient
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={saving}
            >
              {saving ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" /> Saving...
                </>
              ) : (
                <>
                  <i className="bx bx-save" /> Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default memo(Settings);
