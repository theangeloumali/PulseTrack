'use client';

import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { useAuthStore } from '@/lib/stores/auth';
import { useProjectsQuery } from '@/lib/hooks/useProjects';
import { useCompanyTicketsQuery } from '@/lib/hooks/useTickets';
import { 
  createTicket,
  createProject,
  getTicketsByProject,
  getTicketsByCompany
} from '@/lib/db/service';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Database, Plus } from 'lucide-react';

export default function TestDataPage() {
  // Prevent access in production
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Available</h1>
          <p className="text-gray-600">This test page is only available in development mode.</p>
        </div>
      </div>
    );
  }
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();

  const { data: projects = [] } = useProjectsQuery();
  const { data: tickets = [] } = useCompanyTicketsQuery(user?.company_id);

  const addResult = (test: string, success: boolean, data?: any, error?: any) => {
    setResults(prev => [...prev, {
      test,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const createTestProject = async () => {
    if (!user) {
      addResult('Create Test Project', false, null, 'User not found');
      return;
    }
    
    setIsLoading(true);
    addResult('Create Test Project', true, 'Starting project creation...', null);
    
    try {
      const projectData = {
        name: `Test Project ${Date.now()}`,
        description: 'A test project for testing tickets',
        status: 'active' as const,
        company_id: user.company_id,
        owner_id: user.id,
      };

      console.log('Creating project with data:', projectData);
      addResult('Create Test Project - Data', true, projectData, null);

      const result = await createProject(projectData);
      console.log('Project created successfully:', result);
      addResult('Create Test Project - Success', true, result);
    } catch (error) {
      console.error('Project creation failed:', error);
      addResult('Create Test Project - Error', false, null, error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const createTestTicket = async () => {
    if (!user || projects.length === 0) {
      addResult('Create Test Ticket', false, null, 'No projects available or user not found');
      return;
    }

    setIsLoading(true);
    try {
      const ticketData = {
        title: `Test Ticket ${Date.now()}`,
        description: 'This is a test ticket to verify the ticket system is working',
        priority: 'medium' as const,
        status: 'new' as const,
        project_id: projects?.[0]?.id,
        assignee_id: user.id,
        reporter_id: user.id,
        estimated_hours: null,
        actual_hours: null,
        due_date: null,
      };

      const result = await createTicket(ticketData);
      addResult('Create Test Ticket', true, result);
    } catch (error) {
      addResult('Create Test Ticket', false, null, error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectTickets = async () => {
    if (projects.length === 0) {
      addResult('Fetch Project Tickets', false, null, 'No projects available');
      return;
    }

    setIsLoading(true);
    try {
      const projectId = projects?.[0]?.id;
      const result = await getTicketsByProject(projectId);
      addResult('Fetch Project Tickets', true, {
        projectId,
        projectName: projects?.[0]?.name,
        ticketCount: result.length,
        tickets: result
      });
    } catch (error) {
      console.error('Full error object:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
      addResult('Fetch Project Tickets', false, null, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyTickets = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const result = await getTicketsByCompany(user.company_id);
      addResult('Fetch Company Tickets', true, {
        companyId: user.company_id,
        ticketCount: result.length,
        tickets: result
      });
    } catch (error) {
      console.error('Full error object:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
      addResult('Fetch Company Tickets', false, null, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    try {
      // Test basic connection
      const { data, error } = await supabase.from('companies').select('count').limit(1);
      if (error) {
        addResult('Database Connection', false, null, error.message);
      } else {
        addResult('Database Connection', true, 'Connected to database successfully');
      }
    } catch (error) {
      addResult('Database Connection', false, null, error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    await testDatabaseConnection();
    await fetchCompanyTickets();
    await fetchProjectTickets();
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Test Data & Debugging</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>User: {user?.first_name} ({user?.email})</div>
              <div>Company ID: {user?.company_id}</div>
              <div>Projects: {projects.length}</div>
              <div>Tickets: {tickets.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {projects.length === 0 ? (
                <div className="text-gray-500">No projects found</div>
              ) : (
                projects.map(project => (
                  <div key={project.id}>
                    {project.name} ({project.status})
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {tickets.length === 0 ? (
                <div className="text-gray-500">No tickets found</div>
              ) : (
                tickets.map(ticket => (
                  <div key={ticket.id}>
                    {ticket.title} ({ticket.status})
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-x-2">
        <Button onClick={runAllTests} disabled={isLoading}>
          <Database className="h-4 w-4 mr-2" />
          Run Tests
        </Button>
        <Button onClick={testDatabaseConnection} disabled={isLoading}>
          Test DB Connection
        </Button>
        <Button onClick={createTestProject} disabled={isLoading || !user}>
          <Plus className="h-4 w-4 mr-2" />
          Create Test Project
        </Button>
        <Button onClick={createTestTicket} disabled={isLoading || !user || projects.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Create Test Ticket
        </Button>
        <Button onClick={fetchProjectTickets} disabled={isLoading || projects.length === 0}>
          Fetch Project Tickets
        </Button>
        <Button onClick={fetchCompanyTickets} disabled={isLoading || !user}>
          Fetch Company Tickets
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-auto">
            {isLoading && (
              <div className="flex items-center text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running test...
              </div>
            )}
            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="font-medium flex justify-between">
                  <span>{result.test}</span>
                  <span className="text-sm text-gray-500">{result.timestamp}</span>
                </div>
                <div className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? 'PASS' : 'FAIL'}
                </div>
                {result.data && (
                  <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
                {result.error && (
                  <div className="text-red-600 text-sm mt-1">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
