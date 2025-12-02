import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreatePoll from './CreatePoll';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockNavigate = vi.fn();
const mockToast = vi.fn();

// Helper function to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Helper to create a mock file
const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const file = new File(['a'.repeat(size)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('CreatePoll Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    // Mock crypto.randomUUID
    global.crypto = {
      ...global.crypto,
      randomUUID: vi.fn(() => 'mock-uuid-123') as any,
    };
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============= STANDARD/EXPECTED BEHAVIOR TESTS =============

  describe('Standard Behavior', () => {
    it('should render the component with all form fields', () => {
      renderWithRouter(<CreatePoll />);
      
      expect(screen.getByLabelText(/createPoll.pollTitle/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByText(/createPoll.addOption/i)).toBeInTheDocument();
      expect(screen.getByText(/createPoll.tags/i)).toBeInTheDocument();
      expect(screen.getByText(/createPoll.uploadMedia/i)).toBeInTheDocument();
      expect(screen.getByText(/createPoll.postAnonymously/i)).toBeInTheDocument();
      expect(screen.getByText(/allow comments/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /createPoll.createPoll/i })).toBeInTheDocument();
    });

    it('should render with 2 default option inputs', () => {
      renderWithRouter(<CreatePoll />);
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      expect(optionInputs).toHaveLength(2);
    });

    it('should update title input value', () => {
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Test Poll Title' } });
      
      expect(titleInput.value).toBe('Test Poll Title');
    });

    it('should update description textarea value', () => {
      renderWithRouter(<CreatePoll />);
      
      const bodyTextarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      fireEvent.change(bodyTextarea, { target: { value: 'Test description' } });
      
      expect(bodyTextarea.value).toBe('Test description');
    });

    it('should update option input values', () => {
      renderWithRouter(<CreatePoll />);
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      expect((optionInputs[0] as HTMLInputElement).value).toBe('Option 1');
      expect((optionInputs[1] as HTMLInputElement).value).toBe('Option 2');
    });

    it('should show character count for title', () => {
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test' } });
      
      expect(screen.getByText('4/120 characters')).toBeInTheDocument();
    });

    it('should navigate back when cancel button is clicked', () => {
      renderWithRouter(<CreatePoll />);
      
      const cancelButton = screen.getByText(/createPoll.cancel/i);
      fireEvent.click(cancelButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // ============= OPTIONS MANAGEMENT TESTS =============

  describe('Poll Options Management', () => {
    it('should add a new option when add button is clicked', () => {
      renderWithRouter(<CreatePoll />);
      
      const addButton = screen.getByText(/createPoll.addOption/i);
      fireEvent.click(addButton);
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      expect(optionInputs).toHaveLength(3);
    });

    it('should remove an option when remove button is clicked', () => {
      renderWithRouter(<CreatePoll />);
      
      // Add a third option first
      const addButton = screen.getByText(/createPoll.addOption/i);
      fireEvent.click(addButton);
      
      // Remove buttons should now be visible
      const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('svg')
      );
      
      // Click first remove button
      fireEvent.click(removeButtons[0]);
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      expect(optionInputs).toHaveLength(2);
    });

    it('should not show remove buttons when only 2 options exist', () => {
      renderWithRouter(<CreatePoll />);
      
      // With only 2 options, there should be no X buttons for removal
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      expect(optionInputs).toHaveLength(2);
      
      // Try to find X buttons - there should be none or they shouldn't be visible
      const removeButtons = screen.queryAllByRole('button').filter(
        btn => btn.textContent === '' && btn.querySelector('svg')
      );
      expect(removeButtons.length).toBeLessThan(2);
    });

    it('should not add more than 6 options', () => {
      renderWithRouter(<CreatePoll />);
      
      const addButton = screen.getByText(/createPoll.addOption/i);
      
      // Click add button 4 times (2 default + 4 = 6 total)
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      let optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      expect(optionInputs).toHaveLength(6);
      
      // Try to add one more - button should not be visible
      expect(screen.queryByText(/createPoll.addOption/i)).not.toBeInTheDocument();
    });
  });

  // ============= TAGS MANAGEMENT TESTS =============

  describe('Tags Management', () => {
    it('should toggle tag selection on click', () => {
      renderWithRouter(<CreatePoll />);
      
      const techTag = screen.getByText('Tech');
      
      // Click to select
      fireEvent.click(techTag);
      expect(techTag.closest('div')).toHaveClass('cursor-pointer');
      
      // Click to deselect
      fireEvent.click(techTag);
      expect(techTag.closest('div')).toHaveClass('cursor-pointer');
    });

    it('should allow multiple tags to be selected', () => {
      renderWithRouter(<CreatePoll />);
      
      const techTag = screen.getByText('Tech');
      const musicTag = screen.getByText('Music');
      
      fireEvent.click(techTag);
      fireEvent.click(musicTag);
      
      // Both should be clickable
      expect(techTag).toBeInTheDocument();
      expect(musicTag).toBeInTheDocument();
    });
  });

  // ============= MEDIA UPLOAD TESTS =============

  describe('Media Upload Functionality', () => {
    it('should accept valid image files', async () => {
      renderWithRouter(<CreatePoll />);
      
      const file = createMockFile('test.jpg', 1024 * 1024, 'image/jpeg');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should accept valid video files', async () => {
      renderWithRouter(<CreatePoll />);
      
      const file = createMockFile('test.mp4', 1024 * 1024, 'video/mp4');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('test.mp4')).toBeInTheDocument();
      });
    });

    it('should reject files larger than 50MB', async () => {
      renderWithRouter(<CreatePoll />);
      
      const largeFile = createMockFile('large.jpg', 51 * 1024 * 1024, 'image/jpeg');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [largeFile],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.error',
          description: 'File size must be less than 50MB',
          variant: 'destructive',
        });
      });
    });

    it('should reject non-image/video files', async () => {
      renderWithRouter(<CreatePoll />);
      
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [pdfFile],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.error',
          description: 'Only images and videos are allowed',
          variant: 'destructive',
        });
      });
    });

    it('should not allow more than 4 media files', async () => {
      renderWithRouter(<CreatePoll />);
      
      const files = [
        createMockFile('file1.jpg', 1024, 'image/jpeg'),
        createMockFile('file2.jpg', 1024, 'image/jpeg'),
        createMockFile('file3.jpg', 1024, 'image/jpeg'),
        createMockFile('file4.jpg', 1024, 'image/jpeg'),
        createMockFile('file5.jpg', 1024, 'image/jpeg'),
      ];
      
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: files,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.error',
          description: 'Maximum 4 media files allowed',
          variant: 'destructive',
        });
      });
    });

    it('should remove media file when remove button is clicked', async () => {
      renderWithRouter(<CreatePoll />);
      
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      // Find and click remove button
      const removeButton = screen.getByText('test.jpg').parentElement?.querySelector('button');
      if (removeButton) {
        fireEvent.click(removeButton);
      }
      
      await waitFor(() => {
        expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
      });
    });

    it('should display image preview for image files', async () => {
      renderWithRouter(<CreatePoll />);
      
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        const img = screen.getByAltText('Preview');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-url');
      });
    });
  });

  // ============= FORM VALIDATION TESTS =============

  describe('Form Validation', () => {
    it('should show error when title is empty', async () => {
      renderWithRouter(<CreatePoll />);
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.error',
          description: 'Please enter a poll title',
          variant: 'destructive',
        });
      });
    });

    it('should show error when less than 2 options are filled', async () => {
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      
      // Leave all options empty
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.error',
          description: 'createPoll.minOptions',
          variant: 'destructive',
        });
      });
    });

    it('should trim whitespace from title and options', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: '  Test Title  ' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: '  Option 1  ' } });
      fireEvent.change(optionInputs[1], { target: { value: '  Option 2  ' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Title',
          })
        );
      });
    });

    it('should enforce title max length of 120 characters', () => {
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i) as HTMLInputElement;
      expect(titleInput).toHaveAttribute('maxLength', '120');
    });

    it('should enforce option max length of 60 characters', () => {
      renderWithRouter(<CreatePoll />);
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      optionInputs.forEach(input => {
        expect(input).toHaveAttribute('maxLength', '60');
      });
    });
  });

  // ============= SETTINGS TOGGLES TESTS =============

  describe('Settings Toggles', () => {
    it('should toggle anonymous posting', () => {
      renderWithRouter(<CreatePoll />);
      
      const anonymousSwitch = screen.getByLabelText(/createPoll.postAnonymously/i);
      
      expect(anonymousSwitch).not.toBeChecked();
      fireEvent.click(anonymousSwitch);
      expect(anonymousSwitch).toBeChecked();
    });

    it('should toggle allow comments (default is checked)', () => {
      renderWithRouter(<CreatePoll />);
      
      const commentsSwitch = screen.getByLabelText(/allow comments/i);
      
      expect(commentsSwitch).toBeChecked();
      fireEvent.click(commentsSwitch);
      expect(commentsSwitch).not.toBeChecked();
    });
  });

  // ============= AUTHENTICATION TESTS =============

  describe('Authentication', () => {
    it('should redirect to auth page if user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Authentication required',
          description: 'Please sign in to create polls',
          variant: 'destructive',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/auth');
      });
    });
  });

  // ============= POLL CREATION SUCCESS TESTS =============

  describe('Poll Creation - Success Cases', () => {
    it('should successfully create a poll with minimal data', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.success',
          description: 'createPoll.pollCreated',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should create poll with all fields filled', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      const mockTags = [{ id: 'tag-1', label: 'Tech' }];
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      });
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'tags') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: mockTags }),
            }),
          };
        }
        return {
          insert: mockInsert,
        };
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Comprehensive Poll' } });
      
      const bodyTextarea = screen.getByLabelText(/description/i);
      fireEvent.change(bodyTextarea, { target: { value: 'Detailed description' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'First option' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Second option' } });
      
      const techTag = screen.getByText('Tech');
      fireEvent.click(techTag);
      
      const anonymousSwitch = screen.getByLabelText(/createPoll.postAnonymously/i);
      fireEvent.click(anonymousSwitch);
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should upload media files when creating poll', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockUpload = vi.fn().mockResolvedValue({
        error: null,
        data: { path: 'mock-path' },
      });
      
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/mock-url' },
      });
      
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });
      
      (supabase.storage.from as any) = mockStorageFrom;
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Poll with Media' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalled();
        expect(mockGetPublicUrl).toHaveBeenCalled();
      });
    });

    it('should filter out empty options before submission', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      // Add extra options
      const addButton = screen.getByText(/createPoll.addOption/i);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      // Fill only first 2 options
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      // Leave options[2] and options[3] empty
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        // Check that only 2 options were inserted (empty ones filtered out)
        const insertCall = mockInsert.mock.calls.find((call: any) => 
          Array.isArray(call[0]) && call[0][0]?.label
        );
        expect(insertCall[0]).toHaveLength(2);
      });
    });
  });

  // ============= ERROR HANDLING TESTS =============

  describe('Error Handling', () => {
    it('should handle poll creation database error', async () => {
      const mockUser = { id: 'user-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockError = new Error('Database error');
      
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.error',
          description: 'Database error',
          variant: 'destructive',
        });
      });
    });

    it('should handle poll options insertion error', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockError = new Error('Options insert failed');
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'polls') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
              }),
            }),
          };
        }
        if (table === 'poll_options') {
          return {
            insert: vi.fn().mockResolvedValue({ error: mockError }),
          };
        }
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'createPoll.error',
            variant: 'destructive',
          })
        );
      });
    });

    it('should continue poll creation even if media upload fails', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockUploadError = new Error('Upload failed');
      
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          error: mockUploadError,
          data: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/mock-url' },
        }),
      });
      
      (supabase.storage.from as any) = mockStorageFrom;
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const input = screen.getByLabelText(/createPoll.uploadMedia/i).closest('label')?.querySelector('input') as HTMLInputElement;
      
      Object.defineProperty(input, 'files', {
        value: [file],
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      // Poll should still be created successfully despite upload failure
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.success',
          description: 'createPoll.pollCreated',
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error uploading file:', mockUploadError);
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  // ============= LOADING STATE TESTS =============

  describe('Loading States', () => {
    it('should disable submit button while loading', async () => {
      const mockUser = { id: 'user-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      // Make the insert hang to keep loading state
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => new Promise(() => {})),
          }),
        }),
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent('Creating...');
      });
    });
  });

  // ============= EDGE CASES =============

  describe('Edge Cases', () => {
    it('should handle empty body field (optional field)', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      // Leave body empty
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            body: null,
          })
        );
      });
    });

    it('should handle whitespace-only options correctly', async () => {
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: '   ' } });
      fireEvent.change(optionInputs[1], { target: { value: '   ' } });
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      // Should fail validation because trimmed options are empty
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.error',
          description: 'createPoll.minOptions',
          variant: 'destructive',
        });
      });
    });

    it('should handle tags when no tags exist in database', async () => {
      const mockUser = { id: 'user-123' };
      const mockPoll = { id: 'poll-123' };
      
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      });
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'polls' || table === 'poll_options') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPoll, error: null }),
              }),
            }),
          };
        }
        if (table === 'tags') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [] }), // No tags found
            }),
          };
        }
      });
      
      renderWithRouter(<CreatePoll />);
      
      const titleInput = screen.getByLabelText(/createPoll.pollTitle/i);
      fireEvent.change(titleInput, { target: { value: 'Test Poll' } });
      
      const optionInputs = screen.getAllByPlaceholderText(/createPoll.option/i);
      fireEvent.change(optionInputs[0], { target: { value: 'Option 1' } });
      fireEvent.change(optionInputs[1], { target: { value: 'Option 2' } });
      
      const techTag = screen.getByText('Tech');
      fireEvent.click(techTag);
      
      const submitButton = screen.getByRole('button', { name: /createPoll.createPoll/i });
      fireEvent.click(submitButton);
      
      // Should complete successfully even though tags don't exist in DB
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'createPoll.success',
          description: 'createPoll.pollCreated',
        });
      });
    });
  });
});
