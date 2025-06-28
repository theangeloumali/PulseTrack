import { render, screen } from '@testing-library/react';
import BillingPage from '@/components/billing';

describe('BillingPage', () => {
    it('renders the billing page', () => {
        render(<BillingPage />);
        expect(screen.getByText('Billing Settings')).toBeInTheDocument();
    });
});
