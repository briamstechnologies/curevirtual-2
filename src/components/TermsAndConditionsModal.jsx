import React from "react";
import { FiX, FiCheckCircle } from "react-icons/fi";

export default function TermsAndConditionsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] scale-in animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-gradient-to-r from-[var(--brand-blue)]/10 to-[var(--brand-green)]/10">
          <div className="flex items-center gap-3">
            <img src="/images/logo/Asset3.png" alt="Logo" className="w-8 h-8" />
            <span className="text-md font-black tracking-tighter uppercase">
              CURE<span className="text-[var(--brand-blue)]">VIRTUAL</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
            aria-label="Close modal"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Scrollable Text Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-sm text-[var(--text-main)] leading-relaxed select-text">
          <div className="border-b border-[var(--border)] pb-4">
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Terms & Conditions</h1>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">
              Last Updated: June 2026
            </p>
          </div>

          <p className="italic text-[var(--text-soft)]">
            This document provides the Terms and Conditions for users signing up to use CureVirtual telemedicine services. It is intended for development, integration, and implementation purposes.
          </p>

          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                1. Acceptance of Terms
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                By accessing or using CureVirtual, users confirm that they agree to comply with these Terms and Conditions and understand that CureVirtual provides digital healthcare support and communication services.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                2. About CureVirtual
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                CureVirtual is a telemedicine platform designed to connect patients, doctors, physician assistants, pharmacists, laboratories, and healthcare providers through virtual healthcare services.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                3. Medical Disclaimer
              </h2>
              <p className="text-[13px] text-[var(--text-soft)] font-semibold text-amber-600 dark:text-amber-400">
                CureVirtual does not replace emergency medical services. Users experiencing emergencies should immediately contact local emergency services or visit the nearest healthcare facility.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                4. User Accounts
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                Users agree to provide accurate information, maintain secure login credentials, and notify CureVirtual of unauthorized account access.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                5. Privacy and Data Protection
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                CureVirtual takes reasonable measures to protect user data and healthcare information. Authorized healthcare providers may access relevant information necessary for treatment and service delivery.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                6. User Responsibilities
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                Users must not provide false medical information, engage in illegal activities, upload harmful content, or misuse the platform.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                7. Healthcare Provider Responsibilities
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                Healthcare professionals using CureVirtual must maintain valid licenses, comply with applicable regulations, and protect patient confidentiality.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                8. Prescriptions and Medical Advice
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                Healthcare providers maintain full professional discretion regarding diagnosis, prescriptions, treatment recommendations, and follow-up care.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                9. Platform Availability
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                CureVirtual aims to provide reliable access but does not guarantee uninterrupted service due to maintenance, technical issues, or third-party disruptions.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                10. Limitation of Liability
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                CureVirtual is not responsible for misuse of the platform, inaccurate user information, or independent medical decisions made by healthcare professionals.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                11. Intellectual Property
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                All CureVirtual branding, software, content, and materials remain the property of CureVirtual or its licensors.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                12. Account Suspension or Termination
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                CureVirtual reserves the right to suspend or terminate accounts involved in fraudulent, abusive, or unauthorized activities.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                13. Changes to Terms
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                CureVirtual may update these Terms and Conditions periodically. Continued use of the platform indicates acceptance of revised terms.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                14. Governing Law
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                These Terms and Conditions shall be governed by applicable laws and regulations within jurisdictions where CureVirtual operates.
              </p>
            </div>

            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[var(--brand-green)] mb-1">
                15. Contact Information
              </h2>
              <p className="text-[13px] text-[var(--text-soft)]">
                Support Email: <a href="mailto:support@curevirtual.com" className="text-[var(--brand-blue)] hover:underline">support@curevirtual.com</a> | Website: <a href="https://www.curevirtual.com" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-blue)] hover:underline">www.curevirtual.com</a>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] mt-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-main)] mb-1">Consent Statement</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              By clicking 'Create Account,' 'Register,' or using CureVirtual services, users acknowledge that they have read, understood, and agreed to these Terms and Conditions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-main)]/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue)]/90 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <FiCheckCircle className="text-sm" />
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
}
