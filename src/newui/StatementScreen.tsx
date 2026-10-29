import React, { useCallback, useEffect, useState } from 'react';
import { FileText, ArrowDownLeft, ArrowUpRight, Loader2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Row {
  entry_id: string; entry_date: string; entry_ts: string; section: string; kind: string; direction: '+' | '-';
  amount: number; method: string; status: string; reference: string; description: string;
}
const PAGE = 40;
const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string) => {
  const dt = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function List({ scope }: { scope: 'ajo' | 'wallet' }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (offset: number) => {
    setLoading(true); setErr('');
    const { data, error } = await supabase.rpc('my_statement', { p_scope: scope, p_limit: PAGE, p_offset: offset });
    if (error) { setErr(/does not exist|schema cache/i.test(error.message) ? 'Statement is not available yet.' : 'Could not load your statement. Please try again.'); setLoading(false); return; }
    const got = (data || []) as Row[];
    setRows(prev => (offset === 0 ? got : [...prev, ...got]));
    setMore(got.length === PAGE);
    setLoading(false);
  }, [scope]);

  useEffect(() => { setRows([]); load(0); }, [load]);

  let lastMonth = '';
  return (
    <div className="space-y-2">
      {err && <p className="text-xs font-bold text-red-600 bg-red-50 rounded-xl p-3">{err}</p>}
      {!err && !loading && rows.length === 0 && <p className="text-xs text-slate-400 text-center py-8">No transactions yet.</p>}
      {rows.map(r => {
        const month = new Date(`${String(r.entry_date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        const head = month !== lastMonth ? (lastMonth = month) : null;
        const paid = r.status === 'Successful';
        const credit = r.direction === '+';
        return (
          <React.Fragment key={r.entry_id}>
            {head && <p className="pt-2 text-[10px] font-black uppercase tracking-wide text-slate-400">{head}</p>}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
              <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${credit ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {credit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-slate-900 truncate">{r.description}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{fmtDate(r.entry_date)} · {r.method}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{r.reference}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-black ${!paid ? 'text-slate-400' : credit ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {r.direction === '+' ? '+' : '−'}{naira(r.amount)}
                </p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  paid ? 'bg-emerald-100 text-emerald-800' : r.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                  {r.status}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      {loading && <p className="text-center py-3 text-slate-400"><Loader2 className="w-4 h-4 inline animate-spin" /></p>}
      {!loading && more && (
        <button type="button" onClick={() => load(rows.length)}
          className="w-full py-2.5 rounded-full border border-emerald-200 text-emerald-800 text-xs font-black inline-flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Show older transactions
        </button>
      )}
    </div>
  );
}

export function StatementScreen() {
  const [scope, setScope] = useState<'ajo' | 'wallet'>('ajo');
  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl border border-emerald-100 shadow-xs animate-fade-in space-y-4">
      <div>
        <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5"><FileText className="w-5 h-5 text-emerald-700" /> Statement</h3>
        <p className="text-xs text-slate-500 font-medium">Every contribution (+) and payout (−), including previous months and years. Ajo savings and your wallet are kept separate.</p>
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-slate-100">
        {(['ajo', 'wallet'] as const).map(k => (
          <button key={k} type="button" onClick={() => setScope(k)}
            className={`py-2 rounded-full text-xs font-black ${scope === k ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}>
            {k === 'ajo' ? 'Ajo Savings' : 'Wallet'}
          </button>
        ))}
      </div>
      <List key={scope} scope={scope} />
    </div>
  );
}
