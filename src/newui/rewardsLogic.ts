import type { Profile } from '../App';
import type { DashboardLite } from './useReferralDashboard';
import type { SectionKey } from './config';

export interface ChallengeStep {
  key: string;
  title: string;
  detail: string;
  /** done = verified from real records; todo = can be done now; soon = not tracked yet */
  status: 'done' | 'todo' | 'soon';
  go?: { label: string; section: SectionKey; tab?: string };
}

/**
 * Builds the Welcome Challenge checklist from REAL records only.
 * Opening a screen never completes a step, and nothing here awards money or points -
 * awarding stays with the existing/approved server-side rules.
 */
export function buildWelcomeSteps(args: {
  customer: Profile;
  hasSuccessfulContribution: boolean;
  dash: DashboardLite | null;
}): ChallengeStep[] {
  const { customer, hasSuccessfulContribution, dash } = args;
  const profileDone = Boolean(customer.name && customer.phone && customer.email);
  const referred = Number(dash?.total_referred || 0);
  const qualified = Number(dash?.successful_referrals || 0);

  return [
    {
      key: 'profile',
      title: 'Complete your profile',
      detail: profileDone ? 'Name, phone number and email are on file.' : 'Add your email address in Settings.',
      status: profileDone ? 'done' : 'todo',
      go: profileDone ? undefined : { label: 'Open Settings', section: 'profile', tab: 'settings' }
    },
    {
      key: 'contribution',
      title: 'Make your first contribution',
      detail: hasSuccessfulContribution ? 'Your first approved contribution is recorded.' : 'Pay your first daily contribution.',
      status: hasSuccessfulContribution ? 'done' : 'todo',
      go: hasSuccessfulContribution ? undefined : { label: 'Pay Contribution', section: 'ajo', tab: 'deposit' }
    },
    {
      key: 'referral',
      title: 'Refer a friend',
      detail: qualified > 0
        ? 'A friend you referred has made their first contribution.'
        : referred > 0
          ? `${referred} friend${referred > 1 ? 's' : ''} joined - waiting for their first contribution.`
          : 'Share your referral link and invite someone.',
      status: qualified > 0 ? 'done' : 'todo',
      go: qualified > 0 ? undefined : { label: 'Open Referrals', section: 'referrals' }
    },
    {
      key: 'streak',
      title: 'Keep a 3-day login streak',
      detail: 'Daily streak tracking is not switched on yet.',
      status: 'soon'
    },
    {
      key: 'share',
      title: 'Share an approved advert',
      detail: 'Advert-sharing tasks are not switched on yet.',
      status: 'soon'
    },
    {
      key: 'oja',
      title: 'Visit Gbagede OJA',
      detail: 'Marketplace tasks start when Gbagede OJA opens.',
      status: 'soon'
    }
  ];
}
