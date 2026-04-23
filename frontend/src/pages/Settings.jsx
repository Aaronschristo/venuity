import { useState, useEffect, memo, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { saveSettings as saveSettingsApi } from '../lib/api';

function Settings() {
  const { settings, updateSettings } = useSettings();
  const showToast = useToast();

  const [businessName, setBusinessName] = useState(settings.business_name);
  const [checkinFee, setCheckinFee] = useState(settings.checkin_fee);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol);
  const [saving, setSaving] = useState(false);

  // Sync form when settings load from API
  useEffect(() => {
    setBusinessName(settings.business_name);
    setCheckinFee(settings.checkin_fee);
    setCurrencySymbol(settings.currency_symbol);
  }, [settings]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setSaving(true);

      const data = {
        business_name: businessName.trim(),
        checkin_fee: checkinFee.toString().trim(),
        currency_symbol: currencySymbol.trim(),
      };

      try {
        const { status, body } = await saveSettingsApi(data);
        if (status === 200) {
          updateSettings(data);
          showToast('Settings saved successfully!', 'success');
        } else {
          showToast(body.error || 'Failed to save settings', 'error');
        }
      } catch {
        showToast('System Error', 'error');
      } finally {
        setSaving(false);
      }
    },
    [businessName, checkinFee, currencySymbol, updateSettings, showToast]
  );

  return (
    <>
      <div className="flex-header">
        <h2 style={{ margin: 0 }}>Application Settings</h2>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
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
