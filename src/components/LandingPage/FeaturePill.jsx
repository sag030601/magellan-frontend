const FeaturePill = ({ icon, title, description, delay = "0" }) => (
  <div
    className="group relative animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Glow effect on hover */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-100 blur-lg transition-all duration-500"></div>
    
    {/* Card */}
    <div className="relative h-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:border-sky-500/50 transition-all duration-500 group-hover:scale-[1.02]">
      {/* Icon container */}
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        <div className="relative w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
          <span className="text-3xl">{icon}</span>
        </div>
      </div>

      {/* Content */}
      <div>
        <h4 className="text-xl font-bold text-white mb-3 group-hover:text-sky-400 transition-colors duration-300">
          {title}
        </h4>
        <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
          {description}
        </p>
      </div>

      {/* Animated arrow indicator */}
      <div className="mt-6 flex items-center gap-2 text-sky-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-2">
        <span>Explore</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>

      {/* Top-right decorative element */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-sky-400/5 to-transparent rounded-bl-3xl"></div>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-2xl"></div>
    </div>
  </div>
);

export default FeaturePill;