'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Badge } from '@workspace/ui/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import type { BillingPeriod } from '@/lib/db/schema';
import { format, parseISO } from 'date-fns';
import { 
  Clock, 
  User, 
  FolderOpen, 
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface TimeDetailViewProps {
  billingPeriod: BillingPeriod;
  billingReport: any;
  companyId: string;
  isLoading: boolean;
}

interface TimeEntry {
  id: string;
  date: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  ticketId?: string;
  ticketTitle?: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  isBillable: boolean;
}

export function TimeDetailView({ 
  billingPeriod, 
  billingReport, 
  companyId, 
  isLoading 
}: TimeDetailViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [billableFilter, setBillableFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'user' | 'project' | 'hours' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Process billing report into time entries
  const timeEntries = useMemo(() => {
    if (!billingReport) return [];
    
    const entries: TimeEntry[] = [];
    
    Object.entries(billingReport).forEach(([date, dateData]: [string, any]) => {
      Object.entries(dateData).forEach(([userId, userData]: [string, any]) => {
        const userName = `${userData.userFirstName} ${userData.userLastName}`;
        
        if (userData.projects) {
          Object.entries(userData.projects).forEach(([projectId, projectData]: [string, any]) => {
            const projectName = projectData.projectName || `Project ${projectId.slice(0, 8)}`;
            
            // Check if tickets is an array (new structure) or object (old structure)
            if (projectData.tickets && Array.isArray(projectData.tickets)) {
              // New structure: tickets is an array of individual entries
              projectData.tickets.forEach((ticketEntry: any, index: number) => {
                const hours = ticketEntry.hours || 0;
                const amount = ticketEntry.amount || 0;
                const rate = hours > 0 ? amount / hours : 0;
                
                // Create a unique ID that includes the index to prevent duplicates
                const uniqueId = ticketEntry.timeEntryId 
                  ? `entry-${ticketEntry.timeEntryId}`
                  : `${date}-${userId}-${projectId}-${ticketEntry.ticketId || 'unknown'}-${index}`;
                
                entries.push({
                  id: uniqueId,
                  date,
                  userId,
                  userName,
                  projectId,
                  projectName,
                  ticketId: ticketEntry.ticketId,
                  ticketTitle: ticketEntry.ticketTitle || 'Untitled Ticket',
                  description: ticketEntry.description || '',
                  hours,
                  rate,
                  amount,
                  isBillable: true
                });
              });
            } else if (projectData.tickets && typeof projectData.tickets === 'object') {
              // Old structure: tickets is an object with ticket IDs as keys
              Object.entries(projectData.tickets).forEach(([ticketId, ticketData]: [string, any], index: number) => {
                const ticketTitle = ticketData.title || `Ticket ${ticketId.slice(0, 8)}`;
                const hours = ticketData.totalHours || 0;
                const rate = ticketData.hourlyRate || 0;
                const amount = hours * rate;
                
                entries.push({
                  id: `legacy-${date}-${userId}-${projectId}-${ticketId}-${index}`,
                  date,
                  userId,
                  userName,
                  projectId,
                  projectName,
                  ticketId,
                  ticketTitle,
                  description: ticketData.description || '',
                  hours,
                  rate,
                  amount,
                  isBillable: true
                });
              });
            } else {
              // Project-level entry without specific tickets
              const hours = projectData.totalHours || 0;
              const amount = projectData.totalAmount || 0;
              const rate = hours > 0 ? amount / hours : 0;
              
              if (hours > 0) {
                entries.push({
                  id: `project-${date}-${userId}-${projectId}`,
                  date,
                  userId,
                  userName,
                  projectId,
                  projectName,
                  description: 'General project work',
                  hours,
                  rate,
                  amount,
                  isBillable: true
                });
              }
            }
          });
        } else {
          // User-level entry without project breakdown
          const hours = userData.totalHours || 0;
          const amount = userData.totalAmount || 0;
          const rate = hours > 0 ? amount / hours : 0;
          
          if (hours > 0) {
            entries.push({
              id: `user-${date}-${userId}`,
              date,
              userId,
              userName,
              projectId: 'general',
              projectName: 'General Work',
              description: 'General work',
              hours,
              rate,
              amount,
              isBillable: true
            });
          }
        }
      });
    });
    
    return entries;
  }, [billingReport]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let filtered = timeEntries.filter(entry => {
      const matchesSearch = searchTerm === '' || 
        entry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ticketTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUser = selectedUser === 'all' || entry.userId === selectedUser;
      const matchesProject = selectedProject === 'all' || entry.projectId === selectedProject;
      const matchesBillable = billableFilter === 'all' || 
        (billableFilter === 'billable' && entry.isBillable) ||
        (billableFilter === 'non-billable' && !entry.isBillable);
      
      return matchesSearch && matchesUser && matchesProject && matchesBillable;
    });

    // Sort entries
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'user':
          comparison = a.userName.localeCompare(b.userName);
          break;
        case 'project':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'hours':
          comparison = a.hours - b.hours;
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [timeEntries, searchTerm, selectedUser, selectedProject, billableFilter, sortBy, sortOrder]);

  // Get unique users and projects for filters
  const uniqueUsers = useMemo(() => {
    const users = new Map();
    timeEntries.forEach(entry => {
      if (!users.has(entry.userId)) {
        users.set(entry.userId, entry.userName);
      }
    });
    return Array.from(users.entries());
  }, [timeEntries]);

  const uniqueProjects = useMemo(() => {
    const projects = new Map();
    timeEntries.forEach(entry => {
      if (!projects.has(entry.projectId)) {
        projects.set(entry.projectId, entry.projectName);
      }
    });
    return Array.from(projects.entries());
  }, [timeEntries]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalAmount = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
    return { totalHours, totalAmount };
  }, [filteredEntries]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {uniqueProjects.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={billableFilter} onValueChange={setBillableFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Entries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entries</SelectItem>
                <SelectItem value="billable">Billable Only</SelectItem>
                <SelectItem value="non-billable">Non-Billable Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Filtered Hours</div>
                <div className="text-xl font-bold">{filteredTotals.totalHours.toFixed(1)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="text-green-600">$</div>
              <div>
                <div className="text-sm text-muted-foreground">Filtered Amount</div>
                <div className="text-xl font-bold">${filteredTotals.totalAmount.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="text-blue-600">#</div>
              <div>
                <div className="text-sm text-muted-foreground">Entries</div>
                <div className="text-xl font-bold">{filteredEntries.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Entries
          </CardTitle>
          <CardDescription>
            Detailed breakdown of all time entries for this billing period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortBy === 'date' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('user')}
                  >
                    <div className="flex items-center gap-1">
                      User
                      {sortBy === 'user' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('project')}
                  >
                    <div className="flex items-center gap-1">
                      Project
                      {sortBy === 'project' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-3">Description</th>
                  <th 
                    className="text-right p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('hours')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Hours
                      {sortBy === 'hours' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-right p-3">Rate</th>
                  <th 
                    className="text-right p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount
                      {sortBy === 'amount' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-muted-foreground">
                      No time entries found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(entry.date), 'MMM dd')}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                            {entry.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          {entry.userName}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{entry.projectName}</div>
                            {entry.ticketTitle && (
                              <div className="text-xs text-muted-foreground">{entry.ticketTitle}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-xs truncate" title={entry.description}>
                          {entry.description}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {entry.hours.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        ${entry.rate.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        ${entry.amount.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {entry.isBillable ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}