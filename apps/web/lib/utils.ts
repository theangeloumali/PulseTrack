import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the correct API path considering the basePath configuration
 * Explicitly handles basePath since automatic handling isn't working
 */
export function getApiPath(endpoint: string): string {
  // Ensure the endpoint starts with /api/
  if (!endpoint.startsWith('/api/')) {
    if (endpoint.startsWith('api/')) {
      endpoint = '/' + endpoint;
    } else {
      endpoint = '/api/' + endpoint;
    }
  }
  
  // Explicitly add basePath prefix since Next.js automatic handling isn't working as expected
  const basePath = '/pulse';
  return `${basePath}${endpoint}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}

// Format duration in hours (decimal) to human readable format
export function formatDurationHours(hours: number): string {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  
  if (wholeHours > 0 && minutes > 0) {
    return `${wholeHours}h ${minutes}m`
  } else if (wholeHours > 0) {
    return `${wholeHours}h`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return '0m'
  }
}

// Convert seconds to decimal hours
export function secondsToHours(seconds: number): number {
  return seconds / 3600
}

// Convert decimal hours to seconds
export function hoursToSeconds(hours: number): number {
  return hours * 3600
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'review':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'done':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'archived':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Filter utilities for tickets page
export interface TicketFilters {
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  projectFilter: string;
  companyFilter: string;
  viewMode: 'board' | 'list';
}

export function getDefaultFilters(): TicketFilters {
  return {
    searchTerm: '',
    statusFilter: 'all',
    priorityFilter: 'all',
    projectFilter: 'all',
    companyFilter: 'all',
    viewMode: 'board'
  };
}

export function saveFiltersToStorage(filters: TicketFilters): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('tickets-filters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  }
}

export function loadFiltersFromStorage(): TicketFilters {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('tickets-filters');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all required properties exist with fallbacks
        return {
          searchTerm: parsed.searchTerm || '',
          statusFilter: parsed.statusFilter || 'all',
          priorityFilter: parsed.priorityFilter || 'all',
          projectFilter: parsed.projectFilter || 'all',
          companyFilter: parsed.companyFilter || 'all',
          viewMode: parsed.viewMode || 'board'
        };
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
  }
  return getDefaultFilters();
}

export function clearFiltersFromStorage(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('tickets-filters');
    } catch (error) {
      console.warn('Failed to clear filters from localStorage:', error);
    }
  }
}

export function isFiltersActive(filters: TicketFilters): boolean {
  const defaultFilters = getDefaultFilters();
  return (
    filters.searchTerm !== defaultFilters.searchTerm ||
    filters.statusFilter !== defaultFilters.statusFilter ||
    filters.priorityFilter !== defaultFilters.priorityFilter ||
    filters.projectFilter !== defaultFilters.projectFilter ||
    filters.companyFilter !== defaultFilters.companyFilter
  );
}

export function getActiveFiltersCount(filters: TicketFilters): number {
  let count = 0;
  if (filters.searchTerm) count++;
  if (filters.statusFilter !== 'all') count++;
  if (filters.priorityFilter !== 'all') count++;
  if (filters.projectFilter !== 'all') count++;
  if (filters.companyFilter !== 'all') count++;
  return count;
}
