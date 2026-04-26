const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldTab = code.substring(
  code.indexOf('function AdminAppearanceTab({ refreshData }: any) {'),
  code.indexOf('function AdminStatisticsTab() {')
);

const newTab = `
const PRESETS = {
  elegant_gold: {
    primaryColor: { h: 43, s: 74, l: 49 },
    accentColor: { h: 45, s: 93, l: 47 },
    bgColor: { h: 36, s: 100, l: 97 },
    textColor: { h: 30, s: 8, l: 14 }
  },
  classic_madrasah: {
    primaryColor: { h: 158, s: 64, l: 39 },
    accentColor: { h: 45, s: 93, l: 47 },
    bgColor: { h: 40, s: 33, l: 96 },
    textColor: { h: 0, s: 0, l: 15 }
  },
  deep_forest: {
    primaryColor: { h: 160, s: 40, l: 20 },
    accentColor: { h: 40, s: 50, l: 50 },
    bgColor: { h: 50, s: 20, l: 95 },
    textColor: { h: 160, s: 40, l: 10 }
  }
};

function HSLPicker({ label, value, onChange }: any) {
  if (!value || typeof value !== 'object' || value.h === undefined) return null;
  return (
    <div className="space-y-2 mb-4 p-4 bg-base-100/50 rounded-xl border border-base-200">
      <div className="flex justify-between items-center mb-4">
        <label className="text-xs font-bold uppercase tracking-widest text-text-muted">{label}</label>
        <div className="flex gap-2 items-center">
           <div className="w-6 h-6 rounded-md shadow-inner border border-base-200" style={{ backgroundColor: \`hsl(\${value.h}, \${value.s}%, \${value.l}%)\` }} />
           <span className="text-[10px] font-mono bg-base-200/50 px-2 py-1 rounded text-text-muted">hsl({value.h}, {value.s}%, {value.l}%)</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-light w-4">H</span>
          <input type="range" min="0" max="360" value={value.h} onChange={e => onChange({...value, h: parseInt(e.target.value)})} className="flex-1 h-2 rounded-lg appearance-none bg-gradient-to-r from-red-500 via-green-500 to-blue-500 cursor-pointer" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-light w-4">S</span>
          <input type="range" min="0" max="100" value={value.s} onChange={e => onChange({...value, s: parseInt(e.target.value)})} className="flex-1 h-2 rounded-lg appearance-none cursor-pointer" style={{ background: \`linear-gradient(to right, hsl(\${value.h}, 0%, \${value.l}%), hsl(\${value.h}, 100%, \${value.l}%))\` }} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-light w-4">L</span>
          <input type="range" min="0" max="100" value={value.l} onChange={e => onChange({...value, l: parseInt(e.target.value)})} className="flex-1 h-2 rounded-lg appearance-none cursor-pointer" style={{ background: \`linear-gradient(to right, hsl(\${value.h}, \${value.s}%, 0%), hsl(\${value.h}, \${value.s}%, 100%))\` }} />
        </div>
      </div>
    </div>
  );
}

function AdminAppearanceTab({ refreshData }: any) {
  const [settings, setSettings] = React.useState<any>({
    primaryColor: PRESETS.classic_madrasah.primaryColor,
    accentColor: PRESETS.classic_madrasah.accentColor,
    bgColor: PRESETS.classic_madrasah.bgColor,
    textColor: PRESETS.classic_madrasah.textColor,
    appName: 'SuccessHub',
    badgeTitle: 'Season 2 Active',
    heroTitle: 'Student Ranking',
    heroSubtitle: 'Witness the rise of champions. Progress is tracked daily across all learning tracks.',
    logoUrl: ''
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiFetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          // Ensure colors are HSL objects if they exist
          if (data && Object.keys(data).length > 0) {
            setSettings((prev: any) => ({
              ...prev,
              ...data,
              // Keep default HSL if database has old Hex strings
              primaryColor: (data.primaryColor && typeof data.primaryColor === 'object') ? data.primaryColor : prev.primaryColor,
              accentColor: (data.accentColor && typeof data.accentColor === 'object') ? data.accentColor : prev.accentColor,
              bgColor: (data.bgColor && typeof data.bgColor === 'object') ? data.bgColor : prev.bgColor,
              textColor: (data.textColor && typeof data.textColor === 'object') ? data.textColor : prev.textColor,
            }));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Live CSS Injection
  React.useEffect(() => {
    const applyHSL = (name: string, val: any) => {
      if (!val || typeof val !== 'object' || val.h === undefined) return;
      document.documentElement.style.setProperty(name, \`hsl(\${val.h}, \${val.s}%, \${val.l}%)\`);
    };
    applyHSL('--theme-primary-600', settings.primaryColor);
    applyHSL('--theme-accent-500', settings.accentColor);
    applyHSL('--theme-base-50', settings.bgColor);
    applyHSL('--theme-text-main', settings.textColor);
  }, [settings.primaryColor, settings.accentColor, settings.bgColor, settings.textColor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleColorChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    setSettings((prev: any) => ({
      ...prev,
      ...PRESETS[presetKey]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings || {})
      });
      if (res.ok) {
        setSuccessMsg('Appearance settings and branding applied successfully!');
        if (refreshData) {
          refreshData();
        }
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-text-muted">Loading settings...</div>;

  return (
    <div className="p-8">
      <h3 className="text-2xl font-black text-text-main underline decoration-primary-500 decoration-4 underline-offset-8 mb-8">
        Appearance & Branding Manager
      </h3>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-2xl flex items-center gap-3 font-bold">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* TEMPLATES */}
          <div className="p-6 bg-base-50 rounded-2xl border border-base-200 shadow-sm">
            <h4 className="font-bold text-text-main mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" /> Preset Templates
            </h4>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => applyPreset('classic_madrasah')} 
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-lg hover:bg-emerald-600"
              >
                Classic Madrasah
              </button>
              <button 
                onClick={() => applyPreset('elegant_gold')} 
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-lg hover:bg-amber-500"
              >
                Elegant Gold
              </button>
              <button 
                onClick={() => applyPreset('deep_forest')} 
                className="px-4 py-2 bg-slate-800 text-emerald-100 rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-lg hover:bg-slate-700"
              >
                Deep Forest
              </button>
            </div>
            <p className="text-xs text-text-muted mt-3">Clicking a preset instantly updates the live preview. Don't forget to push "Save & Publish" to lock it in.</p>
          </div>

          <div className="p-6 bg-base-50 rounded-2xl border border-base-200 shadow-sm">
            <h4 className="font-bold text-text-main mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" /> Advanced Color Editor (HSL)
            </h4>
            <HSLPicker label="Primary Color" value={settings.primaryColor} onChange={(v:any) => handleColorChange('primaryColor', v)} />
            <HSLPicker label="Accent Color" value={settings.accentColor} onChange={(v:any) => handleColorChange('accentColor', v)} />
            <HSLPicker label="Background Base" value={settings.bgColor} onChange={(v:any) => handleColorChange('bgColor', v)} />
            <HSLPicker label="Main Text Color" value={settings.textColor} onChange={(v:any) => handleColorChange('textColor', v)} />
          </div>

          <div className="p-6 bg-base-50 rounded-2xl border border-base-200 shadow-sm">
            <h4 className="font-bold text-text-main mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-500" /> Dynamic Branding
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-text-main mb-1">Application Name</label>
                <input type="text" name="appName" value={settings.appName} onChange={handleChange} className="w-full bg-base-100 border border-base-200 rounded-xl px-4 py-3 text-sm" placeholder="e.g. Mamba'ul Huda Student Portal" />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-main mb-1">Badge Title</label>
                <input type="text" name="badgeTitle" value={settings.badgeTitle} onChange={handleChange} className="w-full bg-base-100 border border-base-200 rounded-xl px-4 py-3 text-sm" placeholder="e.g. Season 2 Active" />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-main mb-1">Hero Title (Leaderboard)</label>
                <input type="text" name="heroTitle" value={settings.heroTitle} onChange={handleChange} className="w-full bg-base-100 border border-base-200 rounded-xl px-4 py-3 text-sm" placeholder="e.g. Global Leaderboard" />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-main mb-1">Hero Subtitle</label>
                <textarea rows={3} name="heroSubtitle" value={settings.heroSubtitle} onChange={(e:any) => handleChange(e)} className="w-full bg-base-100 border border-base-200 rounded-xl px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-main mb-1">Logo URL</label>
                <input type="text" name="logoUrl" value={settings.logoUrl} onChange={handleChange} className="w-full bg-base-100 border border-base-200 rounded-xl px-4 py-3 text-sm" placeholder="https://example.com/logo.png" />
                <p className="text-xs text-text-light mt-1">Leave empty to use the default Trophy icon.</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full bg-primary-600 text-base-50 px-8 py-5 rounded-2xl font-black shadow-lg shadow-primary-200 flex justify-center items-center gap-2 hover:bg-primary-700 active:scale-95 transition-all text-lg"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {saving ? 'Synchronizing to Firebase...' : 'Save & Publish Theme Engine'}
          </button>
        </div>

        {/* LIVE PREVIEW PANE */}
        <div className="space-y-6">
          <div className="sticky top-8">
             <h4 className="font-black text-text-main mb-4 uppercase tracking-widest text-sm">Live Sandbox Preview</h4>
             
             {/* Preview: Navbar mini */}
             <div className="bg-base-50 border border-base-200 rounded-2xl p-4 mb-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <div className="bg-primary-600 p-2 rounded-lg"><Trophy className="w-4 h-4 text-base-50" /></div>
                  )}
                  <span className="font-bold text-text-main">{settings.appName}</span>
                </div>
                <div className="w-8 h-8 bg-base-200 rounded-full" />
             </div>

             {/* Preview: Hero */}
             <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-8 rounded-[2rem] text-base-50 shadow-2xl relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 opacity-20 transform translate-x-1/4 -translate-y-1/4 rotate-12 mix-blend-overlay">
                  {settings.logoUrl ? <img src={settings.logoUrl} className="w-48 h-48" /> : <Trophy className="w-48 h-48" />}
                </div>
                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-base-100/10 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Flame className="w-3 h-3 text-accent-500" /> {settings.badgeTitle}
                  </div>
                  <h1 className="text-3xl font-black tracking-tight leading-tight">{settings.heroTitle}</h1>
                  <p className="text-sm opacity-80 leading-relaxed max-w-sm">
                    {settings.heroSubtitle}
                  </p>
                </div>
             </div>

             {/* Preview: Card */}
             <div className="bg-base-50 rounded-2xl p-6 border border-base-200 shadow-sm transition-all hover:border-primary-300 hover:shadow-lg">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-base-200 rounded-full flex items-center justify-center font-bold text-text-muted">
                    1
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-200 to-primary-100 rounded-full flex justify-center items-center overflow-hidden">
                     <UserIcon className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <h5 className="font-bold text-text-main text-lg">Student Example</h5>
                    <p className="text-xs font-bold text-text-light uppercase tracking-widest">Web Dev Track</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xl font-black text-accent-500">1,250</div>
                    <div className="text-[10px] text-text-light font-bold uppercase tracking-widest">PTS</div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(oldTab, newTab);
fs.writeFileSync('src/App.tsx', code);
console.log('Successfully injected advanced appearance tab');
