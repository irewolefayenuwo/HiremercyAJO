import React, { useState } from 'react';
import { Megaphone, CheckCircle2, Phone, Mail, Sparkles } from 'lucide-react';
import type { Profile, SupportSettings } from '../App';
import { Mascot } from './Mascot';
import { AD_PACKAGES, type AdPackage } from './config';
import { Card, PrimaryButton, ScreenHeader, SecondaryButton, SectionTitle, Sheet, naira, whatsappUrl } from './ui';

export function AdvertiseScreen({ customer, supportDetails }: { customer: Profile; supportDetails: SupportSettings }) {
  const [pkg, setPkg] = useState<AdPackage | null>(null);
  const [business, setBusiness] = useState('');
  const [phone, setPhone] = useState(customer.phone || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const open = (p: AdPackage) => { setPkg(p); setError(''); };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;
    if (!business.trim() || !phone.trim()) { setError('Add your business name and a phone number.'); return; }
    const text = [
      'Hello HireMercyAJO, I would like to advertise.',
      `Package: ${pkg.title}`,
      `Business: ${business.trim()}`,
      `Contact: ${phone.trim()} (${customer.name})`,
      message.trim() ? `Details: ${message.trim()}` : ''
    ].filter(Boolean).join('\n');
    const url = whatsappUrl(supportDetails.support_whatsapp, text);
    if (!url) { setError('The support WhatsApp number is not set yet. Please call or email support.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
    setPkg(null);
  };

  const inp = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

  return (
    <div className="space-y-4 fade-in max-w-3xl mx-auto">
      <ScreenHeader title="Advertise your business" subtitle="Reach HireMercyAJO customers" tone="gold" pose="megaphone" />

      {supportDetails.advert_enabled && (
        <Card>
          <SectionTitle>Currently featured</SectionTitle>
          <div className="flex items-start gap-3">
            {supportDetails.advert_image_url && <img src={supportDetails.advert_image_url} alt="" loading="lazy" className="w-20 h-20 rounded-xl object-cover shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900">{supportDetails.advert_title || 'Featured campaign'}</p>
              {supportDetails.advert_description && <p className="text-xs text-slate-600 font-medium mt-1">{supportDetails.advert_description}</p>}
            </div>
          </div>
        </Card>
      )}

      <div>
        <SectionTitle>Advertising packages</SectionTitle>
        <div className="space-y-3">
          {AD_PACKAGES.map((p, i) => (
            <div key={p.id} className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className={`shrink-0 w-12 h-12 rounded-2xl text-white flex items-center justify-center bg-gradient-to-br ${['from-amber-400 to-amber-600', 'from-orange-400 to-orange-600', 'from-violet-500 to-purple-700'][i % 3]}`}>
                  {i === 2 ? <Sparkles className="w-6 h-6" /> : <Megaphone className="w-6 h-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-extrabold text-emerald-950">{p.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">{p.blurb}</p>
                </div>
                <p className="text-xs font-extrabold text-emerald-800 text-right shrink-0">
                  {p.price == null ? 'Contact us for pricing' : naira(p.price)}
                </p>
              </div>
              <ul className="mt-3 space-y-1.5">
                {p.includes.map(x => (
                  <li key={x} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-px" /> {x}
                  </li>
                ))}
              </ul>
              <PrimaryButton onClick={() => open(p)} className="w-full mt-4">Request this package</PrimaryButton>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <SectionTitle>How it works</SectionTitle>
        <ol className="space-y-3">
          {[
            'Choose a package and send your request.',
            'The HireMercyAJO team replies to confirm details and pricing.',
            'After you agree, your advert is prepared and published.'
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
              <p className="text-xs font-semibold text-slate-700 pt-1.5">{t}</p>
            </li>
          ))}
        </ol>
        <p className="text-[11px] text-slate-500 font-medium mt-3">Submitting a request does not charge you or publish anything.</p>
      </Card>

      <Card>
        <SectionTitle>Talk to us</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <SecondaryButton onClick={() => { if (supportDetails.support_phone) window.location.href = `tel:${supportDetails.support_phone}`; }} disabled={!supportDetails.support_phone}>
            <Phone className="w-4 h-4" /> Call
          </SecondaryButton>
          <SecondaryButton onClick={() => { if (supportDetails.support_email) window.location.href = `mailto:${supportDetails.support_email}`; }} disabled={!supportDetails.support_email}>
            <Mail className="w-4 h-4" /> Email
          </SecondaryButton>
        </div>
      </Card>

      <div className="flex justify-center"><Mascot pose="point" size={90} /></div>

      <Sheet open={!!pkg} onClose={() => setPkg(null)} title={pkg ? `Request: ${pkg.title}` : ''}>
        <form onSubmit={send} className="space-y-3">
          <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="Business or product name" className={inp} />
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="Contact phone number" className={inp} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="What would you like to promote?" className={inp} />
          {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
          <PrimaryButton type="submit" className="w-full">Send request on WhatsApp</PrimaryButton>
          <p className="text-[11px] text-slate-500 font-medium">This opens WhatsApp with your request ready to send to HireMercyAJO support.</p>
        </form>
      </Sheet>
    </div>
  );
}
