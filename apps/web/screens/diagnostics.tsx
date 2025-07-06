"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { useAuthStore } from "@/lib/stores/auth";
import { useRoleAccess } from "@/lib/hooks/useRoleAccess";
import {
  useAllCompanyProjectsQuery,
  useAllCompanyProjectsWithTicketCountsQuery,
} from "@/lib/hooks/useProjects";
import { useAllCompanyTicketsQuery } from "@/lib/hooks/useTickets";
import {
  createProject,
  createTicket,
  getProjectsByCompany,
  getTicketsByCompany,
  getProjectsWithTicketCounts,
  getTicketCountByProject,
  getTicketsByProject,
} from "@/lib/db/service";
import { supabase } from "@/lib/supabase/client";
import {
  Activity,
  Database,
  Users,
  FolderOpen,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Bug,
  Eye,
  TestTube,
  ExternalLink,
} from "lucide-react";

export default function DiagnosticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [testResults, setTestResults] = useState<
    Record<string, { status: string; message: string; details?: any }>
  >({});
  const [detailedResults, setDetailedResults] = useState<
    {
      test: string;
      success: boolean;
      data?: any;
      error?: any;
      timestamp: string;
    }[]
  >([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProjectName, setTestProjectName] = useState(
    "Test Project " + Date.now(),
  );
  const [testTicketTitle, setTestTicketTitle] = useState(
    "Test Ticket " + Date.now(),
  );
  const router = useRouter();

  const { user } = useAuthStore();
  const { canAccessDiagnostics } = useRoleAccess();
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useAllCompanyProjectsQuery();
  const {
    data: projectsWithCounts = [],
    isLoading: projectsWithCountsLoading,
    error: projectsWithCountsError,
  } = useAllCompanyProjectsWithTicketCountsQuery();
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useAllCompanyTicketsQuery(user?.company_id);

  // Redirect users without diagnostics access
  useEffect(() => {
    if (user && !canAccessDiagnostics()) {
      router.push("/dashboard");
    }
  }, [user, canAccessDiagnostics, router]);

  // Don't render the page if user doesn't have access
  if (user && !canAccessDiagnostics()) {
    return <div></div>;
  }

  const tabs = [
    { id: "overview", label: "System Overview", icon: Activity },
    { id: "auth", label: "Authentication", icon: Users },
    { id: "data", label: "Data Status", icon: Database },
    { id: "queries", label: "Query Performance", icon: Eye },
    { id: "tests", label: "Integration Tests", icon: TestTube },
  ];

  // Helper function for detailed test results (similar to test-data page)
  const addDetailedResult = (
    test: string,
    success: boolean,
    data?: any,
    error?: any,
  ) => {
    setDetailedResults((prev) => [
      ...prev,
      {
        test,
        success,
        data,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const runDiagnosticTests = async () => {
    setIsRunningTests(true);
    setDetailedResults([]);
    const results: any = {};

    try {
      // Test 0: Database Connection
      addDetailedResult(
        "Database Connection",
        true,
        "Testing database connection...",
        null,
      );
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("count")
          .limit(1);
        if (error) {
          addDetailedResult("Database Connection", false, null, error.message);
          results.databaseConnection = {
            status: "error",
            message: "Database connection failed",
            details: { error: error.message },
          };
        } else {
          addDetailedResult(
            "Database Connection",
            true,
            "Connected to database successfully",
          );
          results.databaseConnection = {
            status: "success",
            message: "Database connection successful",
            details: { response: data },
          };
        }
      } catch (error: unknown) {
        addDetailedResult(
          "Database Connection",
          false,
          null,
          (error as Error).message,
        );
        results.databaseConnection = {
          status: "error",
          message: "Database connection failed",
          details: { error: (error as Error).message },
        };
      }

      // Test 1: User Authentication
      addDetailedResult(
        "User Authentication",
        true,
        "Checking user authentication...",
        null,
      );
      results.auth = {
        status: user ? "success" : "error",
        message: user
          ? `Authenticated as ${user.first_name} ${user.last_name} (${user.email})`
          : "No user authenticated",
        details: {
          userId: user?.id,
          companyId: user?.company_id,
          role: user?.role,
        },
      };
      addDetailedResult(
        "User Authentication",
        !!user,
        user
          ? {
              userId: user.id,
              email: user.email,
              companyId: user.company_id,
              role: user.role,
            }
          : null,
        user ? null : "No user authenticated",
      );
      if (user?.company_id) {
        // Test 2: Data Fetching Comprehensive
        addDetailedResult(
          "Data Fetching - Projects",
          true,
          "Fetching projects...",
          null,
        );
        try {
          const fetchedProjects = await getProjectsByCompany(user.company_id);
          addDetailedResult("Data Fetching - Projects", true, {
            companyId: user.company_id,
            projectCount: fetchedProjects.length,
            projects: fetchedProjects.slice(0, 2), // Show first 2 for brevity
          });

          addDetailedResult(
            "Data Fetching - Tickets",
            true,
            "Fetching company tickets...",
            null,
          );
          const fetchedTickets = await getTicketsByCompany(user.company_id);
          addDetailedResult("Data Fetching - Tickets", true, {
            companyId: user.company_id,
            ticketCount: fetchedTickets.length,
            tickets: fetchedTickets.slice(0, 2), // Show first 2 for brevity
          });

          addDetailedResult(
            "Data Fetching - Projects with Counts",
            true,
            "Fetching projects with ticket counts...",
            null,
          );
          const projectsWithTicketCounts = await getProjectsWithTicketCounts(
            user.company_id,
          );
          addDetailedResult("Data Fetching - Projects with Counts", true, {
            projectsWithCountsCount: projectsWithTicketCounts.length,
            sampleProjectWithCount: projectsWithTicketCounts[0] || null,
          });

          results.dataFetching = {
            status: "success",
            message: `Successfully fetched ${fetchedProjects.length} projects and ${fetchedTickets.length} tickets`,
            details: {
              projectCount: fetchedProjects.length,
              ticketCount: fetchedTickets.length,
              projectsWithCountsCount: projectsWithTicketCounts.length,
              sampleData: {
                firstProject: fetchedProjects[0] || null,
                firstTicket: fetchedTickets[0] || null,
                firstProjectWithCount: projectsWithTicketCounts[0] || null,
              },
            },
          };

          // Test if we have projects for further testing
          if (fetchedProjects.length > 0) {
            // Test 3: Project-specific ticket fetching
            const firstProject = fetchedProjects[0];
            if (firstProject) {
              addDetailedResult(
                "Project Tickets Fetch",
                true,
                `Fetching tickets for project: ${firstProject.name}`,
                null,
              );
              try {
                const projectTickets = await getTicketsByProject(
                  firstProject.id,
                );
                addDetailedResult("Project Tickets Fetch", true, {
                  projectId: firstProject.id,
                  projectName: firstProject.name,
                  ticketCount: projectTickets.length,
                  tickets: projectTickets,
                });

                // Test 4: Ticket count accuracy
                addDetailedResult(
                  "Ticket Count Verification",
                  true,
                  `Verifying ticket count for project: ${firstProject.name}`,
                  null,
                );
                const ticketCount = await getTicketCountByProject(
                  firstProject.id,
                );
                const countMatch = ticketCount === projectTickets.length;
                addDetailedResult(
                  "Ticket Count Verification",
                  countMatch,
                  {
                    projectId: firstProject.id,
                    countFromQuery: ticketCount,
                    countFromArray: projectTickets.length,
                    match: countMatch,
                  },
                  countMatch ? null : "Ticket count mismatch detected",
                );

                results.ticketCountAccuracy = {
                  status: countMatch ? "success" : "warning",
                  message: `Ticket count verification: ${countMatch ? "PASS" : "FAIL"} (${ticketCount} vs ${projectTickets.length})`,
                  details: {
                    projectId: firstProject.id,
                    countFromQuery: ticketCount,
                    countFromArray: projectTickets.length,
                    match: countMatch,
                  },
                };
              } catch (error: unknown) {
                addDetailedResult(
                  "Project Tickets Fetch",
                  false,
                  null,
                  (error as Error).message,
                );
                results.projectTickets = {
                  status: "error",
                  message: "Failed to fetch project tickets",
                  details: { error: (error as Error).message },
                };
              }
            }
          }
        } catch (error: unknown) {
          addDetailedResult(
            "Data Fetching",
            false,
            null,
            (error as Error).message,
          );
          results.dataFetching = {
            status: "error",
            message: "Failed to fetch data",
            details: { error: (error as Error).message },
          };
        }

        // Test 5: Project Creation (if requested)
        if (testProjectName.includes("Test Project")) {
          addDetailedResult(
            "Project Creation",
            true,
            "Creating test project...",
            null,
          );
          try {
            const projectData = {
              name: testProjectName,
              description: "Diagnostic test project",
              status: "active" as const,
              company_id: user.company_id,
              owner_id: user.id,
            };
            addDetailedResult(
              "Project Creation - Data",
              true,
              projectData,
              null,
            );

            const newProject = await createProject(projectData);
            addDetailedResult("Project Creation", true, newProject, null);
            results.projectCreation = {
              status: "success",
              message: `Project "${newProject.name}" created successfully`,
              details: { projectId: newProject.id, projectData: newProject },
            };

            // Test 6: Ticket Creation (for the new project)
            if (testTicketTitle.includes("Test Ticket")) {
              addDetailedResult(
                "Ticket Creation",
                true,
                "Creating test ticket...",
                null,
              );
              try {
                const ticketData = {
                  title: testTicketTitle,
                  description: "Diagnostic test ticket",
                  status: "new" as const,
                  priority: "medium" as const,
                  project_id: newProject.id,
                  assignee_id: user.id,
                  reporter_id: user.id,
                };
                addDetailedResult(
                  "Ticket Creation - Data",
                  true,
                  ticketData,
                  null,
                );

                const newTicket = await createTicket(ticketData);
                addDetailedResult("Ticket Creation", true, newTicket, null);
                results.ticketCreation = {
                  status: "success",
                  message: `Ticket "${newTicket.title}" created successfully`,
                  details: { ticketId: newTicket.id, ticketData: newTicket },
                };
              } catch (error: unknown) {
                addDetailedResult(
                  "Ticket Creation",
                  false,
                  null,
                  (error as Error).message,
                );
                results.ticketCreation = {
                  status: "error",
                  message: "Failed to create ticket",
                  details: { error: (error as Error).message },
                };
              }
            }
          } catch (error: unknown) {
            addDetailedResult(
              "Project Creation",
              false,
              null,
              (error as Error).message,
            );
            results.projectCreation = {
              status: "error",
              message: "Failed to create project",
              details: { error: (error as Error).message },
            };
          }
        }
      } else {
        addDetailedResult(
          "Data Operations",
          false,
          null,
          "No company ID available for data operations",
        );
        results.dataOperations = {
          status: "error",
          message: "No company ID available for data operations",
        };
      }
    } catch (error: unknown) {
      addDetailedResult(
        "General Test Failure",
        false,
        null,
        (error as Error).message,
      );
      results.general = {
        status: "error",
        message: "Diagnostic tests failed",
        details: { error: (error as Error).message },
      };
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-muted text-foreground";
    }
  };

  const renderOverview = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Authentication</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{user ? "Active" : "None"}</div>
          <p className="text-xs text-muted-foreground">
            {user
              ? `${user.first_name} ${user.last_name}`
              : "No user logged in"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projects</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {projectsLoading ? "..." : projects.length}
          </div>
          <p className="text-xs text-muted-foreground">
            {projectsError ? "Error loading" : "Total projects"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {ticketsLoading ? "..." : tickets.length}
          </div>
          <p className="text-xs text-muted-foreground">
            {ticketsError ? "Error loading" : "Total tickets"}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(user ? "success" : "error")}
                <span className="text-sm">Authentication System</span>
                <Badge className={getStatusColor(user ? "success" : "error")}>
                  {user ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(projectsError ? "error" : "success")}
                <span className="text-sm">Project Data</span>
                <Badge
                  className={getStatusColor(
                    projectsError ? "error" : "success",
                  )}
                >
                  {projectsError ? "Error" : "OK"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(ticketsError ? "error" : "success")}
                <span className="text-sm">Ticket Data</span>
                <Badge
                  className={getStatusColor(ticketsError ? "error" : "success")}
                >
                  {ticketsError ? "Error" : "OK"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(projectsWithCountsError ? "error" : "success")}
                <span className="text-sm">Aggregated Data</span>
                <Badge
                  className={getStatusColor(
                    projectsWithCountsError ? "error" : "success",
                  )}
                >
                  {projectsWithCountsError ? "Error" : "OK"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAuth = () => (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Details</CardTitle>
        <CardDescription>Current user session and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  User ID
                </dt>
                <dd className="mt-1 text-sm text-foreground font-mono">
                  {user.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-foreground">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Name
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {user.first_name} {user.last_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-1 text-sm text-foreground">{user.role}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Company ID
                </dt>
                <dd className="mt-1 text-sm text-foreground font-mono">
                  {user.company_id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {new Date(user.created_at).toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              Not authenticated
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please log in to view authentication details
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderData = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Loading Status</CardTitle>
          <CardDescription>Current state of data queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FolderOpen className="h-5 w-5" />
                <div>
                  <div className="font-medium">Projects Query</div>
                  <div className="text-sm text-muted-foreground">
                    Basic project data
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {projectsLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Badge
                  className={getStatusColor(
                    projectsError ? "error" : "success",
                  )}
                >
                  {projectsLoading
                    ? "Loading"
                    : projectsError
                      ? "Error"
                      : `${projects.length} items`}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FolderOpen className="h-5 w-5" />
                <div>
                  <div className="font-medium">Projects with Ticket Counts</div>
                  <div className="text-sm text-muted-foreground">
                    Aggregated project data
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {projectsWithCountsLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Badge
                  className={getStatusColor(
                    projectsWithCountsError ? "error" : "success",
                  )}
                >
                  {projectsWithCountsLoading
                    ? "Loading"
                    : projectsWithCountsError
                      ? "Error"
                      : `${projectsWithCounts.length} items`}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5" />
                <div>
                  <div className="font-medium">Tickets Query</div>
                  <div className="text-sm text-muted-foreground">
                    Company tickets
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {ticketsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Badge
                  className={getStatusColor(ticketsError ? "error" : "success")}
                >
                  {ticketsLoading
                    ? "Loading"
                    : ticketsError
                      ? "Error"
                      : `${tickets.length} items`}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {projectsWithCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Ticket Counts</CardTitle>
            <CardDescription>
              Verification of ticket count aggregation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {projectsWithCounts.map((project: any) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {project.id}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {project.ticket_count} tickets
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderQueries = () => (
    <Card>
      <CardHeader>
        <CardTitle>Query Performance</CardTitle>
        <CardDescription>Database query execution status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm">
            <strong>Projects Query:</strong>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(
                {
                  loading: projectsLoading,
                  error: projectsError?.message,
                  dataCount: projects.length,
                },
                null,
                2,
              )}
            </pre>
          </div>

          <div className="text-sm">
            <strong>Tickets Query:</strong>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(
                {
                  loading: ticketsLoading,
                  error: ticketsError?.message,
                  dataCount: tickets.length,
                },
                null,
                2,
              )}
            </pre>
          </div>

          <div className="text-sm">
            <strong>Projects with Counts Query:</strong>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(
                {
                  loading: projectsWithCountsLoading,
                  error: projectsWithCountsError?.message,
                  dataCount: projectsWithCounts.length,
                  sampleData: projectsWithCounts[0] || null,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTests = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integration Tests</CardTitle>
          <CardDescription>
            Test core functionality end-to-end with detailed logging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Test Project Name</label>
                <Input
                  value={testProjectName}
                  onChange={(e) => setTestProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Test Ticket Title</label>
                <Input
                  value={testTicketTitle}
                  onChange={(e) => setTestTicketTitle(e.target.value)}
                  placeholder="Enter ticket title"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={runDiagnosticTests}
                disabled={isRunningTests || !user}
                className="flex-1"
              >
                {isRunningTests ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Comprehensive Tests...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Run Full Diagnostic Tests
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open("/test-data", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Advanced Testing
              </Button>
            </div>

            {!user && (
              <p className="text-sm text-muted-foreground text-center">
                Please log in to run diagnostic tests
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Test Results */}
      {detailedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Test Execution Log</CardTitle>
            <CardDescription>
              Step-by-step test execution with full error details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {isRunningTests && (
                <div className="flex items-center text-blue-600 dark:text-blue-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Running detailed tests...
                </div>
              )}
              {detailedResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${result.success ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"}`}
                >
                  <div className="font-medium flex justify-between items-start">
                    <span className="flex-1">{result.test}</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${result.success ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}
                      >
                        {result.success ? "PASS" : "FAIL"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp}
                      </span>
                    </div>
                  </div>

                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                        View Details
                      </summary>
                      <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}

                  {result.error && (
                    <div className="text-red-600 dark:text-red-400 text-sm mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Test Results */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
            <CardDescription>
              High-level results from the diagnostic tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(testResults).map(
                ([testName, result]: [string, any]) => (
                  <div key={testName} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">
                        {testName.replace(/([A-Z])/g, " $1")}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.status)}
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {result.message}
                    </p>
                    {result.details && (
                      <details>
                        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                          Technical Details
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto mt-2">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Bug className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-foreground">
              System Diagnostics
            </h1>
          </div>
          <p className="text-muted-foreground">
            Monitor system health, test functionality, and debug issues
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "auth" && renderAuth()}
          {activeTab === "data" && renderData()}
          {activeTab === "queries" && renderQueries()}
          {activeTab === "tests" && renderTests()}
        </div>
      </div>
    </div>
  );
}
