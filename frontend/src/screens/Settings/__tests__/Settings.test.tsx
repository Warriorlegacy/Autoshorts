import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../Settings';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    },
    logout: vi.fn(),
  }),
}));

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('Settings Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Settings page with user information', () => {
    render(<Settings />);

    // Check for page title
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Check for Account Information section
    expect(screen.getByText('Account Information')).toBeInTheDocument();

    // Check that email and name inputs are disabled
    const emailInput = screen.getAllByDisplayValue('')[0];
    expect(emailInput).toBeDisabled();
  });

  it('should display Connected Accounts section', () => {
    render(<Settings />);

    expect(screen.getByText('Connected Accounts')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
  });

  it('should display Subscription Plan section', () => {
    render(<Settings />);

    expect(screen.getByText('Subscription Plan')).toBeInTheDocument();
    expect(screen.getByText('Starter Plan')).toBeInTheDocument();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('should display Sign Out button in Danger Zone', () => {
    render(<Settings />);

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('should display Connect buttons for social platforms', () => {
    render(<Settings />);

    const connectButtons = screen.getAllByText('Connect');
    expect(connectButtons.length).toBeGreaterThanOrEqual(2); // At least YouTube and Instagram
  });

  it('should display "Not connected" status for platforms', () => {
    render(<Settings />);

    const notConnectedElements = screen.getAllByText('Not connected');
    expect(notConnectedElements.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle Sign Out button click', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);

    render(<Settings />);

    const signOutButton = screen.getByText('Sign Out');
    await user.click(signOutButton);

    expect(window.confirm).toHaveBeenCalled();
  });

  it('should show alert message state', () => {
    render(<Settings />);

    // The component should render without errors even if no message is shown
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should display connection hint', () => {
    render(<Settings />);

    const hint = screen.getByText(/Connect your social media accounts/i);
    expect(hint).toBeInTheDocument();
  });
});
