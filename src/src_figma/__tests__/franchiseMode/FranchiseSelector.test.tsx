import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FranchiseSelector } from '../../app/pages/FranchiseSelector';

const mockNavigate = vi.fn();
const mockListFranchises = vi.fn();
const mockDeleteFranchise = vi.fn();
const mockSetActiveFranchise = vi.fn();
const mockRenameFranchise = vi.fn();
const mockExportFranchise = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/franchiseManager', () => ({
  listFranchises: (...args: unknown[]) => mockListFranchises(...args),
  createFranchise: vi.fn(),
  deleteFranchise: (...args: unknown[]) => mockDeleteFranchise(...args),
  renameFranchise: (...args: unknown[]) => mockRenameFranchise(...args),
  setActiveFranchise: (...args: unknown[]) => mockSetActiveFranchise(...args),
  exportFranchise: (...args: unknown[]) => mockExportFranchise(...args),
}));

describe('FranchiseSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteFranchise.mockResolvedValue(undefined);
    mockSetActiveFranchise.mockResolvedValue(undefined);
    mockRenameFranchise.mockResolvedValue(undefined);
    mockExportFranchise.mockResolvedValue(new Blob(['backup']));
  });

  test('delete action opens explicit confirmation, deletes the save slot, and refreshes the list', async () => {
    mockListFranchises
      .mockResolvedValueOnce([
        {
          id: 'franchise-1',
          name: 'Smoke Franchise',
          currentSeason: 1,
          lastPlayedAt: Date.now(),
          storageUsed: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    render(<FranchiseSelector />);

    expect(await screen.findByText('Smoke Franchise')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delete Smoke Franchise/i }));
    expect(screen.getByText(/Delete "Smoke Franchise"/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    await waitFor(() => expect(mockDeleteFranchise).toHaveBeenCalledWith('franchise-1'));
    await waitFor(() => expect(screen.queryByText('Smoke Franchise')).not.toBeInTheDocument());

    expect(mockListFranchises).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/No franchises yet/i)).toBeInTheDocument();
  });

  test('shows warm save-slot copy next to export/delete actions', async () => {
    mockListFranchises.mockResolvedValue([
      {
        id: 'franchise-1',
        name: 'Smoke Franchise',
        currentSeason: 1,
        lastPlayedAt: Date.now(),
        storageUsed: 0,
      },
    ]);

    render(<FranchiseSelector />);

    expect(await screen.findByText('Smoke Franchise')).toBeInTheDocument();
    expect(screen.getByText(/Export a save slot before big moves/i)).toBeInTheDocument();
    expect(screen.queryByText(/not implemented/i)).not.toBeInTheDocument();
  });

  test('action buttons do not open the franchise card while deleting', async () => {
    mockListFranchises.mockResolvedValue([
      {
        id: 'franchise-1',
        name: 'Smoke Franchise',
        currentSeason: 1,
        lastPlayedAt: Date.now(),
        storageUsed: 0,
      },
    ]);

    render(<FranchiseSelector />);

    expect(await screen.findByText('Smoke Franchise')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delete Smoke Franchise/i }));

    expect(mockSetActiveFranchise).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/franchise/franchise-1');
  });

  test('delete failure surfaces an error and keeps the save slot visible', async () => {
    mockListFranchises.mockResolvedValue([
      {
        id: 'franchise-1',
        name: 'Smoke Franchise',
        currentSeason: 1,
        lastPlayedAt: Date.now(),
        storageUsed: 0,
      },
    ]);
    mockDeleteFranchise.mockRejectedValueOnce(new Error('Delete failed'));

    render(<FranchiseSelector />);

    expect(await screen.findByText('Smoke Franchise')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Delete Smoke Franchise/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
    expect(screen.getByText(/Delete "Smoke Franchise"/i)).toBeInTheDocument();
    expect(mockListFranchises).toHaveBeenCalledTimes(1);
  });
});
