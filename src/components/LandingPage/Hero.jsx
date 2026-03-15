import { useState, useEffect } from "react";
import logo from "../../assets/logo.jpg";
import carousel from "../../assets/intro-carousel/1.jpg";
import carousel2 from "../../assets/intro-carousel/2.jpg";
import carousel3 from "../../assets/intro-carousel/3.jpg";

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const slides = [
    {
      image:  carousel ,
      title: "Excellence in Marine Services",
      text: "Comprehensive maritime solutions with a decade of industry expertise",
    },
    {
      image:  carousel2 ,
      title: "Professional Training Programs",
      text: "STCW certified training and skill development for maritime professionals",
    },
    {
      image: carousel3,
      title: "Complete Documentation Support",
      text: "Streamlined VISA processing and maritime documentation services",
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const scrollToSection = () => {
    const element = document.getElementById("about");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      

      <section
        id="intro"
        className="relative flex min-h-[100vh] items-center justify-center bg-slate-900 text-white overflow-hidden"
      >
        {/* Background slides with enhanced animations */}
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-image-transition ${
                index === currentSlide
                  ? "opacity-100 scale-100 z-10"
                  : "opacity-0 scale-110 z-0"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/95 animate-gradient-shift" />
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)] animate-pulse-slow" />
              </div>
            </div>
          ))}
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-sky-400/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-30 mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pt-24 pb-16 md:flex-row md:items-center md:justify-between">
          {/* Left content - smooth text transitions */}
          <div className="max-w-xl text-center md:text-left">
            <p className="text-[2rem] font-bold uppercase tracking-[0.24em] text-sky-300 animate-fade-in-down">
              Zivya Marine Services Pvt Ltd
            </p>

            {/* Title with smooth transition */}
            <h1
              key={`title-${currentSlide}`}
              className="mt-3 text-3xl font-semibold leading-tight md:text-4xl text-fade-in"
            >
              {slides[currentSlide].title}
            </h1>

            {/* Description with smooth transition */}
            <p
              key={`text-${currentSlide}`}
              className="mt-4 text-sm text-slate-200 md:text-[15px] text-fade-in animation-delay-100"
            >
              {slides[currentSlide].text}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start animate-fade-in-up animation-delay-300">
              <a
                href="#services"
                className="group relative rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-sky-500/50 hover:shadow-xl hover:shadow-sky-400/70 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <span className="relative inline-block group-hover:animate-bounce-subtle z-10">
                  View Services
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-full" />
              </a>
              <a
                href="#contact"
                className="group rounded-full border border-sky-400/50 bg-slate-900/50 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 hover:border-sky-300 hover:text-sky-200 hover:bg-slate-800/80 backdrop-blur transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Contact Us
              </a>
            </div>

            {/* Carousel controls */}
            <div className="mt-6 flex items-center justify-center gap-4 md:justify-start animate-fade-in animation-delay-400">
              <button
                type="button"
                onClick={prevSlide}
                className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-500/70 bg-slate-950/60 text-lg text-slate-200 hover:border-sky-400 hover:text-sky-200 hover:bg-slate-900/80 backdrop-blur transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <span className="group-hover:-translate-x-0.5 transition-transform">
                  ‹
                </span>
              </button>

              <div className="flex items-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={`relative h-2.5 rounded-full transition-all duration-500 ${
                      index === currentSlide
                        ? "w-8 bg-sky-400 shadow-lg shadow-sky-300/60"
                        : "w-2.5 bg-slate-500/70 hover:bg-sky-300/80 hover:scale-125"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  >
                    {index === currentSlide && (
                      <span className="absolute inset-0 rounded-full bg-sky-300 animate-ping opacity-75" />
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={nextSlide}
                className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-500/70 bg-slate-950/60 text-lg text-slate-200 hover:border-sky-400 hover:text-sky-200 hover:bg-slate-900/80 backdrop-blur transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <span className="group-hover:translate-x-0.5 transition-transform">
                  ›
                </span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1 w-full max-w-xs mx-auto md:mx-0 bg-slate-800/50 rounded-full overflow-hidden">
              <div
                key={`progress-${currentSlide}`}
                className="h-full bg-gradient-to-r from-sky-500 to-sky-300"
                style={{
                  animation: isAutoPlaying ? "progress 5s linear" : "none",
                }}
              />
            </div>
          </div>

          {/* Right stats card */}
          <div className="mt-6 w-full max-w-[30vw] max-h-[30vw] rounded-2xl border border-sky-500/40 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-6 shadow-2xl shadow-sky-900/50 backdrop-blur-lg md:mt-0 animate-slide-in-right hover:border-sky-400/80 hover:shadow-sky-800/70 transition-all duration-500 hover:scale-[1.02]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/50">
                <span className="inline-block w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
              </span>
              At a glance
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 text-center text-[11px] text-slate-100">
              <HighlightStat label="Years of Expertise" value="10+" delay="0" icon="⚓" />
              <HighlightStat label="Marine Services" value="6+" delay="100" icon="🌊" />
              <HighlightStat
                label="Training & Docs"
                value="STCW / VISA"
                delay="200"
                icon="📋"
              />
              <HighlightStat
                label="Location"
                value="Mumbai, India"
                delay="300"
                icon="📍"
              />
            </div>

            <p className="mt-5 text-[11px] text-slate-300 leading-relaxed animate-fade-in animation-delay-400">
              One-stop partner for training, documentation, and HR solutions in
              the maritime industry.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3 p-3 rounded-lg bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-400/30 animate-fade-in animation-delay-500 hover:border-sky-400/60 transition-colors duration-300">
              <div className="relative">
                <img
                  src={logo}
                  alt="Zivya Logo small"
                  className="h-8 w-8 rounded-full border-2 border-sky-500/60 bg-slate-900 object-contain shadow-lg shadow-sky-500/30"
                />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-950 animate-pulse" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-300 font-semibold">
                Trusted Marine HR Partner
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          type="button"
          onClick={scrollToSection}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 cursor-pointer group"
        >
          <div className="flex flex-col items-center gap-2 text-slate-400 hover:text-sky-300 transition-colors duration-300">
            <span className="text-xs uppercase tracking-wider font-semibold group-hover:text-sky-300">Scroll</span>
            <svg
              className="w-6 h-6 animate-bounce group-hover:scale-110 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </button>
      </section>
    </>
  );
};

const HighlightStat = ({ label, value, delay = "0", icon = "✦" }) => (
  <div
    className="group rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 hover:border-sky-500/70 hover:bg-slate-800/80 transition-all duration-300 hover:scale-110 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="text-2xl mb-2 group-hover:scale-125 transition-transform duration-300">
      {icon}
    </div>
    <div className="text-lg font-bold text-sky-400 group-hover:text-sky-300 transition-colors">
      {value}
    </div>
    <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors">
      {label}
    </div>
  </div>
);

export default Hero;
