import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const signupDefaults = {
  fullName: "",
  location: "",
  email: "",
  password: "",
  role: "customer"
};

const signinDefaults = {
  email: "",
  password: ""
};

const audienceCopy = {
  tenant: {
    heroTitle: "Turn Every Rent Payment Into Credit Progress",
    heroSubhead: "Track payments, grow your score, and keep proof of every transaction in one place. No more rent history disappearing into thin air.",
    plannerTitle: "Estimate Your Credit Growth",
    plannerSubhead: "Use your actual rent numbers and see a practical score trajectory."
  },
  landlord: {
    heroTitle: "Run Properties With Less Chasing And More Control",
    heroSubhead: "Get predictable collections, cleaner records, and better visibility on tenant behavior before issues grow.",
    plannerTitle: "Estimate Collection Efficiency",
    plannerSubhead: "Use your property numbers and project collection improvements."
  }
};

const valueCards = [
  {
    audience: "tenant",
    icon: "→",
    title: "Build Credit With Rent",
    description: "Verified on-time rent payments can help you build stronger credit without changing where you live."
  },
  {
    audience: "tenant",
    icon: "→",
    title: "Clear Payment History",
    description: "Every payment is tracked with timestamped records, so you always have proof when you need it."
  },
  {
    audience: "landlord",
    icon: "→",
    title: "Faster Collections",
    description: "Automated reminders and transparent payment status reduce late follow-ups and manual chasing."
  },
  {
    audience: "landlord",
    icon: "→",
    title: "Portfolio Visibility",
    description: "Track property-level payment trends and identify risk early across all units in one dashboard."
  },
  {
    audience: "all",
    icon: "→",
    title: "Fair Deposit Handling",
    description: "Documented workflows and clear records reduce conflict and speed up dispute resolution."
  }
];

const features = [
  {
    audience: "all",
    icon: "✓",
    title: "Secure Digital Payments",
    description: "Fast checkout with encrypted transfers and instant receipts for both parties."
  },
  {
    audience: "tenant",
    icon: "✓",
    title: "Credit Reporting Support",
    description: "Turn consistent rent behavior into measurable financial progress over time."
  },
  {
    audience: "landlord",
    icon: "✓",
    title: "Operational Reporting",
    description: "See paid, pending, and overdue trends by property so decisions are data-driven."
  },
  {
    audience: "all",
    icon: "✓",
    title: "Dispute Evidence Trail",
    description: "Centralized records with notes and attachments to keep resolution fast and clear."
  },
  {
    audience: "all",
    icon: "✓",
    title: "Role-Based Access",
    description: "Permissions keep tenant and landlord data separated while enabling collaboration."
  }
];

const testimonials = [
  {
    quote: "My credit went from 580 to 720 in one year. I thought renting a house would never help my credit. Crenit made the difference. Now I can actually qualify for car loans.",
    name: "Maria Chen",
    role: "Marketing Manager, Denver CO",
    avatar: "https://i.pravatar.cc/150?img=1"
  },
  {
    quote: "We manage 12 properties. Collections are now 3 days faster on average. I spend less time chasing payments and more time growing the business. The analytics are incredible.",
    name: "James Wilson",
    role: "Property Manager, Austin TX",
    avatar: "https://i.pravatar.cc/150?img=2"
  },
  {
    quote: "Deposit disputes used to destroy relationships. Now we have photo evidence, itemized records, and neutral mediation. Last dispute closed in 10 days. It's a game-changer.",
    name: "Priya Patel",
    role: "Landlord & Developer, San Francisco CA",
    avatar: "https://i.pravatar.cc/150?img=3"
  }
];

const platformStats = [
  { value: "2", label: "Role-based portals" },
  { value: "12+", label: "Core workflows" },
  { value: "1", label: "Shared payment history" }
];

const footerLinks = [
  { label: "Features", href: "#value" },
  { label: "Planner", href: "#planner" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Proof", href: "#proof" }
];

const companyLinks = [
  { label: "About", href: "#planner" },
  { label: "Contact", href: "mailto:support@crenit.com" },
  { label: "Security", href: "#features" }
];

const socialLinks = [
  { name: "Email", url: "mailto:support@crenit.com" },
  { name: "Docs", url: "#how-it-works" },
  { name: "Status", url: "#proof" }
];

export function LandingPage() {
    function isLandlordRole(role) {
      return role === "landlord" || role === "admin";
    }

  const { isAuthenticated, user, login, register, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("signin");
  const [signin, setSignin] = useState(signinDefaults);
  const [signup, setSignup] = useState(signupDefaults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("tenant");
  const [monthlyRent, setMonthlyRent] = useState(1200);
  const [monthsPaidOnTime, setMonthsPaidOnTime] = useState(12);
  const [currentScore, setCurrentScore] = useState(620);
  const [unitsManaged, setUnitsManaged] = useState(8);
  const [currentCollectionRate, setCurrentCollectionRate] = useState(88);

  const dashboardTarget = isLandlordRole(user?.role) ? "/landlord/dashboard" : "/tenant/welcome";
  const visibleValueCards = useMemo(() => valueCards.filter((card) => card.audience === "all" || card.audience === audience), [audience]);
  const visibleFeatures = useMemo(() => features.filter((feature) => feature.audience === "all" || feature.audience === audience), [audience]);
  const tenantScoreGain = useMemo(() => {
    const gain = Math.round((monthsPaidOnTime * 4.5) + Math.min(40, monthlyRent / 75));
    return Math.max(12, Math.min(160, gain));
  }, [monthsPaidOnTime, monthlyRent]);
  const projectedScore = Math.min(850, currentScore + tenantScoreGain);
  const landlordMonthlyCollection = useMemo(() => Math.round(unitsManaged * monthlyRent * (currentCollectionRate / 100)), [unitsManaged, monthlyRent, currentCollectionRate]);
  const landlordImprovedCollection = useMemo(() => Math.round(unitsManaged * monthlyRent * (Math.min(99, currentCollectionRate + 6) / 100)), [unitsManaged, monthlyRent, currentCollectionRate]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll(".reveal");

    if (prefersReducedMotion) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function openModal(nextMode) {
    setMode(nextMode);
    setModalOpen(true);
    setError("");
    setMessage("");
  }

  function closeModal() {
    setModalOpen(false);
    setError("");
    setMessage("");
  }

  async function onSignin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const signedInUser = await login(signin);
      closeModal();
      navigate(isLandlordRole(signedInUser.role) ? "/landlord/dashboard" : "/tenant/welcome", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const createdUser = await register(signup);
      closeModal();
      navigate(isLandlordRole(createdUser.role) ? "/landlord/dashboard" : "/tenant/welcome", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    if (!signin.email) {
      setError("Enter your email first to request a reset.");
      return;
    }

    setError("");
    try {
      const result = await forgotPassword(signin.email);
      setMessage(result.message || "Password reset instructions sent.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <>
      <div className="lp-page">
        <header className="lp-nav reveal">
          <div className="lp-brand">
            <h1>Crenit</h1>
            <p>Credit Through Rent</p>
          </div>
          <div className="button-row lp-nav-actions">
            <button type="button" className="ghost" onClick={() => openModal("signin")}>Sign In</button>
            <button type="button" onClick={() => openModal("signup")}>Get Started</button>
          </div>
        </header>

        <section className="lp-hero reveal">
          <div className="lp-hero-content">
            <div className="lp-role-toggle" role="tablist" aria-label="Choose user type">
              <button type="button" className={audience === "tenant" ? "active" : ""} onClick={() => setAudience("tenant")}>Tenant</button>
              <button type="button" className={audience === "landlord" ? "active" : ""} onClick={() => setAudience("landlord")}>Landlord</button>
            </div>
            <h2>{audienceCopy[audience].heroTitle}</h2>
            <p className="lp-hero-subhead">{audienceCopy[audience].heroSubhead}</p>
            <div className="lp-hero-cta">
              <button type="button" onClick={() => { setSignup((prev) => ({ ...prev, role: audience === "landlord" ? "landlord" : "customer" })); openModal("signup"); }}>
                {audience === "landlord" ? "Create Landlord Account" : "Create Tenant Account"}
              </button>
              <button type="button" onClick={() => openModal("signin")}>Sign In</button>
            </div>
            <div className="lp-hero-stats">
              {platformStats.map((stat) => (
                <article key={stat.label} className="lp-hero-stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
            <p className="lp-hero-note">A single workspace for rent, credit, deposits, documents, and dispute history.</p>
            {isAuthenticated && <Link className="button-link" to={dashboardTarget} style={{ marginTop: "20px", display: "inline-block" }}>Open Dashboard</Link>}
          </div>
          <div className="lp-hero-image">
            <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=600&fit=crop" alt="Modern rental finance platform" />
          </div>
        </section>

        <section className="lp-section reveal" id="planner">
          <div className="lp-section-container">
            <div className="lp-section-head">
              <h3>{audienceCopy[audience].plannerTitle}</h3>
              <p className="lp-section-subtext">{audienceCopy[audience].plannerSubhead}</p>
            </div>
            <div className="lp-planner-grid">
              <article className="lp-planner-card reveal">
                <label>
                  Monthly Rent (USD)
                  <input type="number" min={300} step={50} value={monthlyRent} onChange={(event) => setMonthlyRent(Number(event.target.value) || 0)} />
                </label>
                {audience === "tenant" ? (
                  <>
                    <label>
                      On-Time Payment Months
                      <input type="number" min={1} max={36} value={monthsPaidOnTime} onChange={(event) => setMonthsPaidOnTime(Number(event.target.value) || 1)} />
                    </label>
                    <label>
                      Current Credit Score
                      <input type="number" min={300} max={850} value={currentScore} onChange={(event) => setCurrentScore(Number(event.target.value) || 300)} />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Units Managed
                      <input type="number" min={1} max={500} value={unitsManaged} onChange={(event) => setUnitsManaged(Number(event.target.value) || 1)} />
                    </label>
                    <label>
                      Current Collection Rate (%)
                      <input type="number" min={50} max={99} value={currentCollectionRate} onChange={(event) => setCurrentCollectionRate(Number(event.target.value) || 50)} />
                    </label>
                  </>
                )}
              </article>

              <article className="lp-planner-result reveal">
                {audience === "tenant" ? (
                  <>
                    <h4>Projected Credit Outcome</h4>
                    <p>Estimated score gain: <strong>+{tenantScoreGain}</strong></p>
                    <p>Projected score: <strong>{projectedScore}</strong></p>
                    <p className="helper">These estimates are directional and depend on bureau reporting windows and your broader credit profile.</p>
                  </>
                ) : (
                  <>
                    <h4>Projected Collection Outcome</h4>
                    <p>Current monthly collected: <strong>${landlordMonthlyCollection.toLocaleString()}</strong></p>
                    <p>Potential with +6% efficiency: <strong>${landlordImprovedCollection.toLocaleString()}</strong></p>
                    <p className="helper">A higher on-time rate improves cash flow predictability and reduces manual follow-up cost.</p>
                  </>
                )}
              </article>
            </div>
          </div>
        </section>

        <section className="lp-section reveal" id="value">
          <div className="lp-section-container">
            <div className="lp-section-head">
              <h3>Why Everyone Chooses Crenit</h3>
              <p className="lp-section-subtext">One platform. Everyone benefits. Tenants build credit, landlords collect faster, deposits get handled fairly. No apps that feel incomplete or features that don't work.</p>
            </div>
            <div className="lp-value-grid">
              {visibleValueCards.map((card) => (
                <article key={card.title} className="lp-value-card reveal">
                  <span>{card.icon}</span>
                  <h4>{card.title}</h4>
                  <p>{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>


        <section className="lp-section reveal" id="features">
          <div className="lp-section-container">
            <div className="lp-section-head">
              <h3>Enterprise Security Meets User Simplicity</h3>
              <p className="lp-section-subtext">We handle the complexity so you don't have to. Bank-grade security with 30-second setup. Yes, really.</p>
            </div>
            <div className="lp-feature-grid">
              {visibleFeatures.map((feature) => (
                <article key={feature.title} className="lp-feature-card reveal">
                  <span>{feature.icon}</span>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section reveal" id="proof">
          <div className="lp-section-container">
            <div className="lp-section-head">
              <h3>Built For Real Rental Workflows</h3>
              <p className="lp-section-subtext">The app is strongest when the daily tasks are visible: rent, verification, deposits, and follow-up all stay in the same place.</p>
            </div>
            <div className="lp-testimonials">
              {testimonials.map((testimonial) => (
                <article key={testimonial.name} className="lp-testimonial reveal">
                  <div className="lp-testimonial-stars" aria-label="Five star review">
                    {Array.from({ length: 5 }).map((_, index) => <span key={index}>★</span>)}
                  </div>
                  <p className="lp-testimonial-quote">“{testimonial.quote}”</p>
                  <div className="lp-testimonial-author">
                    <img className="lp-author-image" src={testimonial.avatar} alt={testimonial.name} />
                    <div className="lp-author-info">
                      <h6>{testimonial.name}</h6>
                      <p>{testimonial.role}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section reveal" id="how-it-works">
          <div className="lp-section-container">
            <div className="lp-section-head">
              <h3>Get Started In Four Steps</h3>
              <p className="lp-section-subtext">From signup to first payment in under 5 minutes. No paperwork, no delays, no hassle.</p>
            </div>
            <div className="lp-steps-grid">
              <div className="lp-step-card reveal">
                <div className="lp-step-number">1</div>
                <h4>Sign Up (2 min)</h4>
                <p>Email, password, role. That's it. No verification calls, no document uploads, no gatekeeping.</p>
              </div>
              <div className="lp-step-card reveal">
                <div className="lp-step-number">2</div>
                <h4>Connect Property (1 min)</h4>
                <p>Add your property or link with your landlord. Lease details, payment terms-all in your account instantly.</p>
              </div>
              <div className="lp-step-card reveal">
                <div className="lp-step-number">3</div>
                <h4>Start Paying (1 min)</h4>
                <p>Click "Pay Rent." Choose ACH, card, or bank transfer. Get instant confirmation. Done.</p>
              </div>
              <div className="lp-step-card reveal">
                <div className="lp-step-number">4</div>
                <h4>Watch It Build (Every Month)</h4>
                <p>Your credit grows with each on-time payment. Real credit history. Real results. Month after month.</p>
              </div>
            </div>
          </div>
        </section>


        <section className="lp-cta reveal">
          <h3>Your Financial Future Starts Now</h3>
          <p>Stop treating rent as dead weight. Turn it into a documented financial record that supports tenants and gives landlords better visibility.</p>
          <div className="lp-cta-buttons">
            <button type="button" onClick={() => openModal("signup")}>Get Started Free</button>
            <button type="button" onClick={() => openModal("signin")}>Sign In</button>
          </div>
        </section>

        <footer className="lp-footer reveal">
          <div className="lp-footer-content">
            <div className="lp-footer-col">
              <h4>Crenit</h4>
              <p>Premium rental finance infrastructure built for trust and transparency.</p>
            </div>
            <div className="lp-footer-col">
              <h4>Product</h4>
              <ul>
                {footerLinks.map((link) => <li key={link.label}><a href={link.href}>{link.label}</a></li>)}
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Company</h4>
              <ul>
                {companyLinks.map((link) => <li key={link.label}><a href={link.href}>{link.label}</a></li>)}
              </ul>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>© {new Date().getFullYear()} Crenit. All rights reserved.</p>
            <div className="lp-socials">
              {socialLinks.map((social) => (
                <a key={social.name} href={social.url} title={social.name}>{social.name}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {modalOpen && (
        <div className="lp-modal-backdrop" onClick={closeModal}>
          <section className="auth-card lp-modal" onClick={(event) => event.stopPropagation()}>
            <h1>{mode === "signin" ? "Welcome Back" : "Create Your Account"}</h1>
            <p className="subtitle">{mode === "signin" ? "Sign in to your Crenit account" : "Join thousands of users building credit"}</p>

            <div className="mode-switch">
              <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign In</button>
              <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign Up</button>
            </div>

            {mode === "signin" && (
              <form onSubmit={onSignin} className="form-grid">
                <label>
                  Email
                  <input
                    type="email"
                    value={signin.email}
                    onChange={(event) => setSignin((previous) => ({ ...previous, email: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={signin.password}
                    onChange={(event) => setSignin((previous) => ({ ...previous, password: event.target.value }))}
                    required
                  />
                </label>
                <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
                <button type="button" className="ghost" onClick={onForgotPassword}>Forgot Password?</button>
              </form>
            )}

            {mode === "signup" && (
              <form onSubmit={onSignup} className="form-grid">
                <label>
                  Full Name
                  <input
                    value={signup.fullName}
                    onChange={(event) => setSignup((previous) => ({ ...previous, fullName: event.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={signup.email}
                    onChange={(event) => setSignup((previous) => ({ ...previous, email: event.target.value }))}
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <label>
                  Location
                  <input
                    value={signup.location}
                    onChange={(event) => setSignup((previous) => ({ ...previous, location: event.target.value }))}
                    placeholder="City, State"
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    minLength={6}
                    value={signup.password}
                    onChange={(event) => setSignup((previous) => ({ ...previous, password: event.target.value }))}
                    placeholder="Min 6 characters"
                    required
                  />
                </label>
                <label>
                  I am a...
                  <select value={signup.role} onChange={(event) => setSignup((previous) => ({ ...previous, role: event.target.value }))}>
                    <option value="customer">Tenant</option>
                    <option value="landlord">Landlord / Property Manager</option>
                  </select>
                </label>
                <button type="submit" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button>
              </form>
            )}

            {error && <p style={{ color: "#d32f2f", marginTop: "16px", textAlign: "center", fontSize: "0.9rem" }}>{error}</p>}
            {message && <p style={{ color: "#0d652d", marginTop: "16px", textAlign: "center", fontSize: "0.9rem" }}>{message}</p>}

            <div className="button-row" style={{ marginTop: "20px" }}>
              <button type="button" className="ghost" onClick={closeModal}>Close</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
