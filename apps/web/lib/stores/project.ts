import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Project } from '@/lib/types/database'

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  isLoading: boolean
  setProjects: (projects: Project[]) => void
  setSelectedProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setIsLoading: (loading: boolean) => void
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      projects: [],
      selectedProject: null,
      isLoading: false,
      setProjects: (projects) => set({ projects }),
      setSelectedProject: (project) => set({ selectedProject: project }),
      addProject: (project) => set({ projects: [...get().projects, project] }),
      updateProject: (id, updates) => 
        set({ 
          projects: get().projects.map(p => 
            p.id === id ? { ...p, ...updates } : p
          )
        }),
      removeProject: (id) => 
        set({ 
          projects: get().projects.filter(p => p.id !== id),
          selectedProject: get().selectedProject?.id === id ? null : get().selectedProject
        }),
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'project-store',
    }
  )
)
