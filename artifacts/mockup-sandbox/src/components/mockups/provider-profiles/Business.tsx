export function Business() {
  return (
    <div className="min-h-screen bg-[#EEF0F5] font-sans" style={{fontFamily:"system-ui,sans-serif"}}>
      {/* Status bar */}
      <div className="bg-[#0A0F1E] px-5 pt-3 pb-2 flex justify-between text-xs font-semibold text-gray-400">
        <span>9:41</span><span>100%</span>
      </div>

      {/* Company banner */}
      <div style={{background:"linear-gradient(135deg,#0A0F1E 0%,#132040 100%)"}} className="px-5 pt-3 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg border-2 border-blue-400/40">CR</div>
            <div>
              <p className="text-white font-bold text-base leading-tight">City Rescue Auto</p>
              <p className="text-blue-300 text-xs mt-0.5">Business Account</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-green-400 text-xs font-semibold">Open · Accepting jobs</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
        </div>

        {/* KPI metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {val:"$4,280", label:"This Month"},
            {val:"47",     label:"Jobs Done"},
            {val:"4.8",    label:"Avg Rating"},
          ].map(m => (
            <div key={m.label} className="bg-white/10 rounded-xl px-2 py-2.5 text-center border border-white/5">
              <p className="text-white font-bold text-lg leading-tight">{m.val}</p>
              <p className="text-blue-300 text-xs mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Business Management */}
      <div className="mx-4 mt-4 mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Business Management</p>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {[
            {color:"bg-purple-100", tc:"text-purple-600", label:"Team Members",       sub:"4 active technicians",     icon:"users"},
            {color:"bg-blue-100",   tc:"text-blue-600",   label:"Fleet Management",   sub:"3 vehicles registered",    icon:"truck"},
            {color:"bg-orange-100", tc:"text-orange-600", label:"Service Territory",  sub:"Downtown + East Side",     icon:"map-pin"},
            {color:"bg-green-100",  tc:"text-green-600",  label:"Business Hours",     sub:"Mon–Sat · 7am–9pm",        icon:"clock"},
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 ${item.color} rounded-xl flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${item.tc}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon === "users"   && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>}
                  {item.icon === "truck"   && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-2h2m6 0H9m4 0h4l2-2v-5l-1-2h-5"/>}
                  {item.icon === "map-pin" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>}
                  {item.icon === "clock"   && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>}
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Financials */}
      <div className="mx-4 mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Financials</p>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {[
            {color:"bg-emerald-100", tc:"text-emerald-600", label:"Revenue Analytics",  sub:"Reports & trends",         icon:"bar-chart"},
            {color:"bg-blue-100",    tc:"text-blue-600",    label:"Payout Account",      sub:"Chase Business ···4821",   icon:"credit-card"},
            {color:"bg-yellow-100",  tc:"text-yellow-600",  label:"Tax Documents",       sub:"1099-K available",         icon:"file-text"},
            {color:"bg-indigo-100",  tc:"text-indigo-600",  label:"Platform Fee",        sub:"Priority enabled · 10%",   icon:"percent"},
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 ${item.color} rounded-xl flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${item.tc}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon === "bar-chart"   && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>}
                  {item.icon === "credit-card" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>}
                  {item.icon === "file-text"   && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>}
                  {item.icon === "percent"     && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>}
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Compliance */}
      <div className="mx-4 mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Compliance & Credentials</p>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {[
            {color:"bg-green-100",  tc:"text-green-600",  label:"Business Verification", sub:"Fully verified",           green:true, icon:"shield-check"},
            {color:"bg-blue-100",   tc:"text-blue-600",   label:"Insurance & Licensing", sub:"Expires Dec 2025",          green:false, icon:"clipboard"},
            {color:"bg-yellow-100", tc:"text-yellow-600", label:"Certifications",        sub:"AAA Certified · EV Ready",  green:false, icon:"award"},
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 ${item.color} rounded-xl flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${item.tc}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon === "shield-check" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>}
                  {item.icon === "clipboard"    && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>}
                  {item.icon === "award"        && <><circle cx="12" cy="8" r="6"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>}
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className={`text-xs ${item.green ? "text-green-600 font-semibold" : "text-gray-500"}`}>{item.sub}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="mx-4 mb-6 bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-800 flex-1">Company Settings</p>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </div>
          <p className="text-sm font-semibold text-red-500 flex-1">Sign Out</p>
        </div>
      </div>
    </div>
  );
}
