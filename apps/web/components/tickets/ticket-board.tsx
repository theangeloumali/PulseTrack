'use client';

import React, {useState, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {Card, CardContent, CardHeader, CardTitle} from '@workspace/ui/components/card';
import {Badge} from '@workspace/ui/components/badge';
import {Button} from '@workspace/ui/components/button';
import {Input} from '@workspace/ui/components/input';
import {Ticket, TicketStatus} from '@/lib/db/schema';
import {DeleteTicketModal} from '@/components/modals/delete-ticket-modal';
import {stripMarkdown} from '@/components/ui/markdown-viewer';
import {TimeTrackingModal} from '@/components/modals/time-tracking-modal';
import {useUpdateTicket, useUpdateTicketSortOrders} from '@/lib/hooks/useTickets';
import {useAssignableUsers} from '@/lib/hooks/useUsers';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  closestCorners,
  useDroppable,
  useDraggable,
  DragOverlay,
  rectIntersection,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
  Plus,
  MoreVertical,
  Trash2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
  GripVertical,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import Link from 'next/link';

// Portal for dropdowns to escape stacking context with proper positioning
function DropdownPortal({
  isOpen,
  triggerRef,
  children,
  position = 'bottom-left',
}: {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  position?: 'bottom-left' | 'bottom-right';
}) {
  const [dropdownPosition, setDropdownPosition] = useState({top: 0, left: 0});

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      let top = rect.bottom + scrollY + 8; // 8px below trigger
      let left = position === 'bottom-right' ? rect.right + scrollX : rect.left + scrollX;

      setDropdownPosition({top, left});
    }
  }, [isOpen, triggerRef, position]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}>
      {children}
    </div>,
    document.body,
  );
}

interface Column {
  id: TicketStatus;
  title: string;
  color: string;
}

type SortOption = 'priority' | 'created_at' | 'due_date' | 'assignee' | 'title';
type SortDirection = 'asc' | 'desc';

const defaultColumns: Column[] = [
  {
    id: 'new',
    title: 'To Do',
    color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
  },
  {
    id: 'review',
    title: 'Review',
    color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
  },
  {
    id: 'done',
    title: 'Done',
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
  },
];

interface SortableTicketCardProps {
  ticket: Ticket;
  onDelete: (ticket: Ticket) => void;
  onTimeTrack: (ticket: Ticket) => void;
  onExpandDropdown: (ticketId: string | null) => void;
  expandedDropdown: string | null;
  onAssign: (ticket: Ticket, userId: string | null) => void;
  onExpandAssignment: (ticketId: string | null) => void;
  expandedAssignment: string | null;
  onUpdatePriority: (ticket: Ticket, priority: string) => void;
  onExpandPriority: (ticketId: string | null) => void;
  expandedPriority: string | null;
}

interface DroppableColumnProps {
  column: Column;
  children: React.ReactNode;
  onRemoveColumn: (columnId: TicketStatus) => void;
  ticketCount: number;
  sortOption: SortOption;
  sortDirection: SortDirection;
  onSort: (columnId: TicketStatus, option: SortOption) => void;
}

function DroppableColumn({
  column,
  children,
  onRemoveColumn,
  ticketCount,
  sortOption,
  sortDirection,
  onSort,
}: DroppableColumnProps) {
  const {isOver, setNodeRef} = useDroppable({
    id: column.id,
  });

  const [showSortMenu, setShowSortMenu] = useState(false);

  const getSortIcon = () => {
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-3 w-3" />;
    return <ArrowUpDown className="h-3 w-3" />;
  };

  const sortOptions: {value: SortOption; label: string}[] = [
    {value: 'priority', label: 'Priority'},
    {value: 'created_at', label: 'Created Date'},
    {value: 'due_date', label: 'Due Date'},
    {value: 'assignee', label: 'Assignee'},
    {value: 'title', label: 'Title'},
  ];

  return (
    <div className="flex-shrink-0 w-80">
      <Card
        className={`h-fit ${column.color} border-2 ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {column.title}
              <Badge variant="secondary" className="ml-2 text-xs">
                {ticketCount}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              {/* Sort Button */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={`h-6 w-6 p-0 hover:text-muted-foreground border border-dashed hover:border-solid transition-all ${
                    sortOption !== 'created_at'
                      ? 'text-blue-600 border-blue-200 dark:border-blue-700'
                      : 'text-muted-foreground border-border'
                  }`}
                  title={`Sort by ${sortOption} (${sortDirection}) - Click to change`}>
                  {getSortIcon()}
                </Button>
                {showSortMenu && (
                  <div className="absolute right-0 top-7 bg-card border border-border rounded-md shadow-lg z-[9999] py-1 min-w-[140px]">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          onSort(column.id, option.value);
                          setShowSortMenu(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 w-full text-left ${
                          sortOption === option.value
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-foreground'
                        }`}>
                        <span>{option.label}</span>
                        {sortOption === option.value && getSortIcon()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Remove Column Button */}
              {!defaultColumns.some((col) => col.id === column.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveColumn(column.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[200px] relative overflow-visible">
          <div ref={setNodeRef} className="min-h-full overflow-visible">
            {children}
            {/* Add some empty space at the bottom for easier dropping */}
            <div className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableTicketCard({
  ticket,
  onDelete,
  onTimeTrack,
  onExpandDropdown,
  expandedDropdown,
  onAssign,
  onExpandAssignment,
  expandedAssignment,
  onUpdatePriority,
  onExpandPriority,
  expandedPriority,
}: SortableTicketCardProps) {
  const assigneeRef = React.useRef<HTMLDivElement>(null);
  const priorityRef = React.useRef<HTMLDivElement>(null);
  const moreButtonRef = React.useRef<HTMLButtonElement>(null);
  const {data: users = [], isLoading: usersLoading} = useAssignableUsers();
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: ticket.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // Remove transition during drag for immediate feedback
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? '1.02' : '1',
    zIndex: isDragging ? 50 : 'auto',
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <FileText className="h-3 w-3" />;
      case 'low':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const priorityOptions = [
    {
      value: 'low',
      label: 'Low',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      value: 'medium',
      label: 'Medium',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    },
    {
      value: 'high',
      label: 'High',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    },
    {
      value: 'critical',
      label: 'Critical',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    },
  ];

  const assignedUser = users.find((user) => user.id === ticket.assignee_id);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-ticket-id={ticket.id}
      className={`relative bg-card hover:shadow-md transition-all duration-200 border border-border ${
        isDragging
          ? 'shadow-lg ring-2 ring-blue-300 dark:ring-blue-500 z-50 cursor-grabbing'
          : 'z-10 hover:cursor-grab'
      }`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div
              className="text-muted-foreground mt-1 flex-shrink-0 hover:text-foreground transition-colors duration-150"
              title="Drag to reorder">
              <GripVertical className="h-4 w-4" />
            </div>
            <Link
              href={`/projects/${ticket.project_id}/tickets/${ticket.id}`}
              className="flex-1 min-w-0 hover:text-blue-600 transition-colors duration-150"
              onPointerDown={(e) => {
                // Prevent drag when clicking on link
                e.stopPropagation();
              }}>
              <h4 className="font-medium text-sm text-foreground truncate">{ticket.title}</h4>
            </Link>
          </div>
          <div className="relative z-[200]">
            <Button
              ref={moreButtonRef}
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onExpandDropdown(expandedDropdown === ticket.id ? null : ticket.id);
              }}
              onPointerDown={(e) => {
                // Prevent drag when clicking on more button
                e.stopPropagation();
              }}
              className="h-6 w-6 p-0 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
            <DropdownPortal
              isOpen={expandedDropdown === ticket.id}
              triggerRef={moreButtonRef}
              position="bottom-right">
              <div className="bg-card border border-border rounded-md shadow-lg py-1 min-w-[180px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandAssignment(expandedAssignment === ticket.id ? null : ticket.id);
                    onExpandDropdown(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 w-full text-left text-foreground">
                  <UserPlus className="h-4 w-4" />
                  Assign to User
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpandPriority(expandedPriority === ticket.id ? null : ticket.id);
                    onExpandDropdown(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 w-full text-left text-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Set Priority
                </button>
                <hr className="my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimeTrack(ticket);
                    onExpandDropdown(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 w-full text-left text-foreground">
                  <Clock className="h-4 w-4" />
                  Time Tracking
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ticket);
                    onExpandDropdown(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </DropdownPortal>
          </div>
        </div>

        {ticket.description && (
          <p
            className="text-xs text-muted-foreground mb-2 line-clamp-2"
            title={stripMarkdown(ticket.description)}>
            {stripMarkdown(ticket.description)}
          </p>
        )}

        <div className="flex items-center gap-2 mb-2">
          {/* Priority Badge with Dropdown - More obvious styling */}
          <div className="relative z-[200]">
            <div
              ref={priorityRef}
              className={`${getPriorityColor(ticket.priority)} text-xs flex items-center gap-1 cursor-pointer hover:opacity-80 border border-dashed hover:border-solid transition-all px-2 py-1 rounded-full`}
              onClick={(e) => {
                e.stopPropagation();
                onExpandPriority(expandedPriority === ticket.id ? null : ticket.id);
              }}
              onPointerDown={(e) => {
                // Prevent drag when clicking on priority badge
                e.stopPropagation();
              }}
              title="Click to change priority">
              {getPriorityIcon(ticket.priority)}
              {ticket.priority}
              <ArrowUpDown className="h-2 w-2 opacity-60" />
            </div>
            <DropdownPortal
              isOpen={expandedPriority === ticket.id}
              triggerRef={priorityRef}
              position="bottom-left">
              <div className="bg-card border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                {priorityOptions.map((priority) => (
                  <button
                    key={priority.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePriority(ticket, priority.value);
                      onExpandPriority(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 w-full text-left ${
                      ticket.priority === priority.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}>
                    <Badge className={`${priority.color} text-xs`}>{priority.label}</Badge>
                  </button>
                ))}
              </div>
            </DropdownPortal>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* Assignee with Dropdown */}
          <div className="relative z-[200]">
            <div
              ref={assigneeRef}
              className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 border border-dashed border-border hover:border-solid transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onExpandAssignment(expandedAssignment === ticket.id ? null : ticket.id);
              }}
              onPointerDown={(e) => {
                // Prevent drag when clicking on assignee section
                e.stopPropagation();
              }}
              title="Click to assign user">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px] text-xs">
                {assignedUser
                  ? `${assignedUser.first_name} ${assignedUser.last_name}`
                  : 'Unassigned'}
              </span>
              <UserPlus className="h-3 w-3 opacity-50" />
            </div>
            <DropdownPortal
              isOpen={expandedAssignment === ticket.id}
              triggerRef={assigneeRef}
              position="bottom-left">
              <div className="bg-card border border-border rounded-md shadow-lg py-1 min-w-[180px] max-h-40 overflow-y-auto">
                {/* Unassign option */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(ticket, null);
                    onExpandAssignment(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 w-full text-left text-foreground">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span>Unassigned</span>
                </button>

                {/* User options */}
                {usersLoading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssign(ticket, user.id);
                        onExpandAssignment(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 w-full text-left text-foreground ${
                        user.id === ticket.assignee_id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}>
                      <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="truncate">
                        {user.first_name} {user.last_name}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </DropdownPortal>
          </div>

          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TicketBoardProps {
  tickets: Ticket[];
  isLoading: boolean;
}

export function TicketBoard({tickets: serverTickets, isLoading}: TicketBoardProps) {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [selectedTicketForDelete, setSelectedTicketForDelete] = useState<Ticket | null>(null);
  const [selectedTicketForTime, setSelectedTicketForTime] = useState<Ticket | null>(null);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [expandedPriority, setExpandedPriority] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [columnSorts, setColumnSorts] = useState<
    Record<TicketStatus, {option: SortOption; direction: SortDirection}>
  >({
    new: {option: 'created_at', direction: 'desc'},
    in_progress: {option: 'created_at', direction: 'desc'},
    review: {option: 'created_at', direction: 'desc'},
    done: {option: 'created_at', direction: 'desc'},
  });

  // Local optimistic state for smooth dragging experience
  const [optimisticTickets, setOptimisticTickets] = useState<Ticket[]>([]);

  // Sync server tickets to optimistic state
  React.useEffect(() => {
    setOptimisticTickets(serverTickets);
  }, [serverTickets]);

  // Use optimistic tickets for immediate UI updates
  const tickets = optimisticTickets;

  const updateTicketMutation = useUpdateTicket();
  const updateSortOrdersMutation = useUpdateTicketSortOrders();
  const {data: users = [], isLoading: usersLoading} = useAssignableUsers();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag (allows immediate clicks)
      },
    }),
  );

  // Custom collision detection that handles both column moves and within-column sorting
  const customCollisionDetection: CollisionDetection = (args) => {
    console.log(
      '🔍 Collision Detection - Active:',
      args.active?.id,
      'Containers:',
      args.droppableContainers.map((c) => c.id),
    );

    // Get all droppables
    const allCollisions = rectIntersection(args);

    if (allCollisions.length === 0) return [];

    // Separate columns from tickets
    const columnIds = ['new', 'in_progress', 'review', 'done'];
    const columnCollisions = allCollisions.filter((collision) =>
      columnIds.includes(collision.id as string),
    );
    const ticketCollisions = allCollisions.filter(
      (collision) => !columnIds.includes(collision.id as string),
    );

    console.log(
      '🎯 Collisions - Columns:',
      columnCollisions.map((c) => c.id),
      'Tickets:',
      ticketCollisions.map((c) => c.id),
    );

    // If we have ticket collisions, check if it's the same column for reordering
    if (ticketCollisions.length > 0) {
      const activeTicket = tickets.find((t) => t.id === args.active?.id);
      const targetTicket = tickets.find((t) => t.id === ticketCollisions[0]?.id);

      if (activeTicket && targetTicket && activeTicket.status === targetTicket.status) {
        console.log('🔄 Same-column reordering detected');
        return ticketCollisions.slice(0, 1); // Return first ticket collision for reordering
      }
    }

    // For cross-column moves, prioritize columns
    if (columnCollisions.length > 0) {
      console.log('📂 Column move detected:', columnCollisions[0]?.id);
      return columnCollisions.slice(0, 1);
    }

    // Fallback to first available collision
    return allCollisions.slice(0, 1);
  };

  const sortTickets = (tickets: Ticket[], sortOption: SortOption, direction: SortDirection) => {
    return [...tickets].sort((a, b) => {
      // Always check for custom sort_order first when using default sort
      if (sortOption === 'created_at' && direction === 'desc') {
        const aOrder = a.sort_order ?? 0;
        const bOrder = b.sort_order ?? 0;
        if (aOrder !== bOrder) {
          return bOrder - aOrder; // Higher order numbers first
        }
        // Fall back to created_at for items with same sort_order
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      let aValue: any;
      let bValue: any;

      switch (sortOption) {
        case 'priority':
          const priorityOrder = {low: 1, medium: 2, high: 3, critical: 4};
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'assignee':
          // Get user data from the users list for sorting
          const aUser = users.find((u) => u.id === a.assignee_id);
          const bUser = users.find((u) => u.id === b.assignee_id);
          aValue = aUser ? `${aUser.first_name} ${aUser.last_name}` : 'ZZZ'; // Unassigned goes to bottom
          bValue = bUser ? `${bUser.first_name} ${bUser.last_name}` : 'ZZZ';
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          return 0;
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const getTicketsForColumn = (columnId: TicketStatus) => {
    const columnTickets = tickets.filter((ticket) => ticket.status === columnId);
    const sort = columnSorts[columnId] || {
      option: 'created_at',
      direction: 'desc',
    };
    return sortTickets(columnTickets, sort.option, sort.direction);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const {active} = event;
    console.log('🚀 DRAG START - Active:', active.id);
    const ticket = tickets.find((t) => t.id === active.id);
    if (ticket) {
      console.log('🎫 Dragging ticket:', ticket.title, 'Status:', ticket.status);
    }
    setActiveTicket(ticket || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const {over} = event;
    if (over) {
      console.log('🔄 DRAG OVER - Over:', over.id, 'Type:', typeof over.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    console.log('🔄 DRAG END - Active:', active.id, 'Over:', over?.id);
    console.log(
      '🔍 Available column IDs:',
      columns.map((c) => c.id),
    );
    console.log('🔍 Over data:', over?.data);
    setActiveTicket(null);

    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the ticket being dragged
    const activeTicket = tickets.find((t) => t.id === activeId);
    if (!activeTicket) {
      console.log('❌ Active ticket not found');
      return;
    }

    console.log('🎫 Active ticket:', activeTicket.title, 'Status:', activeTicket.status);

    // Check if we're dropping on a column (status change)
    const overColumn = columns.find((col) => col.id === overId);
    if (overColumn) {
      console.log('📂 Dropping on column:', overColumn.title);
      const newStatus = overColumn.id;
      if (activeTicket.status !== newStatus) {
        console.log('🔄 Status change:', activeTicket.status, '->', newStatus);

        // Calculate a high sort_order to place the moved ticket at the top of the new column
        const targetColumnTickets = getTicketsForColumn(newStatus);
        const maxSortOrder = Math.max(...targetColumnTickets.map((t) => t.sort_order || 0), 0);
        const newSortOrder = maxSortOrder + 1000; // Place at top with some margin

        console.log('📊 Moving to top of column with sort_order:', newSortOrder);

        // Immediately update optimistic state for smooth UX
        setOptimisticTickets((prevTickets) => {
          return prevTickets.map((ticket) => {
            if (ticket.id === activeTicket.id) {
              return {...ticket, status: newStatus, sort_order: newSortOrder};
            }
            return ticket;
          });
        });

        updateTicketMutation.mutate(
          {
            id: activeTicket.id,
            data: {status: newStatus, sort_order: newSortOrder},
          },
          {
            onError: () => {
              // Revert optimistic update on error
              setOptimisticTickets(serverTickets);
            },
          },
        );
      }
      return;
    }

    // Check if we're dropping on another ticket (reordering within same column)
    const overTicket = tickets.find((t) => t.id === overId);
    console.log(
      '🎫 Over ticket:',
      overTicket?.title,
      'Same status?',
      overTicket?.status === activeTicket.status,
    );

    if (overTicket && activeTicket.status === overTicket.status) {
      console.log('✅ Reordering within same column');
      const columnTickets = getTicketsForColumn(activeTicket.status);
      const activeIndex = columnTickets.findIndex((t) => t.id === activeId);
      const overIndex = columnTickets.findIndex((t) => t.id === overId);

      console.log('📍 Indices - Active:', activeIndex, 'Over:', overIndex);
      console.log(
        '📋 Current column order:',
        columnTickets.map((t) => t.title),
      );

      if (activeIndex !== overIndex) {
        console.log('🔀 Performing reorder from', activeIndex, 'to', overIndex);

        // Use arrayMove to get the new order
        const newOrder = arrayMove(columnTickets, activeIndex, overIndex);
        console.log(
          '📋 New order:',
          newOrder.map((t) => t.title),
        );

        // Calculate new sort orders for all tickets in the column
        const updates: Array<{id: string; sort_order: number}> = [];

        newOrder.forEach((ticket, index) => {
          // Use simple descending order: highest number = first position
          const newSortOrder = (newOrder.length - index) * 1000;
          updates.push({id: ticket.id, sort_order: newSortOrder});
        });

        console.log('💾 Sort order updates:', updates);

        // Immediately update optimistic state for smooth UX
        setOptimisticTickets((prevTickets) => {
          return prevTickets.map((ticket) => {
            const update = updates.find((u) => u.id === ticket.id);
            if (update) {
              return {...ticket, sort_order: update.sort_order};
            }
            return ticket;
          });
        });

        // Update database in background
        console.log('🚀 Sending database update...');
        updateSortOrdersMutation.mutate(updates, {
          onSuccess: (data) => {
            console.log('✅ Database update successful:', data);
          },
          onError: (error) => {
            console.log('❌ Database update failed:', error);
            // Revert optimistic update on error
            setOptimisticTickets(serverTickets);
          },
        });

        // Reset the column to use default sorting (which will now use the updated sort_order)
        setColumnSorts((prev) => ({
          ...prev,
          [activeTicket.status]: {option: 'created_at', direction: 'desc'},
        }));
      } else {
        console.log('⚠️ Same position, no reorder needed');
      }
    } else {
      console.log('❌ Cannot reorder - different columns or invalid drop target');
    }
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;

    const newColumn: Column = {
      id: newColumnTitle.toLowerCase().replace(/\s+/g, '_') as TicketStatus,
      title: newColumnTitle,
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
    };

    setColumns([...columns, newColumn]);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const handleRemoveColumn = (columnId: TicketStatus) => {
    if (defaultColumns.some((col) => col.id === columnId)) return; // Don't remove default columns
    setColumns(columns.filter((col) => col.id !== columnId));
  };

  const handleAssignTicket = (ticket: Ticket, userId: string | null) => {
    updateTicketMutation.mutate({
      id: ticket.id,
      data: {assignee_id: userId},
    });
  };

  const handleUpdatePriority = (ticket: Ticket, priority: string) => {
    updateTicketMutation.mutate({
      id: ticket.id,
      data: {priority: priority as any},
    });
  };

  const handleSort = (columnId: TicketStatus, option: SortOption) => {
    setColumnSorts((prev) => {
      const currentSort = prev[columnId];
      const newDirection =
        currentSort?.option === option && currentSort?.direction === 'asc' ? 'desc' : 'asc';

      return {
        ...prev,
        [columnId]: {option, direction: newDirection},
      };
    });

    // Clear custom sort orders when applying automatic sorting (unless it's the default created_at desc)
    if (
      !(
        option === 'created_at' &&
        ((columnSorts[columnId]?.option === option && columnSorts[columnId]?.direction === 'asc') ||
          !columnSorts[columnId] ||
          columnSorts[columnId]?.option !== option)
      )
    ) {
      // Clear sort_order for this column's tickets in the database and local state
      const columnTickets = tickets.filter((t) => t.status === columnId);
      const updates = columnTickets.map((ticket) => ({
        id: ticket.id,
        sort_order: 0,
      }));

      if (updates.length > 0) {
        // Update local state immediately
        setOptimisticTickets((prevTickets) => {
          return prevTickets.map((ticket) => {
            const shouldUpdate = updates.find((u) => u.id === ticket.id);
            return shouldUpdate ? {...ticket, sort_order: 0} : ticket;
          });
        });

        // Update database
        updateSortOrdersMutation.mutate(updates);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-80">
            <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map((column) => {
            const columnTickets = getTicketsForColumn(column.id);
            const sort = columnSorts[column.id] || {
              option: 'created_at',
              direction: 'desc',
            };
            return (
              <DroppableColumn
                key={column.id}
                column={column}
                onRemoveColumn={handleRemoveColumn}
                ticketCount={columnTickets.length}
                sortOption={sort.option}
                sortDirection={sort.direction}
                onSort={handleSort}>
                <SortableContext
                  items={columnTickets.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}>
                  {columnTickets.map((ticket) => (
                    <SortableTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onDelete={setSelectedTicketForDelete}
                      onTimeTrack={setSelectedTicketForTime}
                      onExpandDropdown={setExpandedDropdown}
                      expandedDropdown={expandedDropdown}
                      onAssign={handleAssignTicket}
                      onExpandAssignment={setExpandedAssignment}
                      expandedAssignment={expandedAssignment}
                      onUpdatePriority={handleUpdatePriority}
                      onExpandPriority={setExpandedPriority}
                      expandedPriority={expandedPriority}
                    />
                  ))}
                </SortableContext>

                {columnTickets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tickets</p>
                  </div>
                )}
              </DroppableColumn>
            );
          })}

          {/* Add Column */}
          <div className="flex-shrink-0 w-80">
            {!isAddingColumn ? (
              <Button
                variant="outline"
                onClick={() => setIsAddingColumn(true)}
                className="w-full h-12 border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-border">
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="p-4">
                  <Input
                    placeholder="Column name"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') setIsAddingColumn(false);
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={handleAddColumn}>
                      Add
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAddingColumn(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTicket ? (
            <div className="rotate-3 transform scale-105 shadow-xl opacity-95 transition-all duration-150">
              <SortableTicketCard
                ticket={activeTicket}
                onDelete={() => {}}
                onTimeTrack={() => {}}
                onExpandDropdown={() => {}}
                expandedDropdown={null}
                onAssign={() => {}}
                onExpandAssignment={() => {}}
                expandedAssignment={null}
                onUpdatePriority={() => {}}
                onExpandPriority={() => {}}
                expandedPriority={null}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <DeleteTicketModal
        isOpen={!!selectedTicketForDelete}
        onClose={() => setSelectedTicketForDelete(null)}
        ticket={selectedTicketForDelete}
        onSuccess={() => setSelectedTicketForDelete(null)}
      />

      <TimeTrackingModal
        isOpen={!!selectedTicketForTime}
        onClose={() => setSelectedTicketForTime(null)}
        ticket={selectedTicketForTime}
      />
    </>
  );
}
