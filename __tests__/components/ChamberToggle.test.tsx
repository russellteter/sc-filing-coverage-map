import { render, screen, fireEvent } from '@testing-library/react';
import ChamberToggle from '@/components/Map/ChamberToggle';

describe('ChamberToggle Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders both chamber buttons', () => {
    render(<ChamberToggle chamber="house" onChange={mockOnChange} />);

    expect(screen.getByText('House (124)')).toBeInTheDocument();
    expect(screen.getByText('Senate (46)')).toBeInTheDocument();
  });

  it('shows House as active when chamber is house', () => {
    render(<ChamberToggle chamber="house" onChange={mockOnChange} />);

    const houseButton = screen.getByText('House (124)');
    const senateButton = screen.getByText('Senate (46)');

    // House should have active styling (indicated by aria-selected)
    expect(houseButton).toHaveAttribute('aria-selected', 'true');
    expect(senateButton).toHaveAttribute('aria-selected', 'false');
  });

  it('shows Senate as active when chamber is senate', () => {
    render(<ChamberToggle chamber="senate" onChange={mockOnChange} />);

    const houseButton = screen.getByText('House (124)');
    const senateButton = screen.getByText('Senate (46)');

    expect(senateButton).toHaveAttribute('aria-selected', 'true');
    expect(houseButton).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with house when House button is clicked', () => {
    render(<ChamberToggle chamber="senate" onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('House (124)'));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('house');
  });

  it('calls onChange with senate when Senate button is clicked', () => {
    render(<ChamberToggle chamber="house" onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('Senate (46)'));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('senate');
  });

  it('allows clicking the currently active chamber', () => {
    render(<ChamberToggle chamber="house" onChange={mockOnChange} />);

    fireEvent.click(screen.getByText('House (124)'));

    expect(mockOnChange).toHaveBeenCalledWith('house');
  });

  it('has proper ARIA attributes for tabs', () => {
    render(<ChamberToggle chamber="house" onChange={mockOnChange} />);

    const tablist = screen.getByRole('tablist', { name: 'Chamber selection' });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    // Check aria-selected
    expect(screen.getByText('House (124)')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Senate (46)')).toHaveAttribute('aria-selected', 'false');
  });
});
