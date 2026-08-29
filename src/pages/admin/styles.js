export const adminCss = `body{font-family:'Noto Sans SC',sans-serif;margin:0;padding:10px;background-color:#f8f9fa;color:#212529}.container{max-width:1200px;margin:0 auto;background:#fff;padding:20px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,.1)}.admin-header{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}@media(min-width:768px){.admin-header{flex-direction:row;align-items:center;justify-content:space-between}}h1{font-size:1.75rem;margin:0;color:#343a40}.admin-subtitle{margin:4px 0 0;color:#6c757d;font-size:.95rem}.logout-btn{background:#f8f9fa;color:#495057;border:1px solid #ced4da;padding:8px 14px;border-radius:6px;cursor:pointer}.tab-wrapper{margin-top:20px}.tab-buttons{display:flex;margin-bottom:10px;flex-wrap:wrap}.tab-button{background:#e9ecef;border:1px solid #dee2e6;padding:10px 15px;border-radius:4px 4px 0 0;cursor:pointer;color:#495057}.tab-button.active{background:#fff;border-bottom:1px solid #fff;color:#212529}.tab-content{display:none;border:1px solid #dee2e6;padding:10px;border-top:none}.tab-content.active{display:block}.import-export,.add-new{display:flex;gap:10px;margin-bottom:20px;justify-content:flex-end;flex-wrap:wrap}.add-new{justify-content:flex-start}.add-new>input,.add-new>select,.logo-field{flex:1 1 150px;min-width:150px}.logo-field{display:flex;flex-direction:column;gap:4px}.logo-field button{padding:6px 8px;font-size:.8rem}.bulk-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px}.bulk-toolbar input[type=text]{margin-bottom:0;min-width:160px}.bulk-toolbar select{margin-bottom:0}.bulk-select-all{display:flex;align-items:center;gap:6px;color:#495057;font-weight:600}#selectedCount{color:#6c757d;font-size:.9rem;margin-right:auto}.config-select,#selectAllConfigs,#selectAllConfigsHead{width:16px;height:16px;cursor:pointer}input[type=text],input[type=url],input[type=number],input[type=password],select{padding:10px;border:1px solid #ced4da;border-radius:4px;font-size:1rem;outline:none;margin-bottom:5px;transition:border-color .2s}input:focus,select:focus{border-color:#80bdff;box-shadow:0 0 0 .2rem rgba(0,123,255,.25)}button{background:#b86b4b;color:#fff;border:none;padding:10px 15px;border-radius:4px;cursor:pointer;font-size:1rem;transition:background-color .3s}button:hover{background:#985a40}button:disabled{opacity:.55;cursor:not-allowed}.table-wrapper{overflow-x:auto}table{width:100%;min-width:980px;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #dee2e6;padding:10px;text-align:left;color:#495057;vertical-align:top}th{background:#f2f2f2;font-weight:600}tr:nth-child(even){background:#f9f9f9}.actions,.category-actions{display:flex;gap:5px;flex-wrap:wrap}.actions button,.category-actions button{padding:5px 8px;font-size:.8rem}.edit-btn{background:#17a2b8}.check-btn{background:#20c997}.del-btn{background:#dc3545}.health{display:inline-flex;align-items:center;white-space:nowrap;border-radius:999px;padding:3px 8px;font-size:.78rem;font-weight:600}.health-unknown{background:#e9ecef;color:#6c757d}.health-ok{background:#d4edda;color:#155724}.health-bad{background:#f8d7da;color:#721c24}.pagination{text-align:center;margin-top:20px}.pagination button{margin:0 5px;background:#e9ecef;color:#495057;border:1px solid #ced4da}.success{background:#28a745;color:#fff;padding:1rem;border-radius:.5rem;margin-bottom:1rem}.error{background:#dc3545;color:#fff;padding:1rem;border-radius:.5rem;margin-bottom:1rem}.category-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap}.category-hint{margin:0;font-size:.85rem;color:#6c757d}.modal{display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;overflow:auto;background:rgba(0,0,0,.5)}.modal-content{background:#fff;margin:8% auto;padding:20px;border:1px solid #dee2e6;width:80%;max-width:600px;border-radius:8px;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.1)}.modal-close{color:#6c757d;position:absolute;right:10px;top:0;font-size:28px;font-weight:bold;cursor:pointer}.modal-content form{display:flex;flex-direction:column}.modal-content label{margin-bottom:5px;font-weight:500;color:#495057}.modal-content input{margin-bottom:10px}#adminFaviconStatus{padding:.5rem;border-radius:.25rem;margin-bottom:1rem;font-size:.85rem}.status-loading{background:#fff3cd!important;color:#856404!important;border:1px solid #ffeaa7!important}.status-success{background:#d4edda!important;color:#155724!important;border:1px solid #c3e6cb!important}.status-error{background:#f8d7da!important;color:#721c24!important;border:1px solid #f5c6cb!important}.private-settings-card{border:1px solid #dee2e6;border-radius:8px;padding:16px;background:#f8f9fa;max-width:720px}.private-settings-card label{display:block;font-weight:700;margin-bottom:8px;color:#343a40}.private-password-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}.private-password-row input{flex:1 1 260px}textarea{padding:10px;border:1px solid #ced4da;border-radius:4px;font-size:1rem;outline:none;margin-bottom:5px;transition:border-color .2s;box-sizing:border-box;width:100%;resize:vertical;font-family:inherit}textarea:focus{border-color:#80bdff;box-shadow:0 0 0 .2rem rgba(0,123,255,.25)}.ai-settings-card{display:flex;flex-direction:column;gap:8px}.ai-settings-card input[type=checkbox]{margin-right:6px}.ai-actions{display:flex;gap:10px;flex-wrap:wrap}.ai-status{padding:10px;border-radius:6px;border:1px solid #dee2e6;background:#fff;color:#495057;white-space:pre-wrap;font-size:.9rem}.ai-status.success{background:#d4edda;color:#155724;border-color:#c3e6cb}.ai-status.error{background:#f8d7da;color:#721c24;border-color:#f5c6cb}.ai-status.loading{background:#fff3cd;color:#856404;border-color:#ffeaa7}
/* modern admin ui */
:root{--admin-bg:#f4f1ec;--admin-surface:#fffaf3;--admin-surface-2:#f7efe4;--admin-text:#24211d;--admin-muted:#756b5d;--admin-line:#e6d9c8;--admin-accent:#b86b4b;--admin-accent-2:#2f6f5e;--admin-accent-3:#d8a24a;--admin-danger:#b84a4a;--admin-shadow:0 18px 48px rgba(71,52,35,.12)}body{background:radial-gradient(circle at 16% 0%,rgba(216,162,74,.18),transparent 32%),radial-gradient(circle at 86% 8%,rgba(47,111,94,.14),transparent 30%),linear-gradient(135deg,#f4f1ec 0%,#fbf7f0 52%,#efe7dc 100%);min-height:100vh}.container{max-width:1440px;border-radius:24px;padding:24px;background:rgba(255,250,243,.92);backdrop-filter:blur(18px);box-shadow:var(--admin-shadow);border:1px solid rgba(230,217,200,.72)}.admin-header{border-bottom:1px solid #e5e7eb;padding-bottom:18px}.admin-header h1{letter-spacing:-.03em}.logout-btn{border-radius:999px;background:#fff}.import-export{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:12px;box-shadow:0 10px 26px rgba(15,23,42,.06)}.add-new{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:16px;box-shadow:0 10px 26px rgba(15,23,42,.06)}#searchInput{display:block;width:100%;box-sizing:border-box;margin:0 0 16px;padding:14px 16px;border-radius:14px;background:#fff;border:1px solid #dbe3ef}.admin-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0}.stat-card{display:flex;align-items:center;gap:12px;border:1px solid #e5e7eb;border-radius:18px;background:linear-gradient(180deg,#fff,#f8fafc);padding:16px;box-shadow:0 12px 30px rgba(15,23,42,.07)}.stat-icon{display:flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:14px;background:#f1e3d1;font-size:1.25rem}.stat-card strong{display:block;font-size:1.45rem;color:#111827;line-height:1}.stat-card small{display:block;margin-top:5px;color:#64748b}.tab-wrapper{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start;transition:grid-template-columns .3s cubic-bezier(0.4,0,0.2,1)}.tab-wrapper.sidebar-collapsed{grid-template-columns:68px minmax(0,1fr)}.tab-buttons{position:sticky;top:16px;display:flex;flex-direction:column;gap:8px;margin:0;border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:10px;box-shadow:0 12px 30px rgba(15,23,42,.06);transition:all .3s cubic-bezier(0.4,0,0.2,1);overflow:hidden}.sidebar-toggle{width:100%;border-radius:12px;border:0;background:transparent;color:#475569;font-weight:700;padding:10px;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:center;margin-bottom:4px}.sidebar-toggle:hover{background:#f1f5f9}.toggle-icon{font-size:14px;transition:transform .3s cubic-bezier(0.4,0,0.2,1)}.sidebar-collapsed .toggle-icon{transform:rotate(180deg)}.tab-button{width:100%;border-radius:12px;border:0;background:transparent;text-align:left;color:#475569;font-weight:700;display:flex;align-items:center;gap:10px;white-space:nowrap;transition:all .25s}.tab-icon{font-size:18px;flex:0 0 auto;display:inline-flex;width:24px;justify-content:center}.tab-text{flex:1;transition:opacity .2s,transform .2s}.sidebar-collapsed .tab-text{opacity:0;transform:translateX(-8px);position:absolute;pointer-events:none}.sidebar-collapsed .tab-button{justify-content:center;padding-left:8px;padding-right:8px}.tab-button:hover{background:#f1f5f9}.tab-button.active{background:#b86b4b;color:#fff;border:0;box-shadow:0 10px 18px rgba(36,33,29,.18)}.tab-content{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:16px;box-shadow:0 12px 30px rgba(15,23,42,.06)}.bulk-toolbar,.category-toolbar,.private-settings-card{box-shadow:0 8px 22px rgba(15,23,42,.045)}.table-wrapper{border:1px solid #e5e7eb;border-radius:16px;background:#fff;overflow:auto;max-height:70vh}table{margin-bottom:0}thead th{position:sticky;top:0;z-index:2;background:#f8fafc;color:#334155}th,td{border-left:0;border-right:0}.actions button,.category-actions button{border-radius:999px}.tag-pill{display:inline-flex;margin:2px;border-radius:999px;background:#f1e3d1;color:#8a553d;padding:2px 7px;font-size:.75rem}.empty-state{padding:28px!important;text-align:center;color:#64748b}.modal-content{border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.22)}@media(max-width:980px){.admin-overview{grid-template-columns:repeat(2,minmax(0,1fr))}.tab-wrapper{display:block}.tab-buttons{position:static;flex-direction:row;overflow-x:auto;margin-bottom:12px}.tab-button{white-space:nowrap;text-align:center}.container{padding:14px;border-radius:14px}}@media(max-width:640px){body{padding:0}.admin-overview{grid-template-columns:1fr}.container{border-radius:0}.import-export,.add-new{justify-content:stretch}.import-export button,.add-new button{width:100%}input[type=text],input[type=url],input[type=number],input[type=password],select,textarea{width:100%;box-sizing:border-box}.table-wrapper{max-height:none}}

.inline-input{width:100%;min-width:120px;box-sizing:border-box;padding:8px 10px;border-radius:10px;border:1px solid #dbe3ef;background:#fff;font-size:.9rem}.inline-input:focus{border-color:#b86b4b;box-shadow:0 0 0 3px rgba(184,107,75,.14)}.save-inline-btn{background:#b86b4b}.secondary-btn{background:#f1f5f9!important;color:#475569!important;border:1px solid #cbd5e1!important}.confirm-content{max-width:420px}.confirm-content p{color:#64748b;line-height:1.6}.confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.loading-state{padding:30px!important;text-align:center;color:#64748b}.loading-spinner{display:inline-block;width:16px;height:16px;margin-right:8px;border:2px solid #ead4bd;border-top-color:#b86b4b;border-radius:50%;vertical-align:-3px;animation:adminSpin .8s linear infinite}.empty-state .empty-icon{font-size:2rem;margin-bottom:8px}.empty-state strong{display:block;color:#334155;margin-bottom:4px}.empty-state p{margin:0;color:#64748b}@keyframes adminSpin{to{transform:rotate(360deg)}}

\n\n/* compact add bookmark submit row */\n.add-new .add-submit-row{display:flex;align-items:center;gap:8px;flex:0 0 auto;min-width:220px}.add-new .add-submit-row input{width:120px;min-width:100px;margin-bottom:0}.add-new .add-submit-row button{white-space:nowrap;margin-bottom:0;padding-left:18px;padding-right:18px}@media(max-width:640px){.add-new .add-submit-row{width:100%;display:grid;grid-template-columns:1fr auto}.add-new .add-submit-row input{width:100%;min-width:0}.add-new .add-submit-row button{width:auto}}\n/* compact header actions */\n.admin-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.admin-header-actions .import-export{margin:0;padding:0;background:transparent;border:0;box-shadow:none;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.admin-header-actions .import-export button,.admin-header-actions .logout-btn{padding:8px 12px;font-size:.9rem}.admin-header-actions form{margin:0}@media(max-width:768px){.admin-header-actions{justify-content:flex-start;width:100%}.admin-header-actions .import-export{justify-content:flex-start}.admin-header-actions .import-export button,.admin-header-actions .logout-btn{width:auto}}@media(max-width:520px){.admin-header-actions,.admin-header-actions .import-export{display:grid;grid-template-columns:1fr 1fr;width:100%}.admin-header-actions form{display:contents}.admin-header-actions .import-export button,.admin-header-actions .logout-btn{width:100%}}\n/* refined non-ai admin skin */
h1,.analytics-panel-title h3{color:var(--admin-text)}.admin-subtitle,.category-hint,.analytics-panel-title small,.stat-card small,.analytics-card small{color:var(--admin-muted)}button{background:var(--admin-accent);border-radius:12px;box-shadow:none}button:hover{background:#985a40}.check-btn{background:var(--admin-accent-2)}.check-btn:hover{background:#285f51}.del-btn{background:var(--admin-danger)}.del-btn:hover{background:#963d3d}.edit-btn,.save-inline-btn{background:var(--admin-accent-2)}input[type=text],input[type=url],input[type=number],input[type=password],select,textarea,.inline-input{border-color:var(--admin-line);background:#fffdf8;color:var(--admin-text);border-radius:12px}input:focus,select:focus,textarea:focus,.inline-input:focus{border-color:var(--admin-accent);box-shadow:0 0 0 3px rgba(184,107,75,.14)}.admin-header{border-bottom-color:var(--admin-line)}.import-export,.add-new,.tab-buttons,.tab-content,.stat-card,.analytics-card,.analytics-panel,.table-wrapper,.private-settings-card{background:rgba(255,250,243,.92);border-color:var(--admin-line);box-shadow:0 12px 34px rgba(71,52,35,.08)}.stat-icon,.analytics-card span{background:#f1e3d1}.tab-button{color:var(--admin-muted);border-radius:14px}.tab-button:hover{background:#f3eadf;color:var(--admin-text)}.tab-button.active{background:linear-gradient(135deg,var(--admin-text),#5e4a3c);color:#fff;box-shadow:0 12px 22px rgba(36,33,29,.18)}thead th{background:#f3eadf;color:#4b4035}.tag-pill{background:#efe1cf;color:#8a553d}.health-unknown{background:#efe7dc;color:#756b5d}.health-ok{background:#dfeee5;color:#2f6f5e}.health-bad{background:#f2d9d3;color:#963d3d}.pagination button,.secondary-btn{background:#f3eadf!important;color:#5d5146!important;border-color:var(--admin-line)!important}.trend-bar{background:linear-gradient(180deg,var(--admin-accent-3),var(--admin-accent));box-shadow:0 6px 12px rgba(184,107,75,.18)}.heat-0{background:#efe7dc}.heat-1{background:#ead4bd}.heat-2{background:#d8a24a}.heat-3{background:#b86b4b}.heat-4{background:#5e4a3c}.heatmap-legend i{background:#ead4bd}.heatmap-legend .l2{background:#d8a24a}.heatmap-legend .l3{background:#b86b4b}.heatmap-legend .l4{background:#5e4a3c}.analytics-meter span{background:linear-gradient(90deg,var(--admin-accent-3),var(--admin-accent))}
.radar-chart{display:flex;align-items:center;justify-content:center;min-height:320px}.radar-chart svg{max-width:360px;width:100%;height:auto}.radar-grid{fill:none;stroke:#e6d9c8;stroke-width:1}.radar-axis{stroke:#d7c6b4;stroke-width:1}.radar-area{fill:rgba(184,107,75,.22);stroke:var(--admin-accent);stroke-width:2}.radar-point{fill:var(--admin-accent)}.radar-label{font-size:12px;fill:#5d5146;font-weight:700}.radar-score{font-size:11px;fill:#8a7b69}.insight-grid{display:grid;gap:10px}.insight-card{border:1px solid var(--admin-line);border-radius:16px;padding:12px;background:linear-gradient(180deg,#fffdf8,#f7efe4)}.insight-card strong{display:block;color:var(--admin-text);margin-bottom:4px}.insight-card p{margin:0;color:var(--admin-muted);line-height:1.55;font-size:.9rem}.donut-panel{display:grid;place-items:center;gap:12px;min-height:260px}.donut-chart{width:190px;height:190px;border-radius:50%;position:relative;background:conic-gradient(var(--admin-accent) 0deg,var(--admin-accent) 20deg,#ead4bd 20deg,#ead4bd 360deg)}.donut-chart::after{content:attr(data-total);position:absolute;inset:42px;border-radius:50%;background:#fffaf3;display:grid;place-items:center;color:var(--admin-text);font-weight:800;font-size:1.4rem}.donut-legend{display:flex;flex-direction:column;gap:6px;width:100%}.donut-legend span{display:flex;justify-content:space-between;gap:10px;color:var(--admin-muted);font-size:.88rem}.donut-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}


/* analytics pro upgrade */
.analytics-card{position:relative;align-items:flex-start}.analytics-card em{display:inline-flex;margin-top:7px;padding:3px 8px;border-radius:999px;background:#f3eadf;color:var(--admin-muted);font-style:normal;font-size:.76rem;font-weight:700}.analytics-card em.up{background:#e4efe7;color:#2f6f5e}.analytics-card em.down{background:#f2d9d3;color:#963d3d}.analytics-ops-strip{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:14px;margin:0 0 14px}.pressure-widget,.review-window-widget{border:1px solid var(--admin-line);border-radius:18px;padding:16px;background:linear-gradient(180deg,#fffdf8,#f7efe4);box-shadow:0 10px 26px rgba(71,52,35,.07)}.pressure-head{display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--admin-muted);font-weight:700}.pressure-head strong{font-size:1.8rem;color:var(--admin-text)}.pressure-track{height:10px;border-radius:999px;background:#eadfce;overflow:hidden;margin:10px 0}.pressure-track i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2f6f5e,#d8a24a,#b84a4a);border-radius:999px;transition:width .3s}.pressure-widget p,.review-window-widget p{margin:0;color:var(--admin-text);line-height:1.5}.review-window-widget strong{display:block;color:var(--admin-text);margin-bottom:8px}.review-window-widget small{display:block;margin-top:8px;color:var(--admin-muted);line-height:1.5}.quality-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.quality-card{border:1px solid var(--admin-line);border-radius:16px;padding:12px;background:#fffdf8}.quality-card strong{display:block;color:var(--admin-text);font-size:1.25rem}.quality-card small{color:var(--admin-muted)}.quality-meter{height:7px;border-radius:999px;background:#eadfce;margin-top:8px;overflow:hidden}.quality-meter span{display:block;height:100%;background:linear-gradient(90deg,var(--admin-accent-2),var(--admin-accent-3))}.submission-calendar{display:grid;grid-template-columns:repeat(auto-fill,minmax(28px,1fr));gap:6px}.calendar-cell{height:28px;border-radius:8px;background:#efe7dc;position:relative}.calendar-cell:hover::after{content:attr(title);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;background:#111827;color:#fff;padding:5px 8px;border-radius:8px;font-size:.75rem;z-index:5}.cal-0{background:#efe7dc}.cal-1{background:#ead4bd}.cal-2{background:#d8c08d}.cal-3{background:#d8a24a}.cal-4{background:#b86b4b}.domain-host{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.anomaly-high{border-color:#e0b0a4;background:#fff7f4}@media(max-width:800px){.analytics-ops-strip{grid-template-columns:1fr}.quality-grid{grid-template-columns:1fr}}

/* submission analytics */
.analytics-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.analytics-controls select{margin:0}.analytics-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:14px 0}.analytics-card{display:flex;align-items:center;gap:12px;border:1px solid #e5e7eb;border-radius:18px;padding:16px;background:linear-gradient(180deg,#fff,#f8fafc);box-shadow:0 10px 26px rgba(15,23,42,.06)}.analytics-card span{display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:14px;background:#f1e3d1}.analytics-card strong{display:block;font-size:1.35rem;color:#111827}.analytics-card small{display:block;color:#64748b}.analytics-status{border:1px solid #e5e7eb;border-radius:16px;background:#fff;margin-bottom:14px}.analytics-status.is-hidden{display:none}.analytics-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.analytics-panel{border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:16px;box-shadow:0 10px 26px rgba(15,23,42,.05);overflow:hidden}.analytics-panel.wide{grid-column:1/-1}.analytics-panel-title{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:14px}.analytics-panel-title h3{margin:0;color:#111827;font-size:1.05rem}.analytics-panel-title small{color:#64748b}.daily-trend{display:flex;align-items:flex-end;gap:4px;min-height:180px;padding:12px;border-radius:14px;background:linear-gradient(180deg,#f8fafc,#fff);overflow-x:auto}.trend-bar{min-width:10px;flex:1;border-radius:999px 999px 4px 4px;background:linear-gradient(180deg,#d8a24a,#b86b4b);position:relative;box-shadow:0 6px 12px rgba(184,107,75,.18)}.trend-bar.zero{background:#e2e8f0;box-shadow:none}.trend-bar:hover::after,.heat-cell:hover::after{content:attr(title);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;background:#111827;color:#fff;padding:5px 8px;border-radius:8px;font-size:.75rem;z-index:5}.submission-heatmap{display:grid;grid-template-columns:52px repeat(24,minmax(18px,1fr));gap:4px;overflow-x:auto;padding:8px}.heat-label{font-size:.75rem;color:#64748b;display:flex;align-items:center}.heat-hour{font-size:.7rem;color:#94a3b8;text-align:center}.heat-cell{height:22px;border-radius:6px;background:#e2e8f0;position:relative}.heat-0{background:#edf2f7}.heat-1{background:#ead4bd}.heat-2{background:#d8a24a}.heat-3{background:#b86b4b}.heat-4{background:#5e4a3c}.heatmap-legend{display:flex;align-items:center;justify-content:flex-end;gap:6px;color:#64748b;font-size:.8rem}.heatmap-legend i{display:inline-block;width:18px;height:10px;border-radius:99px;background:#ead4bd}.heatmap-legend .l2{background:#d8a24a}.heatmap-legend .l3{background:#b86b4b}.heatmap-legend .l4{background:#5e4a3c}.analytics-list{display:flex;flex-direction:column;gap:10px}.analytics-item{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px;border:1px solid #edf2f7;border-radius:14px;background:#f8fafc}.analytics-item strong{color:#334155}.analytics-item small{display:block;color:#64748b;margin-top:3px}.analytics-meter{height:8px;border-radius:99px;background:#e2e8f0;overflow:hidden;margin-top:8px}.analytics-meter span{display:block;height:100%;background:linear-gradient(90deg,#d8a24a,#b86b4b)}@media(max-width:980px){.analytics-summary,.analytics-grid{grid-template-columns:1fr 1fr}}@media(max-width:640px){.analytics-summary,.analytics-grid{grid-template-columns:1fr}.analytics-panel-title{display:block}.submission-heatmap{grid-template-columns:42px repeat(24,18px)}}
\n\n/* inline logo preview in bookmark list */\n.inline-logo-field{display:flex;align-items:center;gap:8px;min-width:210px}.inline-logo-preview{width:28px;height:28px;border-radius:9px;object-fit:contain;background:#fffdf8;border:1px solid var(--admin-line);box-shadow:0 4px 10px rgba(71,52,35,.08);flex:0 0 auto}.inline-logo-placeholder{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border-radius:9px;background:#f3eadf;color:var(--admin-muted);font-size:.72rem;border:1px dashed var(--admin-line);flex:0 0 auto}.inline-logo-field .inline-logo{min-width:150px;margin-bottom:0}\n/* refined category management inputs */\n#categories .category-add{align-items:center;gap:8px;padding:12px;flex-wrap:wrap}#categories .category-add input,#categories .category-add select{margin-bottom:0;min-width:160px}#categoryTable td{vertical-align:middle}#categoryTable .category-name-input,#categoryTable .category-sort-input,#categoryTable .category-parent-select{width:100%;box-sizing:border-box;margin:0;border:1px solid transparent;background:#f7efe4;color:var(--admin-text);border-radius:14px;padding:9px 11px;font-size:.92rem;box-shadow:inset 0 0 0 1px rgba(230,217,200,.72);transition:background .2s,box-shadow .2s,border-color .2s}#categoryTable .category-name-input:hover,#categoryTable .category-sort-input:hover,#categoryTable .category-parent-select:hover{background:#fffaf3;box-shadow:inset 0 0 0 1px #d7c6b4}#categoryTable .category-name-input:focus,#categoryTable .category-sort-input:focus,#categoryTable .category-parent-select:focus{background:#fffdf8;border-color:var(--admin-accent);box-shadow:0 0 0 3px rgba(184,107,75,.12);outline:none}#categoryTable .category-parent-select{appearance:auto;min-width:150px}#categoryTable .category-sort-input{text-align:center;min-width:76px}#categoryTable small{display:block;margin-top:6px;color:var(--admin-muted);font-size:.76rem;white-space:nowrap}.category-actions{justify-content:flex-end}.category-actions button{padding:7px 11px}\n/* single line add bookmark form */
.add-new:not(.category-add){display:flex;align-items:center;gap:8px;flex-wrap:nowrap;padding:12px}.add-new:not(.category-add)>input,.add-new:not(.category-add)>select{flex:0 0 130px;min-width:0;margin-bottom:0}.add-new:not(.category-add)>#addName{flex-basis:120px}.add-new:not(.category-add)>#addUrl{flex-basis:190px}.add-new:not(.category-add)>#addDesc{flex-basis:170px}.add-new:not(.category-add)>#addVisibility{flex-basis:110px}.add-new:not(.category-add) .logo-field{flex:0 0 190px;min-width:0;display:flex;flex-direction:row;align-items:center;gap:6px}.add-new:not(.category-add) .logo-field input{min-width:0;flex:1;margin-bottom:0}.add-new:not(.category-add) .logo-field button{flex:0 0 auto;white-space:nowrap;margin-bottom:0}.add-new:not(.category-add) .add-action-field{flex:0 0 auto;min-width:0;display:flex;gap:6px}.add-new:not(.category-add) .add-action-field:has(#addCatelog){flex:0 0 150px}.add-new:not(.category-add) .add-action-field:has(#addTags){flex:0 0 190px}.add-new:not(.category-add) .add-action-field>select:not([style*="display:none"]),.add-new:not(.category-add) .add-action-field>select:not([style*="display: none"]){min-width:110px}.add-new:not(.category-add) .add-submit-row{flex:0 0 auto;min-width:0;display:flex;align-items:center;gap:6px}.add-new:not(.category-add) .add-submit-row input{width:90px;min-width:0;margin-bottom:0}.add-new:not(.category-add) .add-submit-row button{width:auto;white-space:nowrap;margin-bottom:0;padding-left:16px;padding-right:16px}@media(max-width:900px){.add-new:not(.category-add){padding-bottom:14px}.add-new:not(.category-add)>input,.add-new:not(.category-add)>select{flex-basis:130px}.add-new:not(.category-add)>#addUrl{flex-basis:180px}}
/* integrated favicon action input */
.logo-field,.add-action-field{position:relative;display:block;flex:0 0 210px;min-width:190px;margin:0}
.logo-field input,.add-action-field input{width:100%;box-sizing:border-box;padding-right:46px!important;margin-bottom:0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.logo-field button,.add-action-field button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;min-width:34px;padding:0;margin:0;border-radius:11px;background:rgba(184,107,75,.10);color:var(--admin-accent);box-shadow:none;border:1px solid rgba(184,107,75,.16);display:inline-flex;align-items:center;justify-content:center;font-size:16px;line-height:1;backdrop-filter:blur(8px)}
.logo-field button:hover,.add-action-field button:hover{background:rgba(184,107,75,.18);color:#8f513b}
.logo-field button:disabled,.add-action-field button:disabled{cursor:wait;opacity:.72}
@media(max-width:640px){
  .add-new:not(.category-add){display:grid!important;grid-template-columns:1fr!important;overflow:visible!important}
  .add-new:not(.category-add)>input,.add-new:not(.category-add)>select,.add-new:not(.category-add)>.logo-field,.add-new:not(.category-add)>.add-action-field,.add-new:not(.category-add)>.add-submit-row{width:100%!important;min-width:0!important;flex-basis:auto!important}
  .logo-field input,.add-action-field input{font-size:16px}
}

/* compact import/export and bulk toolbar */
.import-group{display:flex;align-items:center;gap:8px}
.import-group select{width:auto;min-width:132px;margin:0}
.action-menu{position:relative}
.action-menu summary{list-style:none;cursor:pointer;user-select:none;border-radius:12px;background:var(--admin-accent);color:#fff;padding:8px 14px;font-size:.9rem;font-weight:700}
.action-menu summary::-webkit-details-marker{display:none}
.action-menu summary::after{content:'▾';margin-left:8px;font-size:.75rem;opacity:.85}
.action-menu[open] summary::after{content:'▴'}
.action-menu-panel{position:absolute;right:0;top:calc(100% + 8px);z-index:20;display:grid;gap:6px;min-width:160px;padding:8px;border:1px solid var(--admin-line);border-radius:14px;background:#fffaf3;box-shadow:0 18px 44px rgba(71,52,35,.16)}
.action-menu-panel button{width:100%;text-align:left;background:#fffdf8!important;color:var(--admin-text)!important;border:1px solid var(--admin-line)!important;padding:8px 10px;font-size:.88rem}
.action-menu-panel button:hover{background:#f3eadf!important}
.bulk-toolbar{display:grid!important;grid-template-columns:minmax(210px,auto) minmax(170px,220px) 1fr;grid-template-areas:'select filter actions' 'edit edit edit';align-items:center;gap:12px;background:#fffaf3!important;border-color:var(--admin-line)!important}
.bulk-group{display:flex;align-items:center;gap:8px;min-width:0}
.bulk-select-group{grid-area:select;white-space:nowrap}
.bulk-edit-group{grid-area:edit;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 150px 170px 108px;gap:10px;padding-top:12px;border-top:1px solid var(--admin-line)}
.bulk-filter-group{grid-area:filter}
.bulk-filter-group select{min-width:170px}
.bulk-action-group{grid-area:actions;justify-content:flex-end;flex-wrap:wrap}
.bulk-result-panel{margin:-4px 0 12px;padding:12px 14px;border:1px solid var(--admin-line);border-radius:16px;background:linear-gradient(180deg,#fffdf8,#f7efe4);color:var(--admin-text);box-shadow:0 8px 22px rgba(71,52,35,.055)}
.bulk-result-panel.bulk-result-error{border-color:#e0b0a4;background:#fff7f4}
.bulk-result-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
.bulk-result-head strong{display:block;color:var(--admin-text)}
.bulk-result-head small{display:block;margin-top:3px;color:var(--admin-muted)}
.bulk-result-panel button{padding:6px 10px!important;font-size:.82rem!important;border-radius:10px!important}
.bulk-result-list{display:grid;gap:6px;max-height:180px;overflow:auto;margin-top:8px}
.bulk-result-item{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 10px;border:1px solid rgba(230,217,200,.72);border-radius:12px;background:rgba(255,250,243,.72);font-size:.86rem}
.bulk-result-item small{display:block;color:var(--admin-muted);margin-top:2px}
.bulk-result-item .health{flex:0 0 auto}
.bulk-toolbar input[type=text],.bulk-toolbar select{min-width:0!important;width:100%;margin:0!important;box-sizing:border-box}
.bulk-toolbar button{white-space:nowrap;margin:0!important;padding:9px 13px;font-size:.92rem}
#selectedCount{margin-right:0!important;white-space:nowrap}
@media(max-width:1180px){
  .bulk-toolbar{grid-template-columns:1fr!important;grid-template-areas:'select' 'filter' 'actions' 'edit'}
  .bulk-select-group,.bulk-filter-group,.bulk-action-group{justify-content:flex-start}
  .bulk-edit-group{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bulk-edit-group #bulkUpdateBtn{grid-column:1/-1}
}
@media(max-width:640px){
  .admin-header-actions .import-export{display:grid;grid-template-columns:1fr;gap:8px;width:100%}
  .import-group{display:grid;grid-template-columns:1fr auto;width:100%}
  .import-group select{width:100%;min-width:0}
  .action-menu summary{width:100%;box-sizing:border-box;text-align:center}
  .action-menu-panel{position:static;margin-top:8px;grid-template-columns:1fr 1fr;min-width:0}
  .action-menu-panel button{text-align:center}
  .bulk-toolbar{padding:10px!important}
  .bulk-group{width:100%}
  .bulk-select-group{justify-content:space-between}
  .bulk-edit-group{grid-template-columns:1fr!important}
  .bulk-filter-group select{width:100%}
  .bulk-action-group{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .bulk-toolbar button{width:100%;padding:10px 8px;font-size:.9rem}
  }
@media(max-width:380px){
  .bulk-action-group,.action-menu-panel{grid-template-columns:1fr}
  .import-group{grid-template-columns:1fr}
  .import-group button{width:100%}
}

/* enhanced bookmark pagination controls */
.pagination{display:flex!important;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;text-align:center;margin-top:20px}
.pagination button{margin:0!important}
.page-size-control,.page-jump-control{display:inline-flex;align-items:center;gap:6px;color:var(--admin-muted);font-size:.9rem;font-weight:700}
.page-size-control select,.page-jump-control input{width:auto!important;min-width:0!important;margin:0!important;padding:7px 10px!important;border:1px solid var(--admin-line)!important;border-radius:10px!important;background:#fffdf8!important;color:var(--admin-text)!important}
.page-size-control select{min-width:76px}
.page-jump-control input{width:76px!important;text-align:center}
@media(max-width:640px){.pagination{justify-content:flex-start}.page-size-control,.page-jump-control{width:auto}.page-jump-control input{width:72px!important}}

/* compact density mode for bookmark list */
.config-density-compact #configTable th,.config-density-compact #configTable td{padding:5px 7px;font-size:.85rem;line-height:1.3}
.config-density-compact #configTable .inline-input{padding:5px 8px;font-size:.84rem;border-radius:8px}
.config-density-compact #configTable .site-cell{min-width:180px;gap:8px}
.config-density-compact #configTable .site-logo{width:24px;height:24px;border-radius:7px}
.config-density-compact #configTable .site-meta{gap:2px}
.config-density-compact #configTable .actions button{padding:4px 7px;font-size:.76rem;border-radius:8px}
.config-density-compact #configTable .health{padding:2px 6px;font-size:.72rem}
.config-density-compact .bulk-toolbar{padding:8px!important;gap:8px}
.config-density-compact .bulk-toolbar button{padding:6px 10px;font-size:.84rem}
.config-density-compact .pagination{gap:6px}
.config-density-compact .pagination button{padding:6px 10px;font-size:.84rem}

.system-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.announcement-preview{border:1px solid var(--admin-line);border-radius:16px;background:#fffdf8;padding:16px;color:var(--admin-text);line-height:1.65}
.announcement-preview h1,.announcement-preview h2,.announcement-preview h3{margin:.2em 0 .55em;color:var(--admin-text)}
.announcement-preview p{margin:.45em 0;color:var(--admin-muted)}
.announcement-preview ul,.announcement-preview ol{margin:.5em 0 .5em 1.25em;color:var(--admin-muted)}
.announcement-preview code{border-radius:6px;background:#f3eadf;padding:2px 5px;color:#8a553d}
.announcement-preview pre{overflow:auto;border-radius:12px;background:#2b211b;color:#fff7ed;padding:12px}
.announcement-preview a{color:var(--admin-accent-2);text-decoration:underline}
.ann-edit-list{display:flex;flex-direction:column;gap:12px;margin:12px 0}
.ann-edit-item{border:1px solid var(--admin-line);border-radius:14px;padding:12px;background:#fffdf8;display:flex;flex-direction:column;gap:8px}
.ann-edit-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ann-edit-row input[type="text"]{flex:1;min-width:140px;margin:0}
.ann-section{margin-top:12px;border:1px solid var(--admin-line);border-radius:14px;background:#fffdf8;overflow:hidden}
.ann-section summary{cursor:pointer;list-style:none;padding:12px 14px;font-weight:600;color:var(--admin-text);display:flex;align-items:center;gap:8px;user-select:none}
.ann-section summary::-webkit-details-marker{display:none}
.ann-section summary::after{content:"▸";margin-left:auto;color:var(--admin-muted);transition:transform .15s ease}
.ann-section[open] summary::after{transform:rotate(90deg)}
.ann-section-hint{font-weight:400;font-size:.78rem;color:var(--admin-muted)}
.ann-section .ann-edit-list{padding:0 14px}
.ann-section .secondary-btn{margin:0 14px}
.ann-section .category-hint{padding:0 14px}
.ann-edit-row select{margin:0;width:auto}
.ann-publish-time{color:var(--admin-muted);font-size:.78rem;white-space:nowrap}
.ann-edit-item textarea{margin:0;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.85rem}
@media(max-width:640px){.system-settings-grid{grid-template-columns:1fr}}

.category-add-panel{align-items:center;background:linear-gradient(135deg,#fffdf8,#f7efe4)!important;border:1px solid var(--admin-line);border-radius:18px;box-shadow:0 10px 26px rgba(71,52,35,.06)}.category-color-editor{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:74px}.category-color-editor-new{flex:0 0 auto}.category-color-editor input{margin:0!important}.category-native-color{appearance:none;-webkit-appearance:none;width:38px!important;height:38px!important;min-width:38px!important;padding:0!important;border:0!important;border-radius:13px!important;background:transparent!important;box-shadow:0 0 0 1px var(--admin-line),0 8px 18px rgba(71,52,35,.12)!important;cursor:pointer;overflow:hidden}.category-native-color::-webkit-color-swatch-wrapper{padding:0}.category-native-color::-webkit-color-swatch{border:0;border-radius:12px}.category-native-color::-moz-color-swatch{border:0;border-radius:12px}.category-color-preview{display:inline-flex;width:26px;height:26px;flex:0 0 26px;border-radius:999px;border:1px solid rgba(255,255,255,.8);background:#b86b4b;box-shadow:0 0 0 1px var(--admin-line),0 6px 14px rgba(71,52,35,.12)}#categoryTable{min-width:0;table-layout:auto;width:100%}#categoryTable th,#categoryTable td{white-space:nowrap;vertical-align:middle}#categoryTable th:nth-child(1),#categoryTable td:nth-child(1){width:56px}#categoryTable th:nth-child(2),#categoryTable td:nth-child(2){width:130px}#categoryTable th:nth-child(3),#categoryTable td:nth-child(3){width:150px}#categoryTable th:nth-child(4),#categoryTable td:nth-child(4){width:120px}#categoryTable th:nth-child(5),#categoryTable td:nth-child(5){width:240px}#categoryTable th:nth-child(6),#categoryTable td:nth-child(6){width:72px;text-align:center}#categoryTable th:nth-child(7),#categoryTable td:nth-child(7){width:72px;text-align:center}#categoryTable th:nth-child(8),#categoryTable td:nth-child(8){width:72px;text-align:center}#categoryTable th:nth-child(9),#categoryTable td:nth-child(9){width:130px}.category-name-input{min-width:0!important}.category-icon-input{min-width:0!important}.category-description-input{min-width:180px!important}.category-sort-input{width:72px!important;min-width:0!important}.category-parent-select{min-width:0!important}
#categoryTable input:not([type="color"]),#categoryTable select{height:38px;width:100%;min-width:0;margin:0!important;padding:8px 12px!important;border:1px solid var(--admin-line)!important;border-radius:14px!important;background:#fffaf3!important;color:var(--admin-text)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.72),0 6px 16px rgba(71,52,35,.05)!important;outline:none!important;box-sizing:border-box}#categoryTable input:not([type="color"]):focus,#categoryTable select:focus{border-color:var(--admin-accent)!important;box-shadow:0 0 0 3px rgba(184,107,75,.14)!important}#categoryTable thead th{white-space:nowrap!important;word-break:keep-all!important;line-height:1.2!important}#categoryTable td small{display:block;margin-top:6px;color:var(--admin-muted);font-size:.78rem;white-space:nowrap}.category-actions{display:flex;gap:8px;align-items:center;justify-content:flex-start}.category-actions button{white-space:nowrap;padding:8px 12px!important;border-radius:12px!important}
.tag-toolbar-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tag-total-badge{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--admin-line);border-radius:999px;background:#fffdf8;color:var(--admin-muted);padding:8px 12px;font-weight:700}.tag-total-badge strong{color:var(--admin-text);font-size:1.05rem}
.tag-merge-card{display:grid;grid-template-columns:minmax(220px,1.2fr) minmax(150px,.7fr) minmax(150px,.7fr) auto auto;gap:10px;align-items:center;margin:0 0 14px;padding:14px;border:1px solid var(--admin-line);border-radius:18px;background:linear-gradient(180deg,#fffdf8,#f7efe4);box-shadow:0 10px 26px rgba(71,52,35,.06)}
.tag-merge-card strong{display:block;color:var(--admin-text);margin-bottom:4px}
.tag-merge-card input{margin:0!important;min-width:0!important;width:100%;box-sizing:border-box}
.tag-merge-card button{white-space:nowrap}
@media(max-width:860px){.tag-merge-card{grid-template-columns:1fr}.tag-merge-card button{width:100%}}

/* category drag sort */
.category-row{cursor:move;transition:background .15s ease}
.category-row .drag-handle{display:inline-flex;align-items:center;gap:6px;color:var(--admin-muted);font-weight:700;letter-spacing:.5px;user-select:none}
.category-row.dragging{opacity:.55;background:rgba(184,107,75,.08)}
.category-row.drag-over{outline:2px dashed var(--admin-accent);outline-offset:-2px;background:rgba(184,107,75,.06)}
/* operation logs */
.operation-log-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.operation-log-controls select{margin:0;min-width:170px}
#operationLogTable{min-width:920px}
#operationLogTable td{vertical-align:middle}
/* backups */
.backup-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#backups .category-toolbar{align-items:flex-start;padding:14px 16px;border:1px solid rgba(230,217,200,.72);border-radius:18px;background:linear-gradient(135deg,rgba(255,253,248,.9),rgba(247,239,228,.7));box-shadow:0 10px 26px rgba(71,52,35,.05)}
.webdav-card{position:relative;margin:14px 0 18px;padding:18px;border:1px solid rgba(230,217,200,.92);border-radius:22px;background:radial-gradient(circle at 95% 8%,rgba(47,111,94,.14),transparent 30%),linear-gradient(135deg,#fffdf8 0%,#fff7ee 54%,#f7efe4 100%);box-shadow:0 18px 42px rgba(71,52,35,.10);overflow:hidden}
.webdav-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,var(--admin-accent-2),var(--admin-accent-3),var(--admin-accent))}
.webdav-card-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
.webdav-card-head h3{margin:4px 0 7px;color:var(--admin-text);font-size:1.22rem;letter-spacing:-.02em}
.webdav-card-head p{max-width:820px;margin:0;color:var(--admin-muted);line-height:1.7;font-size:.92rem}
.webdav-eyebrow{display:inline-flex;align-items:center;gap:6px;color:var(--admin-accent-2);font-size:.72rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.webdav-eyebrow::before{content:'☁';font-size:.9rem;letter-spacing:0}
.webdav-badge{flex:0 0 auto;display:inline-flex;align-items:center;border:1px solid rgba(47,111,94,.2);border-radius:999px;background:rgba(47,111,94,.09);color:var(--admin-accent-2);padding:7px 11px;font-size:.8rem;font-weight:800}
.webdav-form-grid{display:grid;grid-template-columns:180px minmax(280px,1.4fr) minmax(220px,1fr);gap:12px}
.webdav-field{display:flex!important;flex-direction:column;gap:8px;min-width:0;margin:0;padding:12px;border:1px solid rgba(230,217,200,.78);border-radius:18px;background:rgba(255,250,243,.78);box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 8px 18px rgba(71,52,35,.045)}
.webdav-field span{color:var(--admin-muted);font-size:.82rem;font-weight:800}
.webdav-field input,.webdav-field select{width:100%!important;min-width:0!important;margin:0!important;box-sizing:border-box;border-radius:14px!important;background:#fffdf8!important}
.webdav-url-field{grid-column:span 2}
.webdav-enabled-field select{font-weight:800;color:var(--admin-accent-2)}
.webdav-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px dashed var(--admin-line)}
.webdav-actions>div{display:flex;gap:10px;flex-wrap:wrap}
.webdav-actions button{padding:10px 18px;font-weight:800}
.webdav-hint{display:inline-flex;align-items:center;gap:6px;color:var(--admin-muted);font-size:.86rem}
.webdav-hint:not(:empty)::before{content:'🔐'}
#backups .table-wrapper{margin-top:0;border:0;box-shadow:none;background:transparent;padding:0}
#backupTable{min-width:0;width:100%}
#backupTable td{vertical-align:middle}
.backup-time{font-weight:600}
.backup-id{margin-top:2px;color:var(--admin-muted);font-size:.72rem;word-break:break-all}
@media(max-width:1100px){.webdav-form-grid{grid-template-columns:1fr 1fr}.webdav-url-field{grid-column:1/-1}}
@media(max-width:640px){.webdav-card{padding:14px;border-radius:18px}.webdav-card-head{display:block}.webdav-badge{margin-top:10px}.webdav-form-grid{grid-template-columns:1fr}.webdav-url-field{grid-column:auto}.webdav-actions,.webdav-actions>div{display:grid;grid-template-columns:1fr;width:100%}.webdav-actions button{width:100%}}


/* space management polish */
#spaces .category-add-panel{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:nowrap!important;overflow-x:auto!important;padding:18px 20px!important}
#spaces .category-add-panel input,#spaces .category-add-panel select{flex:1 0 150px!important;min-width:140px!important;margin:0!important;box-sizing:border-box}
#spaces .category-add-panel #newSpaceName{flex-basis:180px!important}
#spaces .category-add-panel #newSpaceSlug{flex-basis:190px!important}
#spaces .category-add-panel #newSpaceIcon{flex-basis:180px!important}
#spaces .category-add-panel #newSpaceDescription{flex-basis:210px!important}
#spaces .category-add-panel #newSpaceVisibility{flex:0 0 150px!important}
#spaces .category-add-panel #newSpaceSort{flex:0 0 150px!important}
#spaces .category-add-panel #createSpaceBtn{flex:0 0 auto!important;white-space:nowrap!important;margin:0!important}
#spaceTable{min-width:1180px}
#spaceTable input,#spaceTable select{height:38px;margin:0!important;padding:8px 12px!important;border:1px solid var(--admin-line)!important;border-radius:14px!important;background:#fffaf3!important;color:var(--admin-text)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.72),0 6px 16px rgba(71,52,35,.05)!important;outline:none!important;box-sizing:border-box}
#spaceTable input:focus,#spaceTable select:focus{border-color:var(--admin-accent)!important;box-shadow:0 0 0 3px rgba(184,107,75,.14)!important}
#spaceTable .space-name-input{min-width:150px}
#spaceTable .space-slug-input{min-width:150px}
#spaceTable .space-icon-input{min-width:140px}
#spaceTable .space-description-input{min-width:220px}
#spaceTable .space-visibility-select{min-width:130px}
#spaceTable .space-sort-input{min-width:130px}
@media(max-width:900px){#spaces .category-add-panel{display:grid!important;grid-template-columns:1fr!important;overflow:visible!important}#spaces .category-add-panel input,#spaces .category-add-panel select,#spaces .category-add-panel button{width:100%!important;min-width:0!important;flex-basis:auto!important}}


.add-site-modal{align-items:center;justify-content:center;padding:24px;overflow:hidden}
.add-site-modal .add-site-modal-content{width:min(640px,calc(100vw - 32px));max-width:640px;margin:0;max-height:none;overflow:visible;padding:18px 20px 16px;position:relative}
.add-site-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 8px}
.add-site-modal h2{margin:0;font-size:1.15rem}
.add-site-modal .modal-close{position:static;width:auto;height:auto;padding:6px 12px;border:1px solid var(--admin-line);border-radius:999px;background:#f3eadf;color:var(--admin-muted);font-size:.82rem;font-weight:600;line-height:1;box-shadow:none}
.add-site-modal .modal-close:hover{background:#ead4bd;color:var(--admin-text)}
.add-site-hint{margin:0 0 12px;color:var(--admin-muted);font-size:.8rem;line-height:1.45}
.add-site-form label{display:block;margin:0 0 4px;font-weight:600;color:var(--admin-text);font-size:.8rem}
.add-site-form input,.add-site-form select{width:100%;box-sizing:border-box;margin-bottom:0;padding:8px 10px}
.add-site-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.add-site-span-2{grid-column:1/-1;min-width:0}
.add-site-form .logo-field,.add-site-form .add-action-field{display:flex!important;flex-direction:row;align-items:center;gap:6px;width:100%;min-width:0;margin:0}
.add-site-form .logo-field input,.add-site-form .add-action-field input{flex:1;min-width:0;margin-bottom:0!important}
.add-site-form .logo-field button,.add-site-form .add-action-field button{flex:0 0 auto;margin:0;padding:8px 10px}
.add-site-status{margin:6px 0 0;padding:6px 8px;border-radius:10px;font-size:.78rem}
.add-site-status.status-loading{background:#f3eadf;color:var(--admin-muted)}
.add-site-status.status-success{background:#dfeee5;color:#2f6f5e}
.add-site-status.status-error{background:#f2d9d3;color:#963d3d}
.add-site-form .confirm-actions{margin-top:14px}
.admin-header{display:grid;grid-template-columns:220px minmax(0,1fr) auto;align-items:center;gap:16px;margin-bottom:16px;padding-bottom:12px}
.admin-header h1{font-size:1.15rem;margin:0;text-align:left}
.admin-header .logout-btn{margin:0}
.sidebar-dock{position:relative;margin:0;width:36px;height:36px;padding:0;border-radius:12px;background:#fff;color:var(--admin-text);border:1px solid var(--admin-line);box-shadow:none;display:inline-flex;align-items:center;justify-content:center}
.sidebar-dock-mark,.sidebar-dock-mark::before,.sidebar-dock-mark::after{display:block;width:12px;height:2px;border-radius:2px;background:currentColor;content:''}
.sidebar-dock-mark{position:relative;height:2px}
.sidebar-dock-mark::before{position:absolute;left:0;top:-5px;width:8px}
.sidebar-dock-mark::after{position:absolute;left:0;top:5px;width:16px}
.sidebar-dock:hover{background:#f3eadf;color:var(--admin-text)}
.sidebar-dock:hover::after{content:attr(title);position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);padding:4px 8px;border-radius:8px;background:#24211d;color:#fffdf8;font-size:.72rem;font-weight:700;white-space:nowrap;z-index:30}
.sidebar-dock.is-pinned{background:linear-gradient(180deg,#2f6f5e,#24584a);color:#fffdf8;border-color:transparent}
.sidebar-dock.is-pinned .sidebar-dock-mark::before{width:16px}
.sidebar-dock.is-pinned .sidebar-dock-mark::after{width:8px}
.container.sidebar-collapsed .admin-header{grid-template-columns:36px minmax(0,1fr) auto}
.tab-wrapper{position:relative;grid-template-columns:220px minmax(0,1fr)!important;margin-top:0;overflow:visible}
.tab-buttons{position:relative;padding:18px 8px 12px;gap:2px;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
.tab-wrapper.sidebar-collapsed{grid-template-columns:minmax(0,1fr)!important;padding-left:0;box-sizing:border-box;overflow-x:hidden}
.tab-wrapper.sidebar-collapsed.sidebar-peeking{overflow:visible}
.tab-wrapper.sidebar-collapsed > .tab-content{grid-column:1/-1!important;width:100%;max-width:100%;min-width:0;box-sizing:border-box}
.tab-wrapper.sidebar-collapsed .tab-buttons{position:absolute!important;left:0;top:0;width:220px;z-index:21;padding-top:18px;background:#fffaf3!important;transform:translateX(-110%);box-shadow:none;overflow:visible;pointer-events:none}
.tab-wrapper.sidebar-collapsed.sidebar-peeking::after{content:'';position:absolute;inset:0;background:rgba(36,33,29,.18);z-index:20;pointer-events:none;border-radius:18px}
.tab-wrapper.sidebar-collapsed.sidebar-peeking .tab-buttons{transform:translateX(0);pointer-events:auto;box-shadow:18px 12px 40px rgba(71,52,35,.22);background:#fffaf3!important;border:1px solid var(--admin-line)!important}
.tab-wrapper.sidebar-collapsed.sidebar-peeking .tab-text{opacity:1!important;transform:none!important;position:static!important;pointer-events:auto!important}
.tab-wrapper.sidebar-collapsed.sidebar-peeking .nav-badge{display:inline-block!important}
.tab-wrapper.sidebar-collapsed.sidebar-peeking .tab-button{justify-content:flex-start!important;padding-left:10px!important;padding-right:10px!important}
.sidebar-group{display:flex;flex-direction:column;gap:4px;padding-top:4px}
.sidebar-group + .sidebar-group{border-top:1px solid var(--admin-line);margin-top:6px;padding-top:8px}
.sidebar-group-label{padding:2px 10px 4px;color:var(--admin-muted);font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.tab-button{padding:8px 10px}
.nav-badge{margin-left:auto;min-width:1.5rem;padding:1px 7px;border-radius:999px;background:rgba(184,107,75,.12);color:var(--admin-accent);font-size:.72rem;font-weight:700;text-align:center}
.tab-button.active .nav-badge{background:rgba(255,255,255,.18);color:#fff}
.nav-badge[hidden]{display:none!important}
.config-list-toolbar{display:flex;align-items:center;gap:8px;margin:0 0 12px;flex-wrap:wrap}
.config-list-toolbar #searchInput{flex:1 1 220px;min-width:180px;margin:0!important}
.config-list-toolbar select{margin:0;min-width:120px}
.config-list-toolbar #openAddSiteBtn{flex:0 0 auto;white-space:nowrap;margin:0;padding:10px 16px}
#bulkToolbar[hidden]{display:none!important}
#configTable{min-width:0;width:100%}
#configTable td,#configTable th{vertical-align:middle}
.site-cell{display:flex;align-items:center;gap:10px;min-width:220px}
.site-logo{width:32px;height:32px;border-radius:10px;object-fit:contain;background:#fffdf8;border:1px solid var(--admin-line);flex:0 0 auto}
.site-logo.is-empty{display:inline-flex;align-items:center;justify-content:center;font-size:.78rem;color:var(--admin-muted);background:#f3eadf}
.site-meta{display:grid;gap:4px;min-width:0;flex:1}
.site-meta .inline-name{font-weight:600}
.site-meta .inline-url{font-size:.78rem;color:var(--admin-muted)}
.status-cell{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.vis-mark{display:inline-flex;padding:1px 7px;border-radius:999px;background:#efe7dc;color:var(--admin-muted);font-size:.72rem}
.vis-mark.is-private{background:#ead4bd;color:#8a553d}
.vis-mark.is-unlisted{background:#efe1cf;color:#756b5d}
.vis-mark.is-admin{background:#f2d9d3;color:#963d3d}
.backup-io-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 16px}
.backup-io-card{margin:0}
.backup-export-actions{display:flex;flex-wrap:wrap;gap:8px}
.backup-export-actions button{margin:0}
.backup-list-card{margin:16px 0 0}
.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 16px}
.page-head h2{margin:0 0 4px;font-size:1.18rem;color:var(--admin-text)}
.page-head .category-hint{margin:0;max-width:52rem}
.settings-stack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;max-width:none}
.settings-stack .settings-footer{grid-column:1/-1}
.settings-card,.ai-settings-card,.private-settings-card{width:100%;max-width:none;border:1px solid var(--admin-line);border-radius:18px;padding:18px;background:linear-gradient(180deg,#fffdf8,#f7efe4);box-shadow:0 10px 26px rgba(71,52,35,.06);box-sizing:border-box}
.settings-card-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px}
.settings-card-head h3{margin:0;font-size:1.05rem;color:var(--admin-text)}
.settings-card-head small{color:var(--admin-muted)}
.settings-card label,.ai-settings-card label{display:block;margin:0 0 6px;font-weight:600;color:var(--admin-text)}
.settings-card input[type=text],.settings-card input[type=password],.settings-card select,.settings-card textarea,.ai-settings-card input[type=text],.ai-settings-card input[type=password],.ai-settings-card select,.ai-settings-card textarea{width:100%;box-sizing:border-box;margin-bottom:12px}
.settings-card input[type=checkbox],.ai-settings-card input[type=checkbox]{margin-right:6px}
.settings-toggles{display:grid;gap:8px;margin:4px 0 12px}
.settings-toggles label{font-weight:500}
.settings-footer{display:grid;gap:10px}
.token-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px;margin-bottom:12px}
.token-form-grid > div,.token-form-grid > label{min-width:0}
.token-span-2,.settings-check{grid-column:1/-1}
.token-form-grid input,.token-form-grid select,.token-form-grid textarea{margin-bottom:0!important}
.token-table-wrap{margin-top:14px}
.token-note{margin-top:4px;color:var(--admin-muted);font-size:.75rem}
.token-revoked{color:var(--admin-muted);font-size:.82rem}
.admin-overview{display:none!important}
html,body{overflow-x:hidden}
body{padding:0!important}
.container{max-width:none!important;margin:0!important;min-height:100vh;border:0!important;border-radius:0!important;box-shadow:none!important;backdrop-filter:none!important;background:transparent!important;padding:10px 16px 24px!important;overflow-x:hidden;box-sizing:border-box}
.settings-stack,.settings-card,.ai-settings-card,.private-settings-card,.token-form-grid{min-width:0;box-sizing:border-box}
.tab-buttons{border:1px solid var(--admin-line)!important;box-shadow:none!important;background:#fffaf3!important;border-radius:18px}
.tab-content{border:1px solid var(--admin-line)!important;box-shadow:none!important;background:rgba(255,253,248,.86)!important;padding:16px 18px!important;border-radius:18px}
.table-wrapper{border:0!important;box-shadow:none!important;background:transparent!important;overflow:visible!important;max-height:none!important;padding:0!important}
.analytics-panel{border:0!important;box-shadow:none!important;background:transparent!important;padding:4px 0 12px!important}
.analytics-panel-title{margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--admin-line)}
.tab-wrapper{gap:16px}
.mobile-nav-toggle,.mobile-nav-mask{display:none!important}
@media(max-width:1100px){
  .settings-stack,.token-form-grid{grid-template-columns:1fr}
}
@media(max-width:980px){
  .container{padding:10px 12px 88px!important}
  .admin-header,.container.sidebar-collapsed .admin-header{display:grid!important;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:10px}
  .admin-header h1{font-size:1rem;text-align:center}
  .admin-header .logout-btn{padding:7px 10px;font-size:.82rem}
  .sidebar-dock{display:none!important}
  .mobile-nav-toggle{display:inline-flex!important;align-items:center;justify-content:center;margin:0;padding:8px 12px;border-radius:999px;background:#fffdf8;color:var(--admin-text);border:1px solid var(--admin-line);font-size:.82rem;font-weight:700}
  .mobile-nav-mask{display:none;position:fixed;inset:0;z-index:35;background:rgba(36,33,29,.38)}
  .mobile-nav-mask[hidden]{display:none!important}
  body.mobile-nav-open .mobile-nav-mask{display:block!important}
  .tab-wrapper.sidebar-collapsed.sidebar-peeking::after{display:none!important}
  body.mobile-nav-open{overflow:hidden}
  .tab-wrapper{display:block!important;gap:0}
  .tab-wrapper.sidebar-collapsed{padding-left:0!important;overflow:visible!important}
  .tab-buttons,.tab-wrapper.sidebar-collapsed .tab-buttons{position:fixed!important;left:0;top:0;bottom:0;width:min(280px,86vw)!important;z-index:40;margin:0;padding:18px 12px 24px!important;border-radius:0 18px 18px 0!important;transform:translateX(-110%)!important;overflow-y:auto!important;overflow-x:hidden!important;pointer-events:auto!important;box-shadow:18px 0 40px rgba(71,52,35,.18)!important;background:#fffaf3!important}
  body.mobile-nav-open .tab-buttons,body.mobile-nav-open .tab-wrapper.sidebar-collapsed .tab-buttons{transform:translateX(0)!important}
  .sidebar-group{flex-direction:column!important;align-items:stretch!important;flex-wrap:nowrap!important;border-top:1px solid var(--admin-line);margin-top:8px;padding-top:8px}
  .sidebar-group:first-of-type{border-top:0;margin-top:0;padding-top:0}
  .sidebar-group-label{display:block!important}
  .tab-button{width:100%}
  .tab-wrapper.sidebar-collapsed .tab-text,.tab-wrapper.sidebar-collapsed .nav-badge{display:inline-block!important;opacity:1!important;position:static!important;transform:none!important}
  .tab-content{padding:12px!important}
  .page-head{display:block}
  .page-head h2{font-size:1.05rem}
  .config-list-toolbar{display:grid;grid-template-columns:1fr;gap:8px}
  .config-list-toolbar select,.config-list-toolbar #openAddSiteBtn,.config-list-toolbar #searchInput{width:100%;min-width:0}
  #configDensityMode{display:none}
  .table-wrapper{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
  #config .table-wrapper,#pending .table-wrapper{overflow:visible!important}
  #configTable,#pendingTable,#configTable thead,#pendingTable thead,#configTable tbody,#pendingTable tbody,#configTable tr,#pendingTable tr,#configTable td,#pendingTable td{display:block;width:100%;box-sizing:border-box}
  #configTable thead,#pendingTable thead{display:none}
  #configTable tr,#pendingTable tr{margin:0 0 12px;padding:12px;border:1px solid var(--admin-line);border-radius:16px;background:#fffdf8}
  #configTable td,#pendingTable td{padding:6px 0;border:0;min-width:0!important}
  #configTable td:nth-child(1){display:flex;justify-content:flex-end;padding-top:0}
  #configTable td:nth-child(3)::before,#configTable td:nth-child(4)::before{display:block;margin-bottom:4px;color:var(--admin-muted);font-size:.72rem;font-weight:700}
  #configTable td:nth-child(3)::before{content:'分类'}
  #configTable td:nth-child(4)::before{content:'标签'}
  #configTable .actions,#pendingTable .actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
  #configTable .actions button,#pendingTable .actions button{width:100%;margin:0;padding:8px 6px}
  /* 待审卡片：与书签列表(#configTable)一致的纵向堆叠卡片，弃用网格（网格项 width:100% 会让 auto 图标列膨胀至容器宽度并横向溢出页面）。tr/td 的 display:block 与卡片样式复用上方通用规则，此处只管字段排版。 */
  #pendingTable td:nth-child(1){display:flex;justify-content:flex-end;padding-top:0;color:var(--admin-muted);font-size:.74rem;line-height:1.3}
  #pendingTable td:nth-child(2){font-weight:700;font-size:1.04rem;color:var(--admin-text);line-height:1.3}
  #pendingTable td:nth-child(3)::before,#pendingTable td:nth-child(4)::before,#pendingTable td:nth-child(5)::before,#pendingTable td:nth-child(6)::before,#pendingTable td:nth-child(7)::before{display:block;margin-bottom:4px;color:var(--admin-muted);font-size:.72rem;font-weight:700}
  #pendingTable td:nth-child(3)::before{content:'网址'}
  #pendingTable td:nth-child(4)::before{content:'图标'}
  #pendingTable td:nth-child(5)::before{content:'描述'}
  #pendingTable td:nth-child(6)::before{content:'分类'}
  #pendingTable td:nth-child(7)::before{content:'标签'}
  #pendingTable td:nth-child(4) img{width:42px!important;height:42px!important;object-fit:contain;border-radius:12px;border:1px solid var(--admin-line);background:#fff;box-shadow:0 4px 10px rgba(71,52,35,.08)}
  #pendingTable td,#pendingTable a{overflow-wrap:anywhere;word-break:break-all}
  #pendingTable tr,#pendingTable td{max-width:100%;min-width:0;box-sizing:border-box}
  #pendingTable .actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;padding-top:10px;border-top:1px dashed var(--admin-line)}
  #pending .page-head .operation-log-controls select{flex:1 1 140px;min-width:0}
  .analytics-summary,.analytics-grid,.analytics-ops-strip,.quality-grid{grid-template-columns:1fr!important}
  .analytics-card{min-width:0}
  #categoryTable,#tagTable,#tagReviewTable,#apiTokenTable,#backupTable,#operationLogTable,#spaceTable{min-width:0!important;width:100%}
  #categoryTable th,#categoryTable td,#tagTable th,#tagTable td,#operationLogTable th,#operationLogTable td,#apiTokenTable th,#apiTokenTable td,#backupTable th,#backupTable td{white-space:normal}
  .add-site-grid{grid-template-columns:1fr}
  .add-site-span-2{grid-column:auto}
  .add-site-modal{padding:12px;align-items:flex-end}
  .add-site-modal .add-site-modal-content{width:100%;max-width:none;max-height:92vh;overflow:auto}
  .settings-card-head{display:block}
  .settings-card-head small{display:block;margin-top:4px}
  .backup-io-grid,.webdav-form-grid{grid-template-columns:1fr}
  .private-password-row{display:grid;grid-template-columns:1fr;gap:8px}
  .ai-actions{display:grid;grid-template-columns:1fr;gap:8px}
  .ai-actions button{width:100%}
  .pagination{justify-content:space-between}
  .modal-content{width:94%;max-width:none;margin:5% auto;padding:16px}
}
`;
