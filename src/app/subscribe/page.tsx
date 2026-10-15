
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import styles from "./subscription.module.css";

type Plan = {
  id: string;
  name: string;
  tier: "Standard" | "Professional";
  description: string;
  amount: number;
  period: string;
  studentLimit: number;
  staffLimit: number;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    id: "monthly-standard",
    name: "Monthly Standard",
    tier: "Standard",
    description: "Essential management for growing institutes.",
    amount: 1499,
    period: "per month",
    studentLimit: 200,
    staffLimit: 10,
  },
  {
    id: "monthly-professional",
    name: "Monthly Professional",
    tier: "Professional",
    description: "More capacity for larger institutes.",
    amount: 2999,
    period: "per month",
    studentLimit: 500,
    staffLimit: 30,
    featured: true,
  },
  {
    id: "six-month-standard",
    name: "6-Month Standard",
    tier: "Standard",
    description: "Six months of organised institute management.",
    amount: 7999,
    period: "per 6 months",
    studentLimit: 200,
    staffLimit: 10,
  },
  {
    id: "six-month-professional",
    name: "6-Month Professional",
    tier: "Professional",
    description: "Six months with more room to grow.",
    amount: 16499,
    period: "per 6 months",
    studentLimit: 500,
    staffLimit: 30,
    featured: true,
  },
  {
    id: "yearly-standard",
    name: "Yearly Standard",
    tier: "Standard",
    description: "A full year for your institute's daily operations.",
    amount: 15499,
    period: "per year",
    studentLimit: 200,
    staffLimit: 10,
  },
  {
    id: "yearly-professional",
    name: "Yearly Professional",
    tier: "Professional",
    description: "Full-year access for larger institutes.",
    amount: 30999,
    period: "per year",
    studentLimit: 500,
    staffLimit: 30,
    featured: true,
  },
];

const features = [
  "Domain included",
  "Professional management system",
  "Complete student management",
  "Attendance and batch management",
  "Fee collection and payment records",
  "Staff and family management",
  "Study materials and online exams",
  "Reports and audit logs",
  "Technical support",
];

const upiId = "9863795417@ibl";

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

type CustomerForm = {
  fullName: string;
  email: string;
  instituteName: string;
  transactionRef: string;
};

const emptyForm: CustomerForm = {
  fullName: "",
  email: "",
  instituteName: "",
  transactionRef: "",
};

export default function SubscriptionPage() {
  const [selectedPlanId, setSelectedPlanId] = useState(plans[1].id);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");

  const selected = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[1],
    [selectedPlanId]
  );

  // QR automatically changes when the selected plan changes.
  const upiLink = useMemo(
    () =>
      `upi://pay?pa=${encodeURIComponent(
        upiId
      )}&pn=${encodeURIComponent("STUDY ARENA")}&am=${
        selected.amount
      }&cu=INR&tn=${encodeURIComponent(
        `Subscription - ${selected.name}`
      )}`,
    [selected.amount, selected.name]
  );

  async function submitPaymentRequest() {
    setError("");

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.instituteName.trim()
    ) {
      setError("Please enter your name, email and institute name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/subscription-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          planId: selected.id,
          planName: selected.name,
          amount: selected.amount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not submit your request. Please try again."
        );
      }

      setRequestId(result.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <header className={styles.navbar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>S</span>
          <span>
            <strong>STUDY ARENA</strong>
            <small>INSTITUTE MANAGEMENT</small>
          </span>
        </Link>

        <Link href="/login" className={styles.signIn}>
          Sign in ↗
        </Link>
      </header>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>
          ✦ YOUR INSTITUTE. YOUR WORKSPACE.
        </span>

        <h1>
          The right plan
          <br />
          <span>for your institute.</span>
        </h1>

        <p>
          Choose a subscription plan and pay securely using your
          UPI app. Your access will be prepared after manual payment
          verification.
        </p>

        <div className={styles.proof}>
          <span>✓ Six paid plan options</span>
          <span>✓ 200 or 500 student capacity</span>
          <span>✓ Manual payment verification</span>
        </div>
      </section>

      <section className={styles.pricing}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.kicker}>
              SUBSCRIPTION PLANS
            </span>
            <h2>Choose your plan</h2>
          </div>

          <p>
            The QR is generated for the selected plan and includes
            its payment amount.
          </p>
        </div>

        <div className={styles.grid}>
          {plans.map((plan, index) => (
            <article
              key={plan.id}
              className={`${styles.card} ${
                plan.featured ? styles.featured : ""
              } ${
                selectedPlanId === plan.id
                  ? styles.selected
                  : ""
              }`}
            >
              <div className={styles.cardTop}>
                <span className={styles.index}>
                  {String(index + 1).padStart(2, "0")}
                </span>

                {plan.featured && (
                  <span className={styles.popular}>
                    POPULAR
                  </span>
                )}
              </div>

              <span className={styles.planIcon}>₹</span>
              <h3>{plan.name}</h3>

              <div className={styles.price}>
                {money(plan.amount)}{" "}
                <small>{plan.period}</small>
              </div>

              <p className={styles.description}>
                {plan.description}
              </p>

              <div className={styles.limits}>
                <span>✓ {plan.studentLimit} students</span>
                <span>✓ {plan.staffLimit} staff</span>
              </div>

              <ul>
                {features.map((feature) => (
                  <li key={feature}>
                    <span>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`${styles.choose} ${
                  selectedPlanId === plan.id
                    ? styles.chosen
                    : ""
                }`}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setForm(emptyForm);
                  setRequestId("");
                  setError("");
                  setModalOpen(true);
                }}
              >
                Choose this plan <span>→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.help}>
        <h2>Payment verification is manual</h2>
        <p>
          After submitting your payment request, our team will
          verify the transaction. Your account is not created
          automatically.
        </p>
      </section>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} STUDY ARENA · Subscription support
      </footer>

      {modalOpen && (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting &&
              !requestId
            ) {
              setModalOpen(false);
            }
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-title"
          >
            <button
              className={styles.close}
              aria-label="Close payment popup"
              onClick={() => {
                if (!submitting) setModalOpen(false);
              }}
            >
              ×
            </button>

            {requestId ? (
              <div className={styles.success}>
                <span className={styles.successIcon}>✓</span>
                <span className={styles.kicker}>
                  REQUEST SUBMITTED
                </span>

                <h2 id="payment-title">
                  Payment submitted for verification
                </h2>

                <p>
                  Your request ID is <strong>{requestId}</strong>.
                  Keep it for your records. Your account will only
                  be created after the payment is manually verified.
                </p>

                <div className={styles.pending}>
                  <span>●</span> Pending verification
                </div>

                <button
                  className={styles.payButton}
                  onClick={() => {
                    setModalOpen(false);
                    setRequestId("");
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <span className={styles.kicker}>
                  UPI MANUAL PAYMENT
                </span>

                <h2 id="payment-title">
                  Complete your subscription
                </h2>

                <p className={styles.modalIntro}>
                  Fill in your details, scan the QR with any UPI
                  app, then submit the request after paying.
                </p>

                <div className={styles.modalGrid}>
                  <form
                    className={styles.form}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitPaymentRequest();
                    }}
                  >
                    <label>
                      Full name
                      <input
                        value={form.fullName}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            fullName: event.target.value,
                          })
                        }
                        autoComplete="name"
                        required
                        placeholder="Your full name"
                      />
                    </label>

                    <label>
                      Email address
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            email: event.target.value,
                          })
                        }
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                      />
                    </label>

                    <label>
                      Institute name
                      <input
                        value={form.instituteName}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            instituteName: event.target.value,
                          })
                        }
                        required
                        placeholder="Your institute name"
                      />
                    </label>

                    <label>
                      UPI transaction/reference ID{" "}
                      <small>(recommended)</small>
                      <input
                        value={form.transactionRef}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            transactionRef: event.target.value,
                          })
                        }
                        placeholder="Enter after payment"
                      />
                    </label>

                    <div className={styles.selectedPlan}>
                      <span>Selected plan</span>
                      <strong>{selected.name}</strong>
                      <b>{money(selected.amount)}</b>
                    </div>

                    {error && (
                      <p className={styles.error} role="alert">
                        {error}
                      </p>
                    )}

                    <button
                      className={styles.payButton}
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Submitting…"
                        : "I have paid — submit for verification"}{" "}
                      <span>→</span>
                    </button>

                    <small className={styles.formNote}>
                      This submits a request only. It does not
                      automatically verify the payment.
                    </small>
                  </form>

                  <div className={styles.qrPanel}>
                    <div className={styles.qrAmount}>
                      {money(selected.amount)}
                      <small>Exact amount</small>
                    </div>

                    <div className={styles.qrFrame}>
                      <QRCodeSVG
                        value={upiLink}
                        size={220}
                        level="H"
                        title={`UPI payment QR for ${money(
                          selected.amount
                        )}`}
                        bgColor="#ffffff"
                        fgColor="#111111"
                      />
                    </div>

                    <strong>Scan with any UPI app</strong>

                    <span className={styles.upiId}>
                      {upiId}
                    </span>

                    <a
                      className={styles.copyUpi}
                      href={upiLink}
                    >
                      Open UPI app
                    </a>

                    <button
                      className={styles.copyUpi}
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(
                          upiId
                        );
                      }}
                    >
                      Copy UPI ID
                    </button>

                    <p>
                      Check the recipient and amount in your UPI
                      app before paying. Payment is verified manually.
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
