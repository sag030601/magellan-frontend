const CareerPathCard = ({ icon, title, description, delay = "0" }) => (
  <div
    className="group relative bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 animate-fade-in-up border border-slate-200/50 hover:border-sky-300/50 hover:scale-105"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Glow effect */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-xl opacity-0 group-hover:opacity-10 blur transition-opacity duration-300"></div>

    {/* Content */}
    <div className="relative text-center">
      {/* Icon */}
      <div className="mb-4 inline-block">
        <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          <span className="text-3xl">{icon}</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
        {title}
      </h4>

      {/* Description */}
      <p className="text-sm text-slate-600">{description}</p>

      {/* Bottom accent */}
      <div className="mt-4 h-1 w-0 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full group-hover:w-full transition-all duration-500 mx-auto"></div>
    </div>
  </div>
);

const FeatureBox = ({ icon, title, description, delay = "0" }) => (
  <div
    className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 animate-fade-in-up border border-slate-200/50 hover:border-sky-300/50"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Hover glow */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>

    {/* Content */}
    <div className="relative">
      {/* Icon */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
          <span className="text-2xl">{icon}</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-sky-600 transition-colors">
        {title}
      </h4>

      {/* Description */}
      <p className="text-sm leading-relaxed text-slate-600 group-hover:text-slate-700 transition-colors">
        {description}
      </p>

      {/* Arrow indicator */}
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

    {/* Decorative corner */}
    <div className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-sky-400/10 to-transparent rounded-bl-3xl"></div>
    </div>
  </div>
);

export { CareerPathCard, FeatureBox };
