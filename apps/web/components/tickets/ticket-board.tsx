'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Ticket, TicketStatus } from '@/lib/db/schema';
import { DeleteTicketModal } from '@/components/modals/delete-ticket-modal';
import { TimeTrackingModal } from '@/components/modals/time-tracking-modal';
import { useUpdateTicket } from '@/lib/hooks/useTickets';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
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
  GripVertical
} from 'lucide-react';
import Link from 'next/link';

interface Column {
  id: TicketStatus;
  title: string;
  color: string;
}

const defaultColumns: Column[] = [
  { id: 'new', title: 'To Do', color: 'bg-gray-50 border-gray-200' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50 border-blue-200' },
  { id: 'review', title: 'Review', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'done', title: 'Done', color: 'bg-green-50 border-green-200' },
];

interface DraggableTicketCardProps {
  ticket: Ticket;
  onDelete: (ticket: Ticket) => void;
  onTimeTrack: (ticket: Ticket) => void;
  onExpandDropdown: (ticketId: string | null) => void;
  expandedDropdown: string | null;
}

interface DroppableColumnProps {
  column: Column;
  children: React.ReactNode;
  onRemoveColumn: (columnId: TicketStatus) => void;
  ticketCount: number;
}

function DroppableColumn({ column, children, onRemoveColumn, ticketCount }: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-80">
      <Card className={`h-fit ${column.color} border-2 ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {column.title}
              <Badge variant="secondary" className="ml-2 text-xs">
                {ticketCount}
              </Badge>
            </CardTitle>
            {!defaultColumns.some(col => col.id === column.id) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveColumn(column.id)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[200px]">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

function DraggableTicketCard({ ticket, onDelete, onTimeTrack, onExpandDropdown, expandedDropdown }: DraggableTicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: ticket.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border border-gray-200"
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="text-gray-400 mt-1 flex-shrink-0">
              <GripVertical className="h-4 w-4" />
            </div>
            <Link
              href={`/projects/${ticket.project_id}/tickets/${ticket.id}`}
              className="flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {ticket.title}
              </h4>
            </Link>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onExpandDropdown(expandedDropdown === ticket.id ? null : ticket.id);
              }}
              className="h-6 w-6 p-0 text-gray-400"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {expandedDropdown === ticket.id && (
              <div className="absolute right-0 top-7 bg-white border rounded-md shadow-lg z-10 py-1 min-w-[150px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimeTrack(ticket);
                    onExpandDropdown(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                >
                  <Clock className="h-4 w-4" />
                  Time Tracking
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ticket);
                    onExpandDropdown(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        
        {ticket.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {ticket.description}
          </p>
        )}
        
        <div className="flex items-center gap-1 mb-2">
          <Badge className={`${getPriorityColor(ticket.priority)} text-xs flex items-center gap-1`}>
            {getPriorityIcon(ticket.priority)}
            {ticket.priority}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">
              {(ticket as any).assignee?.first_name || 'Unassigned'}
            </span>
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

export function TicketBoard({ tickets, isLoading }: TicketBoardProps) {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [selectedTicketForDelete, setSelectedTicketForDelete] = useState<Ticket | null>(null);
  const [selectedTicketForTime, setSelectedTicketForTime] = useState<Ticket | null>(null);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const updateTicketMutation = useUpdateTicket();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getTicketsForColumn = (columnId: TicketStatus) => {
    return tickets.filter(ticket => ticket.status === columnId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find(t => t.id === active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Just for visual feedback during drag, don't update data here
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the ticket being dragged
    const activeTicket = tickets.find(t => t.id === activeId);
    if (!activeTicket) return;

    // Determine the new column - check if dropping directly on a column
    const overColumn = columns.find(col => col.id === overId);
    if (!overColumn) return; // Only allow dropping on columns, not other tickets

    const newStatus = overColumn.id;

    // Update ticket status if it changed
    if (activeTicket.status !== newStatus) {
      updateTicketMutation.mutate({
        id: activeTicket.id,
        data: { status: newStatus }
      });
    }
  };

  const handleAddColumn = () => {
    if (!newColumnTitle.trim()) return;
    
    const newColumn: Column = {
      id: newColumnTitle.toLowerCase().replace(/\s+/g, '_') as TicketStatus,
      title: newColumnTitle,
      color: 'bg-purple-50 border-purple-200'
    };
    
    setColumns([...columns, newColumn]);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const handleRemoveColumn = (columnId: TicketStatus) => {
    if (defaultColumns.some(col => col.id === columnId)) return; // Don't remove default columns
    setColumns(columns.filter(col => col.id !== columnId));
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map((column) => {
            const columnTickets = getTicketsForColumn(column.id);
            return (
              <DroppableColumn
                key={column.id}
                column={column}
                onRemoveColumn={handleRemoveColumn}
                ticketCount={columnTickets.length}
              >
                {columnTickets.map((ticket) => (
                  <DraggableTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onDelete={setSelectedTicketForDelete}
                    onTimeTrack={setSelectedTicketForTime}
                    onExpandDropdown={setExpandedDropdown}
                    expandedDropdown={expandedDropdown}
                  />
                ))}
                
                {columnTickets.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
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
              className="w-full h-12 border-dashed border-2 text-gray-400 hover:text-gray-600 hover:border-gray-300"
            >
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