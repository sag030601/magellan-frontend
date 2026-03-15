const ContactInfoCard = ({ icon, title, content, delay = "0" }) => (
  <div
    className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 animate-fade-in-up border border-slate-200/50 hover:border-sky-300/50"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Glow effect */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>

    {/* Content */}
    <div className="relative">
      {/* Icon */}
      <div className="mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl text-white shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-sky-600 transition-colors">
        {title}
      </h4>

      {/* Content */}
      <div className="text-slate-600">
        {content}
      </div>

      {/* Bottom accent */}
      <div className="mt-4 h-1 w-0 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full group-hover:w-full transition-all duration-500"></div>
    </div>
  </div>
);


const InputField = ({ type, name, placeholder, icon, required }) => (
  <div className="group relative">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none">
      {icon}
    </div>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-300 pl-12 pr-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
      required={required}
    />
  </div>
);

export { ContactInfoCard, InputField };