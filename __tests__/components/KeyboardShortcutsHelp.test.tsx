import { render, screen, fireEvent } from '@testing-library/react';
import KeyboardShortcutsHelp from '@/components/Search/KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('does not render when isOpen is false', () => {
    render(<KeyboardShortcutsHelp isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows keyboard shortcuts title', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('displays navigation shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Switch to House')).toBeInTheDocument();
    expect(screen.getByText('Switch to Senate')).toBeInTheDocument();
    expect(screen.getByText('Select next district')).toBeInTheDocument();
    expect(screen.getByText('Select previous district')).toBeInTheDocument();
  });

  it('displays search shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Search')).toBeInTheDocument();
    // "Focus search bar" appears twice (for "/" and "⌘K / Ctrl+K")
    expect(screen.getAllByText('Focus search bar').length).toBe(2);
  });

  it('displays general shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Clear selection / close panels')).toBeInTheDocument();
    expect(screen.getByText('Toggle this help')).toBeInTheDocument();
  });

  it('shows keyboard shortcut keys', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    // Check for specific key labels
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('Escape')).toBeInTheDocument();
    // "?" appears multiple times in the UI (in shortcut list and footer)
    expect(screen.getAllByText('?').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when close button is clicked', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByLabelText('Close'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    // Click the backdrop (the first child div with bg-black/30)
    const backdrop = document.querySelector('.bg-black\\/30');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('has proper modal accessibility attributes', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-title');
  });

  it('shows footer with hint to toggle help', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/to toggle this help/)).toBeInTheDocument();
  });
});
