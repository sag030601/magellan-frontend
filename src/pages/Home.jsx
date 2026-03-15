import React, { useEffect, useState } from "react";
import logo from "../assets/logo.jpg";
import Hero from "../components/LandingPage/Hero";
import carousel1 from "../assets/intro-carousel/1.jpg";
import carousel2 from "../assets/intro-carousel/2.jpg";
import carousel3 from "../assets/intro-carousel/3.jpg";
import { StatCard } from "../components/LandingPage/AboutCard";
import { CareerPathCard, FeatureBox } from "../components/LandingPage/PathCard";
import { ContactInfoCard, InputField } from "../components/LandingPage/ContactInfoCard";

const slides = [
  {
    image: { carousel1 },
    title: "Your Marine Partner for all your Solution",
    text: "Our roots in management consulting enable us to bring a unique approach to recruitment. We provide a range of talent acquisition services by leveraging our domain knowledge built over decades.",
  },
  {
    image: { carousel2 },
    title: "Flag State Documentation",
    text: "Specialized in handling Flag state documents of Seafarers. Cost Effective & Cost Efficient Service.",
  },
  {
    image: { carousel3 },
    title: "Career Guidance",
    text: "Our Career Guide will help you to explore various career opportunities in the Marine Industry.",
  },
];

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isNavSolid, setIsNavSolid] = useState(false);

  // Auto-advance carousel
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000); // 6 seconds
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setIsNavSolid(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // TODO: call your Node.js API here
    console.log("Contact form submitted");
  };

  return (
    <div className="min-h-screen bg-slate-10 text-slate-900">
      {/* Header */}
      <header
        className={`fixed top-0 z-30 w-full h-[100px] transition-colors duration-300 ${isNavSolid ? "bg-slate-900/70 border-b border-slate-700/40 backdrop-blur" : "bg-transparent border-b border-transparent"}`}
      >
        <div className="mx-auto flex h-[100%] max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="#intro" className="flex items-center gap-4">
              <img
                src={logo}
                alt="Zivya Marine Logo"
                className="h-20 w-20 rounded-full border border-slate-700 bg-slate-900 object-contain shadow-sm shadow-sky-500/30"
              />
              <div className="leading-tight">
                <div className="text-xl font-semibold tracking-[0.16em] text-sky-300 uppercase">
                  Zivya Marine
                </div>
                <div className="text-[11px] text-slate-300">
                  HR & Marine Solutions
                </div>
              </div>
            </a>
          </div>

          <nav className="hidden items-center gap-6 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-200 md:flex">
            <a href="#intro" className="hover:text-sky-300">
              Home
            </a>
            <a href="#about" className="hover:text-sky-300">
              About Us
            </a>
            <a href="#services" className="hover:text-sky-300">
              Services
            </a>
            <a href="#team" className="hover:text-sky-300">
              Career Guidance
            </a>
            <a href="#contact" className="hover:text-sky-300">
              Contact
            </a>
            <a
              href="/login"
              className="rounded-full bg-sky-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-sky-500/40 hover:bg-sky-600"
            >
              Login
            </a>
          </nav>
        </div>
      </header>

      {/* Intro / Hero with carousel */}
      <Hero className="h-[30px]" />

      <main id="main" className="bg-slate-50 ">
        {/* Featured Services */}
        <section
          id="featured-services"
          className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-16"
        >
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-400 animate-fade-in">
                Why Choose Us
              </p>
              <h3
                className="mt-3 text-4xl font-bold text-white animate-fade-in-up"
                style={{ animationDelay: "100ms" }}
              >
                Our Commitment to Excellence
              </h3>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <FeaturePill
                icon="⭐"
                title="Quality"
                description="We aim in providing the best quality of services across all our offerings."
                delay="0"
              />
              <FeaturePill
                icon="⚡"
                title="Timely Delivery"
                description="We deliver services within an assured period of time, aligned with your schedule."
                delay="150"
              />
              <FeaturePill
                icon="🏆"
                title="Customer Satisfaction"
                description="We focus on customer satisfaction by providing timely and quality service."
                delay="300"
              />
            </div>
          </div>
        </section>

        {/* About Us */}
        <section
          id="about"
          className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 py-24"
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 -left-32 w-96 h-96 bg-sky-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 -right-32 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-sky-400/3 to-blue-400/3 rounded-full blur-3xl"></div>
          </div>

          {/* Animated grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(14 165 233) 1px, transparent 1px), linear-gradient(to bottom, rgb(14 165 233) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            ></div>
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header with enhanced animations */}
            <header className="mb-16 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-200/50 mb-4 animate-fade-in-down">
                <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Who We Are
                </p>
              </div>

              <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 animate-fade-in-up animation-delay-100">
                About{" "}
                <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  Zivya Marine
                </span>
              </h2>

              <div className="max-w-3xl mx-auto">
                <p className="text-lg leading-relaxed text-slate-600 animate-fade-in-up animation-delay-200">
                  We believe in safety and focus on quality training. Our team
                  of experts provide extensive training to meet the requirements
                  of STCW, Value Added Courses, Flag State and US Visa.
                </p>
                <p className="mt-4 text-base leading-relaxed text-slate-500 animate-fade-in-up animation-delay-300">
                  We promote education for the maritime industry and create an
                  environment that helps students stay ahead of changes in the
                  sector. Our experienced faculty ensures that students are
                  greatly benefited through their expertise.
                </p>
              </div>

              {/* Decorative line */}
              <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in animation-delay-400">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-sky-300"></div>
                <div className="w-2 h-2 bg-sky-400 rounded-full"></div>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-sky-300"></div>
              </div>
            </header>

            {/* Cards Grid */}
            <div className="grid gap-8 md:grid-cols-3">
              <AboutCard
                icon="🎯"
                iconBg="from-sky-500 to-blue-500"
                image="/img/about-mission.jpg"
                badge="Our Mission"
                text="Establish lasting relationships with our clients by exceeding expectations through professionalism, innovation, quality workmanship and reliability."
                delay="0"
              />
              <AboutCard
                icon="📋"
                iconBg="from-blue-500 to-cyan-500"
                image="/img/about-plan.jpg"
                badge="Our Plan"
                text="Drive and provide quality services that address the full lifecycle of marine HR and documentation needs."
                delay="100"
              />
              <AboutCard
                icon="🚀"
                iconBg="from-cyan-500 to-sky-500"
                image="/img/about-vision.jpg"
                badge="Our Vision"
                text="Merge boundaries and expand horizons to provide various marine solutions under one roof, globalizing our service range."
                delay="200"
              />
            </div>

            {/* Stats section */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up animation-delay-500">
              <StatCard number="10+" label="Years Experience" />
              <StatCard number="500+" label="Trained Professionals" />
              <StatCard number="6+" label="Services Offered" />
              <StatCard number="100%" label="Client Satisfaction" />
            </div>
          </div>
        </section>

        {/* Services */}
        <section
          id="services"
          className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white py-24"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-40 -right-32 w-96 h-96 bg-sky-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-40 -left-32 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>

            <div className="absolute inset-0 opacity-[0.02]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgb(14 165 233) 1px, transparent 1px), linear-gradient(to bottom, rgb(14 165 233) 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                }}
              ></div>
            </div>
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <header className="mb-16 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-sky-50 border border-sky-200/50 mb-6 animate-fade-in-down">
                <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                  What We Do
                </p>
              </div>

              {/* Title */}
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 animate-fade-in-up animation-delay-100">
                Our{" "}
                <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  Services
                </span>
              </h2>

              {/* Description */}
              <p className="text-lg leading-relaxed text-slate-600 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
                We provide a one-stop shop for marine solutions. As a credible,
                reliable and efficient group in the maritime sector, we
                personalise services to keep clients comfortable and well
                supported, while maintaining the highest quality standards.
              </p>

              {/* Decorative line */}
              <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in animation-delay-300">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-sky-300"></div>
                <div className="w-2 h-2 bg-sky-400 rounded-full"></div>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-sky-300"></div>
              </div>
            </header>

            {/* Services Grid */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <ServiceCard
                icon="📋"
                iconColor="from-sky-500 to-blue-500"
                title="STCW Documentation"
                description="Direction and support for booking DG Approved STCW courses with minimal steps and flexible scheduling. Tied up with various DG approved institutes."
                delay="0"
              />
              <ServiceCard
                icon="📚"
                iconColor="from-blue-500 to-cyan-500"
                title="Value Added Courses"
                description="Support for BTM, BRM, Type Specific Courses, Large Vessel Handling and more to enhance your marine career."
                delay="100"
              />
              <ServiceCard
                icon="🌐"
                iconColor="from-cyan-500 to-sky-500"
                title="Flag State Documentation"
                description="Specialised handling of seafarers' flag documents for ship owners, managers, manning agencies and consultants."
                delay="200"
              />
              <ServiceCard
                icon="🎯"
                iconColor="from-sky-600 to-blue-600"
                title="Career Guidance"
                description="Structured guidance on marine career paths, training, and global opportunities across shore, offshore, logistics and management."
                delay="300"
              />
              <ServiceCard
                icon="👥"
                iconColor="from-blue-600 to-cyan-600"
                title="HR Consultancy & Recruitment"
                description="Large database of efficient seafarers for LPG, Oil, Chemical & Dry fleets with end-to-end recruitment support."
                delay="400"
              />
              <ServiceCard
                icon="✈️"
                iconColor="from-cyan-600 to-sky-600"
                title="US Visa C1/D & B1/B2"
                description="End-to-end handling of US visa formalities, including express services when time is critical."
                delay="500"
              />
            </div>

            {/* CTA Section */}
            <div className="mt-20 text-center animate-fade-in-up animation-delay-600">
              <div className="inline-flex flex-col sm:flex-row items-center gap-4">
                <a
                  href="#contact"
                  className="group px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:shadow-sky-500/50 transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    Get Started
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </span>
                </a>
                <a
                  href="#about"
                  className="px-8 py-4 border-2 border-sky-500 text-sky-600 font-semibold rounded-full hover:bg-sky-50 transition-all duration-300 hover:scale-105"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Career Guidance */}
        <section
          id="team"
          className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white py-24"
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-sky-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>

            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.02]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgb(14 165 233) 1px, transparent 1px), linear-gradient(to bottom, rgb(14 165 233) 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                }}
              ></div>
            </div>

            {/* Floating elements */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-sky-400/20 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${10 + Math.random() * 10}s`,
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-16">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-sky-50 border border-sky-200/50 mb-6 animate-fade-in-down">
                <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Marine Careers
                </p>
              </div>

              {/* Title */}
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 animate-fade-in-up animation-delay-100">
                Career{" "}
                <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  Guidance
                </span>
              </h2>

              {/* Description */}
              <div className="max-w-3xl mx-auto space-y-4">
                <p className="text-lg leading-relaxed text-slate-600 animate-fade-in-up animation-delay-200">
                  The choice of a career is among the most important decisions
                  in life. We help you make an informed choice using structured
                  guidance, deep industry knowledge and a clear view of global
                  opportunities in the marine industry.
                </p>
                <p className="text-base leading-relaxed text-slate-500 animate-fade-in-up animation-delay-300">
                  We guide careers across shore-based roles, offshore
                  operations, logistics and management. Our programs focus on
                  educational requirements, STCW certification, pre-sea training
                  and job opportunities so you can build a sustainable,
                  rewarding career.
                </p>
              </div>

              {/* Decorative line */}
              <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in animation-delay-400">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-sky-300"></div>
                <div className="w-2 h-2 bg-sky-400 rounded-full"></div>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-sky-300"></div>
              </div>
            </div>

            {/* Career Paths Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
              <CareerPathCard
                icon="🚢"
                title="Shore-Based Roles"
                description="Office, logistics, and management positions"
                delay="0"
              />
              <CareerPathCard
                icon="⚓"
                title="Offshore Operations"
                description="Sea-going positions and vessel operations"
                delay="100"
              />
              <CareerPathCard
                icon="📦"
                title="Logistics"
                description="Supply chain and port management"
                delay="200"
              />
              <CareerPathCard
                icon="👔"
                title="Management"
                description="Leadership and strategic roles"
                delay="300"
              />
            </div>

            {/* Features Section */}
            <div className="grid gap-8 md:grid-cols-3 mb-16">
              <FeatureBox
                icon="📚"
                title="Educational Requirements"
                description="Clear roadmap of qualifications and certifications needed for your chosen career path"
                delay="400"
              />
              <FeatureBox
                icon="🎓"
                title="STCW Certification"
                description="Complete guidance on mandatory training and certification requirements"
                delay="500"
              />
              <FeatureBox
                icon="🌍"
                title="Global Opportunities"
                description="Access to international job markets and career advancement prospects"
                delay="600"
              />
            </div>

            {/* CTA Section */}
            <div className="text-center animate-fade-in-up animation-delay-700">
              <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl p-8 md:p-12 border border-sky-200/50">
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                  Ready to Start Your Marine Career?
                </h3>
                <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
                  Get personalized career guidance from our experienced team and
                  take the first step towards a rewarding maritime profession.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="#contact"
                    className="group px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:shadow-sky-500/50 transition-all duration-300 hover:scale-105"
                  >
                    <span className="flex items-center gap-2">
                      Schedule Consultation
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </span>
                  </a>
                  <a
                    href="#services"
                    className="px-8 py-4 border-2 border-sky-500 text-sky-600 font-semibold rounded-full hover:bg-sky-50 transition-all duration-300 hover:scale-105"
                  >
                    Explore Services
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
       <section id="contact" className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 py-24">
  {/* Background decorative elements */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 -left-40 w-96 h-96 bg-sky-400/5 rounded-full blur-3xl"></div>
    <div className="absolute bottom-20 -right-40 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
    
    {/* Grid pattern */}
    <div className="absolute inset-0 opacity-[0.02]">
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(to right, rgb(14 165 233) 1px, transparent 1px), linear-gradient(to bottom, rgb(14 165 233) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>
    </div>
  </div>

  <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    {/* Header */}
    <header className="mb-16 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-sky-50 border border-sky-200/50 mb-6 animate-fade-in-down">
        <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Get In Touch
        </p>
      </div>

      {/* Title */}
      <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 animate-fade-in-up animation-delay-100">
        Contact <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Us</span>
      </h2>

      {/* Description */}
      <p className="text-lg text-slate-600 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
        To avail any services, please reach out using the details below. We're here to help!
      </p>

      {/* Decorative line */}
      <div className="mt-8 flex items-center justify-center gap-3 animate-fade-in animation-delay-300">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-sky-300"></div>
        <div className="w-2 h-2 bg-sky-400 rounded-full"></div>
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-sky-300"></div>
      </div>
    </header>

    {/* Contact Info Cards */}
    <div className="grid gap-6 md:grid-cols-3 mb-12">
      <ContactInfoCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        title="Address"
        content={
          <p className="text-sm leading-relaxed text-slate-600">
            Plot No.1, 5th Floor, Regus Symphony IT Park, Chandivali,
            Saki-Vihar Road, Mumbai 400072.
          </p>
        }
        delay="0"
      />
      <ContactInfoCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        }
        title="Phone"
        content={
          <>
            <p className="text-sm text-slate-600">
              <a href="tel:9167869940" className="hover:text-sky-600 transition-colors">
                91678 69940
              </a>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              <a href="tel:9820365524" className="hover:text-sky-600 transition-colors">
                98203 65524
              </a>
            </p>
          </>
        }
        delay="100"
      />

      
      <ContactInfoCard
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        title="Email"
        content={
          <p className="text-sm text-slate-600">
            <a
              href="mailto:info@zivyamarine.com"
              className="hover:text-sky-600 transition-colors"
            >
              info@zivyamarine.com
            </a>
          </p>
        }
        delay="200"
      />
    </div>

    {/* Contact Form */}
    <div className="animate-fade-in-up animation-delay-300">
      <div className="relative rounded-3xl border border-slate-200/50 bg-white p-8 md:p-10 shadow-xl">
        {/* Form header */}
        <div className="mb-8 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Send us a Message</h3>
          <p className="text-slate-600">Fill out the form below and we'll get back to you shortly</p>
        </div>

        <form onSubmit={handleContactSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <InputField
              type="text"
              name="name"
              placeholder="Your Name"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              required
            />
            <InputField
              type="email"
              name="email"
              placeholder="Your Email"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              required
            />
          </div>
          
          <InputField
            type="text"
            name="subject"
            placeholder="Subject"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            }
            required
          />
          
          <div className="group relative">
            <div className="absolute left-4 top-4 text-slate-400 group-focus-within:text-sky-500 transition-colors pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <textarea
              name="message"
              rows="5"
              placeholder="Your Message"
              className="w-full rounded-xl border border-slate-300 pl-12 pr-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              required
            />
          </div>
          
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              className="group relative px-10 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:shadow-sky-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
            >
              <span className="relative flex items-center gap-2">
                Send Message
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
              
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
            </button>
          </div>
        </form>

        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-sky-400/20 rounded-tl-3xl"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-sky-400/20 rounded-br-3xl"></div>
      </div>
    </div>

    {/* Additional info or map section */}
    <div className="mt-12 text-center animate-fade-in-up animation-delay-400">
      <p className="text-slate-600 mb-4">Business Hours: Monday - Saturday, 9:00 AM - 6:00 PM</p>
      <div className="flex items-center justify-center gap-6">
        <a href="#" className="text-slate-400 hover:text-sky-600 transition-colors">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
        <a href="#" className="text-slate-400 hover:text-sky-600 transition-colors">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        </a>
        <a href="#" className="text-slate-400 hover:text-sky-600 transition-colors">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </a>
      </div>
    </div>
  </div>
</section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-5xl px-4 text-center text-[11px] text-slate-500">
          &copy; {new Date().getFullYear()}{" "}
          <strong className="font-semibold text-slate-700">
            ZIVYA MARINE SERVICES PVT.LTD
          </strong>
          . All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

/* Small reusable components */

const HighlightStat = ({ label, value }) => (
  <div className="rounded-xl border border-sky-500/40 bg-slate-950/50 px-3 py-3 text-left">
    <div className="text-[11px] font-medium text-slate-200">{label}</div>
    <div className="mt-1 text-sm font-semibold text-sky-300">{value}</div>
  </div>
);

const FeaturePill = ({ icon, title, description, delay = "0" }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={`group flex flex-col items-center rounded-2xl border border-sky-300/40 bg-gradient-to-br from-white to-sky-50/50 px-6 py-6 text-center shadow-md transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:border-sky-400/60 hover:bg-gradient-to-br hover:from-white hover:to-sky-100/50 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : "0ms",
        transitionProperty: isVisible ? "all" : "none",
      }}
    >
      <div className="mb-3 text-3xl group-hover:scale-125 transition-transform duration-300">
        {icon}
      </div>
      <h4 className="text-base font-bold text-slate-900 uppercase tracking-wide">
        {title}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 group-hover:text-slate-700">
        {description}
      </p>
    </div>
  );
};

const AboutCard = ({ icon, iconBg, image, badge, text, delay = "0" }) => (
  <div
    className="group overflow-hidden rounded-2xl border border-sky-300/50 bg-white shadow-lg transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl hover:border-sky-400/80 animate-fade-in-up hover:scale-105"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Icon Header with Gradient Background */}
    <div
      className={`bg-gradient-to-r ${iconBg} h-32 flex items-center justify-center relative overflow-hidden`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3),transparent_50%)] group-hover:scale-150 transition-transform duration-500" />
      </div>
      <div className="text-6xl z-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
        {icon}
      </div>
      {/* Badge positioned on top-left of header */}
      <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-900 border border-sky-300/60 shadow-md">
        {badge}
      </div>
    </div>

    {/* Content Section */}
    <div className="p-6">
      <p className="text-sm leading-relaxed text-slate-700 group-hover:text-slate-800 font-medium">
        {text}
      </p>
      <div className="mt-4 h-1 w-12 bg-gradient-to-r from-sky-400 to-blue-400 group-hover:w-full transition-all duration-300" />
    </div>
  </div>
);

const ServiceCard = ({ title, description }) => (
  <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
    <h4 className="text-base font-bold text-slate-900">{title}</h4>
    <p className="mt-2 text-sm leading-relaxed text-slate-700">{description}</p>
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
  />
);

export default HomePage;
