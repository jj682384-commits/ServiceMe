export function Independent() {
  return (
    <div className="min-h-screen bg-[#F2F4F7] font-sans" style={{fontFamily:"system-ui,sans-serif"}}>
      {/* Status bar */}
      <div className="bg-[#F2F4F7] px-5 pt-3 pb-1 flex justify-between text-xs font-semibold text-gray-500">
        <span>9:41</span><span>100%</span>
      </div>

      {/* Header */}
      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">Hey there</p>
          <h1 className="text-2xl font-bold text-gray-900">Marcus</h1>
        </div>
        <div className="flex items-center gap-2 bg-green-100 border border-green-200 rounded-full px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold text-green-700">Online</span>
        </div>
      </div>

      {/* Hero earnings card */}
      <div className="mx-4 rounded-2xl overflow-hidden mb-3" style={{background:"linear-gradient(135deg,#1A1A2E 0%,#16213E 60%,#0F3460 100%)"}}>
        <div className="p-4">
          <p className="text-xs text-blue-300 font-semibold uppercase tracking-widest mb-1">Today's Earnings</p>
          <p className="text-4xl font-bold text-white mb-0.5">$84<span className="text-xl font-medium text-blue-300">.50</span></p>
          <p className="text-xs text-blue-300">+$12 from yesterday</p>
          <div className="mt-3 flex gap-3">
            <div className="bg-white/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-white text-lg font-bold">3</p>
              <p className="text-blue-200 text-xs">Jobs done</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-white text-lg font-bold">4.9</p>
              <p className="text-blue-200 text-xs">Rating</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-white text-lg font-bold">7 mi</p>
              <p className="text-blue-200 text-xs">Radius</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Services */}
      <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-800">My Services</p>
          <span className="text-xs text-blue-600 font-semibold">Edit</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            {label:"Flat Tire", on:true},
            {label:"Jump Start", on:true},
            {label:"Fuel Delivery", on:true},
            {label:"Lockout", on:false},
            {label:"Towing", on:false},
          ].map(s => (
            <span key={s.label} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${s.on ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* My Vehicle */}
      <div className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">My Ride</p>
              <p className="text-xs text-gray-500">2021 Toyota Camry · ABC-1234</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </div>
      </div>

      {/* Quick links */}
      <div className="mx-4 mb-3 bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        {[
          {icon:"dollar-sign", label:"Payout & Earnings", sub:"$284.50 available"},
          {icon:"shield",      label:"Verification",      sub:"ID Verified"},
          {icon:"bell",        label:"Notifications",     sub:"New job alerts on"},
          {icon:"zap",         label:"Priority Jobs",     sub:"Enabled — 10% fee"},
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon === "dollar-sign" && <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>}
                {item.icon === "shield"      && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>}
                {item.icon === "bell"        && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>}
                {item.icon === "zap"         && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>}
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

      {/* Account actions */}
      <div className="mx-4 mb-6 bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
          </div>
          <p className="text-sm font-semibold text-gray-800 flex-1">Switch to Driver Mode</p>
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
