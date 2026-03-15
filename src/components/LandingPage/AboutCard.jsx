const AboutCard = ({ icon, iconBg, image, badge, text, delay = "0" }) => (
  <div
    className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 animate-fade-in-up hover:scale-[1.02]"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Image with overlay */}
    <div className="relative h-56 overflow-hidden">
      <img
        src={image}
        alt={badge}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>

      {/* Animated border on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 border-2 border-sky-400/50 rounded-2xl"></div>
      </div>

      {/* Icon Badge */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-lg transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}
        >
          <span className="text-2xl">{icon}</span>
        </div>
      </div>

      {/* Badge label at bottom of image */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg">
          <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {badge}
          </span>
        </div>
      </div>
    </div>

    {/* Content */}
    <div className="p-6">
      <p className="text-sm leading-relaxed text-slate-600 group-hover:text-slate-700 transition-colors">
        {text}
      </p>

      {/* Read more link */}
      <div className="mt-4 flex items-center gap-2 text-sky-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        <span>Learn More</span>
        <svg
          className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>

    {/* Decorative corner element */}
    <div className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-sky-400/10 to-transparent rounded-bl-3xl"></div>
    </div>
  </div>
);

const StatCard = ({ number, label }) => (
  <div className="text-center group">
    <div className="relative inline-block">
      <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
      <div className="relative bg-white border border-sky-100 rounded-2xl px-6 py-4 shadow-lg group-hover:shadow-xl group-hover:border-sky-200 transition-all duration-300">
        <div className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
          {number}
        </div>
      </div>
    </div>
    <p className="mt-3 text-sm font-semibold text-slate-600 uppercase tracking-wider">
      {label}
    </p>
  </div>
);

export  { AboutCard, StatCard };
