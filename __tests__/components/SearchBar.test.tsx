import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '@/components/Search/SearchBar';

const mockCandidatesData = {
  lastUpdated: '2026-01-13T00:00:00Z',
  house: {
    '1': {
      districtNumber: 1,
      candidates: [
        {
          name: 'John Smith',
          party: 'Democratic',
          status: 'filed',
          filedDate: '2025-10-15',
          ethicsUrl: 'https://example.com',
          reportId: '12345',
          source: 'ethics',
        },
      ],
    },
    '2': {
      districtNumber: 2,
      candidates: [],
    },
    '113': {
      districtNumber: 113,
      candidates: [
        {
          name: 'Jane Doe',
          party: 'Republican',
          status: 'filed',
          filedDate: '2025-11-20',
          ethicsUrl: 'https://example.com',
          reportId: '67890',
          source: 'ethics',
        },
      ],
    },
  },
  senate: {
    '1': {
      districtNumber: 1,
      candidates: [
        {
          name: 'Bob Wilson',
          party: 'Democratic',
          status: 'filed',
          filedDate: '2025-09-01',
          ethicsUrl: 'https://example.com',
          reportId: '11111',
          source: 'ethics',
        },
      ],
    },
  },
};

describe('SearchBar Component', () => {
  const mockOnSelectResult = jest.fn();

  beforeEach(() => {
    mockOnSelectResult.mockClear();
  });

  it('renders search input', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    expect(screen.getByPlaceholderText('Search candidates or districts...')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('shows results when typing a candidate name', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText(/House District 1/)).toBeInTheDocument();
  });

  it('shows results when typing a district number', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '113' } });

    // District should be found (note: "1" partial match will also match districts 1 and 113)
    expect(screen.getByText('House District 113')).toBeInTheDocument();
  });

  it('shows candidate results when searching by name', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Jane' } });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    // Sublabel should show district and party
    expect(screen.getByText(/House District 113.*Republican/)).toBeInTheDocument();
  });

  it('searches across both chambers', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Bob' } });

    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText(/Senate District 1/)).toBeInTheDocument();
  });

  it('shows no results message when no matches', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'xyznonexistent' } });

    expect(screen.getByText('No candidates or districts found')).toBeInTheDocument();
  });

  it('calls onSelectResult when clicking a result', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'John' } });

    fireEvent.click(screen.getByText('John Smith'));

    expect(mockOnSelectResult).toHaveBeenCalledTimes(1);
    expect(mockOnSelectResult).toHaveBeenCalledWith({
      type: 'candidate',
      chamber: 'house',
      districtNumber: 1,
      label: 'John Smith',
      sublabel: 'House District 1 • Democratic',
    });
  });

  it('clears input after selecting a result', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.click(screen.getByText('John Smith'));

    expect(input.value).toBe('');
  });

  it('navigates with keyboard arrows', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'John' } });

    // Arrow down to select first item
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // First item should be selected
    const option = screen.getByRole('option', { selected: true });
    expect(option).toBeInTheDocument();
  });

  it('selects result with Enter key', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'John' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSelectResult).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown with Escape key', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows clear button when there is input', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox') as HTMLInputElement;

    // Clear button should not be visible initially
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'test' } });

    // Clear button should now be visible
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    render(
      <SearchBar
        candidatesData={mockCandidatesData}
        onSelectResult={mockOnSelectResult}
      />
    );

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });

    fireEvent.click(screen.getByLabelText('Clear search'));

    expect(input.value).toBe('');
  });
});
